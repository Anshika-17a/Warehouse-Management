import time
from typing import Dict, Any, List
from datetime import datetime, timedelta
from app.database import get_sync_collection

def run_query_explain(scenario: str) -> Dict[str, Any]:
    """
    Executes MongoDB's .explain("executionStats") for benchmark and query optimization analysis.
    Compares optimal compound index usage against unindexed queries.
    """
    col = get_sync_collection()
    one_month_ago = datetime.utcnow() - timedelta(days=30)

    if scenario == "compound_indexed_time_cat_status":
        query = {
            "timestamp": {"$gte": one_month_ago},
            "product.category": "Electronics",
            "fulfillment.status": "delivered"
        }
        sort_criteria = [("timestamp", -1)]
        hint_index = "idx_time_cat_status"
        description = "Compound Index Query (timestamp >= 30d, category='Electronics', status='delivered')"

    elif scenario == "unindexed_collscan_comparison":
        # Querying an unindexed nested field (e.g. metadata.notes or random unindexed attribute)
        query = {
            "metadata.custom_unindexed_tag": "vip_promo",
            "metrics.gross_amount": {"$gt": 150.0}
        }
        sort_criteria = [("metrics.gross_amount", -1)]
        hint_index = None
        description = "Full Collection Scan Comparison (Unindexed metadata tag forces COLLSCAN)"

    elif scenario == "country_temporal_aggregation":
        query = {
            "customer.country": "USA",
            "timestamp": {"$gte": one_month_ago}
        }
        sort_criteria = [("timestamp", -1)]
        hint_index = "idx_country_time"
        description = "Regional Drilldown (customer.country='USA' ordered by timestamp DESC)"

    elif scenario == "high_net_amount_sort":
        query = {
            "metrics.net_amount": {"$gte": 500.0}
        }
        sort_criteria = [("metrics.net_amount", -1)]
        hint_index = "idx_net_amount_time"
        description = "High-Value Transaction Threshold (metrics.net_amount >= 500 sorted DESC)"

    else:
        query = {"product.category": "Electronics"}
        sort_criteria = [("timestamp", -1)]
        hint_index = None
        description = "Default Category Filter"

    find_cmd: Dict[str, Any] = {
        "find": col.name,
        "filter": query,
        "sort": dict(sort_criteria),
        "limit": 100
    }
    if hint_index:
        find_cmd["hint"] = hint_index

    # Run explain command with full execution statistics verbosity
    from app.database import get_sync_db
    explain_data = get_sync_db().command({
        "explain": find_cmd,
        "verbosity": "executionStats"
    })

    execution_stats = explain_data.get("executionStats", {})
    query_planner = explain_data.get("queryPlanner", {})
    winning_plan = query_planner.get("winningPlan", {})

    # Extract execution stage
    stage = winning_plan.get("stage", "UNKNOWN")
    input_stage = winning_plan.get("inputStage", {})
    effective_stage = input_stage.get("stage", stage)

    index_name = input_stage.get("indexName") or winning_plan.get("indexName")
    total_docs_examined = execution_stats.get("totalDocsExamined", 0)
    n_returned = execution_stats.get("nReturned", 0)
    exec_time_ms = execution_stats.get("executionTimeMillis", 0.0)

    # Ratio of examined to returned (1.0 is ideal index coverage)
    efficiency_ratio = round(total_docs_examined / max(n_returned, 1), 2)

    return {
        "scenario": scenario,
        "query_description": description,
        "query_filter": str(query),
        "execution_stage": effective_stage,
        "index_used": index_name or "None (Table Scan)",
        "total_docs_examined": total_docs_examined,
        "n_returned": n_returned,
        "efficiency_ratio": efficiency_ratio,
        "execution_time_ms": exec_time_ms,
        "is_optimal_index": effective_stage in ["IXSCAN", "PROJECTION_COVERED", "FETCH"],
        "sharding_recommendation": {
            "is_sharding_needed": total_docs_examined > 5000000,
            "recommended_shard_key": "{ customer.country: 1, timestamp: 1 } or hashed { transaction_id: 'hashed' }",
            "rationale": "Ranged sharding on (country, timestamp) provides data locality for regional queries, while hashed sharding on transaction_id prevents monotonic write bottlenecks at high ingestion velocities."
        },
        "raw_stats": {
            "serverInfo": explain_data.get("serverInfo", {}),
            "totalKeysExamined": execution_stats.get("totalKeysExamined", 0)
        }
    }

def benchmark_suite() -> List[Dict[str, Any]]:
    """Runs a comprehensive suite of explain benchmarks across different query patterns."""
    scenarios = [
        "compound_indexed_time_cat_status",
        "country_temporal_aggregation",
        "high_net_amount_sort",
        "unindexed_collscan_comparison"
    ]
    return [run_query_explain(s) for s in scenarios]
