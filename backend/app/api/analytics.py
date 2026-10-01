from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional, Dict, Any
from datetime import datetime
from app.services.analytics import (
    get_kpi_summary_faceted,
    get_percentile_and_distribution,
    compute_pandas_advanced_analytics
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Aggregations"])

@router.get("/summary")
def get_analytics_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category: Optional[str] = None
):
    """
    Returns precomputed faceted KPIs:
    - Total Gross & Net Revenue, Order Volume, AOV
    - Category Revenue & Margins Breakdown
    - Geographic / Country Distribution
    - Fulfillment Status & Delay Ratios
    - Time-series daily revenue trend
    """
    try:
        return get_kpi_summary_faceted(
            start_date=start_date,
            end_date=end_date,
            category=category
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation error: {str(e)}")

@router.get("/advanced/statistical")
def get_advanced_statistics(
    sample_limit: int = Query(25000, ge=1000, le=100000)
):
    """
    Pandas Heavy Transformation:
    - Multi-variate Pearson correlation matrix
    - IQR Outlier Detection (Tukey's fences) on net revenue and shipping delays
    - Category efficiency aggregates
    """
    try:
        return compute_pandas_advanced_analytics(sample_limit=sample_limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Statistical processing error: {str(e)}")

@router.get("/{metric}")
def get_metric_breakdown(
    metric: str = Path(..., description="Target metric: 'percentiles', 'categories', 'countries', etc."),
    field: Optional[str] = Query("metrics.net_amount")
):
    """
    Parameterized analytical endpoint for specific drilldowns.
    """
    try:
        if metric == "percentiles":
            return get_percentile_and_distribution(metric_field=field)
        else:
            # Fallback to summary slice
            summary = get_kpi_summary_faceted()
            if metric in summary:
                return {metric: summary[metric]}
            return {"metric": metric, "data": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metric retrieval error: {str(e)}")
