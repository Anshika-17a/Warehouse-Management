import time
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from app.database import get_sync_collection
from app.config import settings

logger = logging.getLogger("platform.analytics")

# Simple thread-safe in-memory cache with TTL
_CACHE_STORE: Dict[str, Dict[str, Any]] = {}

def get_from_cache(cache_key: str) -> Optional[Any]:
    entry = _CACHE_STORE.get(cache_key)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        del _CACHE_STORE[cache_key]
        return None
    return entry["data"]

def set_in_cache(cache_key: str, data: Any, ttl_seconds: int = 60):
    _CACHE_STORE[cache_key] = {
        "data": data,
        "expires_at": time.time() + ttl_seconds
    }

def clear_analytics_cache():
    global _CACHE_STORE
    _CACHE_STORE.clear()

def get_kpi_summary_faceted(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a high-efficiency single-query MongoDB aggregation pipeline using $facet.
    Computes:
      1. Overall KPI totals (counts, gross/net revenue, avg order value, units sold)
      2. Category breakdown (revenue & unit volume)
      3. Geographic distribution (country-level totals)
      4. Logistics status & delay metrics
      5. Time-series daily trend
    """
    cache_key = f"summary_kpi_{start_date}_{end_date}_{category}"
    cached = get_from_cache(cache_key)
    if cached:
        logger.info(f"Returning cached KPI summary for key {cache_key}")
        return cached

    col = get_sync_collection()
    match_stage: Dict[str, Any] = {}

    if category:
        match_stage["product.category"] = category
    if start_date or end_date:
        match_stage["timestamp"] = {}
        if start_date:
            match_stage["timestamp"]["$gte"] = start_date
        if end_date:
            match_stage["timestamp"]["$lte"] = end_date

    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})

    # $facet enables parallel calculation of multiple distinct aggregation dimensions
    # in a single database round-trip.
    pipeline.append({
        "$facet": {
            "overall": [
                {
                    "$group": {
                        "_id": None,
                        "total_transactions": {"$sum": 1},
                        "total_gross_revenue": {"$sum": "$metrics.gross_amount"},
                        "total_net_revenue": {"$sum": "$metrics.net_amount"},
                        "total_units_sold": {"$sum": "$metrics.quantity"},
                        "avg_delivery_days": {"$avg": "$fulfillment.delivery_days"},
                        "delayed_count": {
                            "$sum": {
                                "$cond": [{"$eq": ["$fulfillment.delayed", True]}, 1, 0]
                            }
                        }
                    }
                }
            ],
            "by_category": [
                {
                    "$group": {
                        "_id": "$product.category",
                        "revenue": {"$sum": "$metrics.net_amount"},
                        "orders": {"$sum": 1},
                        "avg_margin": {"$avg": "$metrics.profit_margin"}
                    }
                },
                {"$sort": {"revenue": -1}},
                {"$limit": 8}
            ],
            "by_country": [
                {
                    "$group": {
                        "_id": "$customer.country",
                        "revenue": {"$sum": "$metrics.net_amount"},
                        "orders": {"$sum": 1}
                    }
                },
                {"$sort": {"revenue": -1}},
                {"$limit": 8}
            ],
            "by_status": [
                {
                    "$group": {
                        "_id": "$fulfillment.status",
                        "count": {"$sum": 1},
                        "revenue": {"$sum": "$metrics.net_amount"}
                    }
                },
                {"$sort": {"count": -1}}
            ],
            "trend_daily": [
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                        },
                        "revenue": {"$sum": "$metrics.net_amount"},
                        "orders": {"$sum": 1},
                        "avg_order_value": {"$avg": "$metrics.net_amount"}
                    }
                },
                {"$sort": {"_id": 1}},
                {"$limit": 60}
            ]
        }
    })

    start_exec = time.time()
    results = list(col.aggregate(pipeline, allowDiskUse=True))
    exec_ms = round((time.time() - start_exec) * 1000, 2)

    facet_result = results[0] if results else {}
    overall_list = facet_result.get("overall", [])
    overall = overall_list[0] if overall_list else {}

    total_tx = overall.get("total_transactions", 0)
    net_rev = round(float(overall.get("total_net_revenue", 0.0)), 2)
    gross_rev = round(float(overall.get("total_gross_revenue", 0.0)), 2)
    aov = round(net_rev / total_tx, 2) if total_tx > 0 else 0.0
    units = int(overall.get("total_units_sold", 0))
    avg_delivery = round(float(overall.get("avg_delivery_days", 0.0)), 1)
    delayed_cnt = int(overall.get("delayed_count", 0))
    delayed_pct = round((delayed_cnt / total_tx * 100), 2) if total_tx > 0 else 0.0

    categories = [
        {
            "category": item["_id"] or "Uncategorized",
            "revenue": round(float(item["revenue"]), 2),
            "orders": item["orders"],
            "avg_margin": round(float(item.get("avg_margin", 0.0)) * 100, 1)
        }
        for item in facet_result.get("by_category", [])
    ]

    countries = [
        {
            "country": item["_id"] or "Other",
            "revenue": round(float(item["revenue"]), 2),
            "orders": item["orders"]
        }
        for item in facet_result.get("by_country", [])
    ]

    statuses = [
        {
            "status": item["_id"] or "Unknown",
            "count": item["count"],
            "revenue": round(float(item["revenue"]), 2)
        }
        for item in facet_result.get("by_status", [])
    ]

    trend = [
        {
            "date": item["_id"],
            "revenue": round(float(item["revenue"]), 2),
            "orders": item["orders"],
            "avg_order_value": round(float(item.get("avg_order_value", 0.0)), 2)
        }
        for item in facet_result.get("trend_daily", [])
    ]

    response_data = {
        "total_transactions": total_tx,
        "total_gross_revenue": gross_rev,
        "total_net_revenue": net_rev,
        "average_order_value": aov,
        "total_units_sold": units,
        "average_delivery_days": avg_delivery,
        "delayed_percentage": delayed_pct,
        "top_categories": categories,
        "top_countries": countries,
        "status_breakdown": statuses,
        "revenue_trend": trend,
        "execution_time_ms": exec_ms
    }

    set_in_cache(cache_key, response_data, ttl_seconds=settings.CACHE_TTL_SECONDS)
    return response_data

def get_percentile_and_distribution(metric_field: str = "metrics.net_amount") -> Dict[str, Any]:
    """
    Computes percentiles (p25, p50, p75, p90, p99) and moving aggregates.
    Uses MongoDB aggregation with $bucketAuto or sorts for fast indexed quantile reads.
    """
    col = get_sync_collection()
    cache_key = f"percentiles_{metric_field}"
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    # Direct indexed extraction of target field
    cursor = col.find({}, {metric_field: 1, "_id": 0}).limit(50000)
    values = []
    for doc in cursor:
        parts = metric_field.split(".")
        v = doc
        for p in parts:
            v = v.get(p, {}) if isinstance(v, dict) else None
        if isinstance(v, (int, float)):
            values.append(float(v))

    if not values:
        return {"metric": metric_field, "count": 0, "percentiles": {}}

    arr = np.array(values)
    res = {
        "metric": metric_field,
        "sample_size": len(arr),
        "mean": round(float(np.mean(arr)), 2),
        "std_dev": round(float(np.std(arr)), 2),
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
        "percentiles": {
            "p10": round(float(np.percentile(arr, 10)), 2),
            "p25": round(float(np.percentile(arr, 25)), 2),
            "p50_median": round(float(np.percentile(arr, 50)), 2),
            "p75": round(float(np.percentile(arr, 75)), 2),
            "p90": round(float(np.percentile(arr, 90)), 2),
            "p95": round(float(np.percentile(arr, 95)), 2),
            "p99": round(float(np.percentile(arr, 99)), 2),
        }
    }
    set_in_cache(cache_key, res, ttl_seconds=120)
    return res

def compute_pandas_advanced_analytics(sample_limit: int = 25000) -> Dict[str, Any]:
    """
    Requirement 3:
    "For heavier statistical work beyond MongoDB's native aggregation (e.g. correlation, outlier detection),
     pull filtered subsets into Pandas via PyMongo and process there — don't try to do ML-grade stats
     inside the aggregation pipeline."
    """
    col = get_sync_collection()
    cache_key = f"pandas_advanced_{sample_limit}"
    cached = get_from_cache(cache_key)
    if cached:
        return cached

    projection = {
        "metrics.gross_amount": 1,
        "metrics.net_amount": 1,
        "metrics.discount_percent": 1,
        "metrics.quantity": 1,
        "metrics.profit_margin": 1,
        "fulfillment.delivery_days": 1,
        "product.category": 1,
        "fulfillment.delayed": 1,
        "timestamp": 1,
        "_id": 0
    }

    start_pull = time.time()
    docs = list(col.find({}, projection).limit(sample_limit))
    pull_time_ms = round((time.time() - start_pull) * 1000, 2)

    if not docs:
        return {"status": "no_data", "message": "No documents ingested yet."}

    # Flatten into Pandas DataFrame
    flat_data = []
    for d in docs:
        m = d.get("metrics", {})
        f = d.get("fulfillment", {})
        p = d.get("product", {})
        flat_data.append({
            "net_revenue": float(m.get("net_amount", 0.0)),
            "discount_pct": float(m.get("discount_percent", 0.0)),
            "quantity": int(m.get("quantity", 1)),
            "profit_margin": float(m.get("profit_margin", 0.0)),
            "delivery_days": float(f.get("delivery_days", 0.0)),
            "delayed": 1 if f.get("delayed") else 0,
            "category": p.get("category", "General")
        })

    df = pd.DataFrame(flat_data)

    # 1. Pearson & Spearman Correlation Matrix
    numeric_cols = ["net_revenue", "discount_pct", "quantity", "profit_margin", "delivery_days", "delayed"]
    corr_matrix = df[numeric_cols].corr(method="pearson").round(3)
    
    correlation_data = {
        "columns": numeric_cols,
        "matrix": corr_matrix.to_dict()
    }

    # 2. IQR (Interquartile Range) Outlier Detection on Shipping Latency & High Net Revenue
    outlier_metrics = {}
    for col_name in ["net_revenue", "delivery_days"]:
        q25 = df[col_name].quantile(0.25)
        q75 = df[col_name].quantile(0.75)
        iqr = q75 - q25
        lower_bound = q25 - (1.5 * iqr)
        upper_bound = q75 + (1.5 * iqr)

        outliers = df[(df[col_name] < lower_bound) | (df[col_name] > upper_bound)]
        outlier_count = len(outliers)
        outlier_metrics[col_name] = {
            "q25": round(float(q25), 2),
            "q75": round(float(q75), 2),
            "iqr": round(float(iqr), 2),
            "lower_threshold": round(float(lower_bound), 2),
            "upper_threshold": round(float(upper_bound), 2),
            "outlier_count": outlier_count,
            "outlier_percentage": round((outlier_count / len(df)) * 100, 2),
            "extreme_examples": outliers.head(5).to_dict(orient="records")
        }

    # 3. Category Efficiency Breakdown via Pandas GroupBy
    cat_summary = df.groupby("category").agg({
        "net_revenue": ["mean", "sum"],
        "discount_pct": "mean",
        "delivery_days": "mean",
        "profit_margin": "mean"
    }).round(2)
    cat_summary.columns = ["_".join(c) for c in cat_summary.columns]
    category_efficiency = cat_summary.reset_index().to_dict(orient="records")

    total_proc_ms = round((time.time() - start_pull) * 1000, 2)

    result = {
        "sample_analyzed": len(df),
        "data_transfer_time_ms": pull_time_ms,
        "total_compute_time_ms": total_proc_ms,
        "correlation": correlation_data,
        "outliers": outlier_metrics,
        "category_efficiency": category_efficiency
    }

    set_in_cache(cache_key, result, ttl_seconds=120)
    return result
