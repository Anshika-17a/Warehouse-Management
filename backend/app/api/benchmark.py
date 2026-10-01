from fastapi import APIRouter, Query, HTTPException
from app.services.benchmark import run_query_explain, benchmark_suite

router = APIRouter(prefix="/api/benchmark", tags=["Explain & Performance Benchmarking"])

@router.get("/explain")
def get_explain_plan(
    scenario: str = Query("compound_indexed_time_cat_status", description="Scenario: compound_indexed_time_cat_status, unindexed_collscan_comparison, country_temporal_aggregation, high_net_amount_sort")
):
    """
    Executes MongoDB's explain("executionStats") for a specific query scenario.
    Returns:
      - Execution stage (IXSCAN vs COLLSCAN)
      - Total docs examined vs returned
      - Execution time in ms
      - Sharding and indexing recommendations
    """
    try:
        return run_query_explain(scenario=scenario)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explain execution error: {str(e)}")

@router.get("/suite")
def get_benchmark_suite():
    """
    Runs a side-by-side benchmark comparing multiple queries and showing
    the 100x-1000x latency and document examination difference between
    properly indexed compound ESR pipelines and unindexed scans.
    """
    try:
        return benchmark_suite()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Benchmark suite error: {str(e)}")
