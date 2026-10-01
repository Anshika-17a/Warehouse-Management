import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database import get_sync_collection
from app.models.transaction import QueryFilters, PaginatedResult

def build_mongo_filter(filters: QueryFilters) -> Dict[str, Any]:
    query: Dict[str, Any] = {}

    if filters.category:
        query["product.category"] = filters.category
    if filters.country:
        query["customer.country"] = filters.country
    if filters.status:
        query["fulfillment.status"] = filters.status

    if filters.min_amount is not None or filters.max_amount is not None:
        amt_filter = {}
        if filters.min_amount is not None:
            amt_filter["$gte"] = filters.min_amount
        if filters.max_amount is not None:
            amt_filter["$lte"] = filters.max_amount
        query["metrics.net_amount"] = amt_filter

    if filters.start_date or filters.end_date:
        time_filter = {}
        if filters.start_date:
            time_filter["$gte"] = filters.start_date
        if filters.end_date:
            time_filter["$lte"] = filters.end_date
        query["timestamp"] = time_filter

    if filters.search:
        # Match transaction_id, order_id, or product sku
        query["$or"] = [
            {"transaction_id": {"$regex": filters.search, "$options": "i"}},
            {"order_id": {"$regex": filters.search, "$options": "i"}},
            {"product.sku": {"$regex": filters.search, "$options": "i"}},
            {"customer.customer_id": {"$regex": filters.search, "$options": "i"}}
        ]

    return query

def execute_paginated_query(filters: QueryFilters) -> PaginatedResult:
    col = get_sync_collection()
    mongo_filter = build_mongo_filter(filters)

    start_time = time.time()
    
    # Use estimated count if collection is huge and no filter, else count_documents
    if not mongo_filter:
        total_count = col.estimated_document_count()
    else:
        total_count = col.count_documents(mongo_filter)

    skip = (filters.page - 1) * filters.limit
    sort_dir = 1 if filters.sort_order > 0 else -1

    # Map sort fields to nested keys if needed
    sort_field = filters.sort_by
    if sort_field == "net_amount":
        sort_field = "metrics.net_amount"
    elif sort_field == "category":
        sort_field = "product.category"

    cursor = (
        col.find(mongo_filter, {"_id": 0})
        .sort(sort_field, sort_dir)
        .skip(skip)
        .limit(filters.limit)
    )

    items = list(cursor)
    exec_ms = round((time.time() - start_time) * 1000, 2)
    total_pages = (total_count + filters.limit - 1) // filters.limit if total_count > 0 else 1

    return PaginatedResult(
        items=items,
        total_count=total_count,
        page=filters.page,
        limit=filters.limit,
        total_pages=total_pages,
        query_execution_time_ms=exec_ms
    )
