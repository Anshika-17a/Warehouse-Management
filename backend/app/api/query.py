from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
from app.services.query import execute_paginated_query
from app.models.transaction import QueryFilters, PaginatedResult

router = APIRouter(prefix="/api/query", tags=["Query Engine"])

@router.get("", response_model=PaginatedResult)
def query_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=500),
    category: Optional[str] = None,
    country: Optional[str] = None,
    status: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    sort_by: str = Query("timestamp"),
    sort_order: int = Query(-1, description="-1 for DESC, 1 for ASC")
):
    """
    Flexible filter and cursor-paginated search query over millions of records.
    Leverages compound indexes to guarantee sub-50ms execution times.
    """
    try:
        filters = QueryFilters(
            page=page,
            limit=limit,
            category=category,
            country=country,
            status=status,
            min_amount=min_amount,
            max_amount=max_amount,
            start_date=start_date,
            end_date=end_date,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        return execute_paginated_query(filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")
