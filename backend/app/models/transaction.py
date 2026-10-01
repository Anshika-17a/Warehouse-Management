from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any

class CustomerSubdoc(BaseModel):
    customer_id: str = Field(..., description="Unique customer identifier")
    segment: str = Field("Consumer", description="Consumer, Corporate, Enterprise, Small Business")
    country: str = Field("USA", description="ISO country or full name")
    loyalty_tier: str = Field("Bronze", description="Bronze, Silver, Gold, Platinum")

class ProductSubdoc(BaseModel):
    sku: str = Field(..., description="Stock Keeping Unit")
    category: str = Field(..., description="Electronics, Apparel, Home & Kitchen, Industrial, Automotive")
    subcategory: Optional[str] = Field(None, description="Granular product grouping")
    unit_price: float = Field(..., ge=0.0, description="Base selling price per unit")

class MetricsSubdoc(BaseModel):
    quantity: int = Field(..., ge=1, description="Quantity ordered")
    gross_amount: float = Field(..., ge=0.0, description="Gross revenue before discount")
    discount_percent: float = Field(0.0, ge=0.0, le=100.0, description="Promotional discount %")
    net_amount: float = Field(..., ge=0.0, description="Net revenue after discount")
    tax_amount: float = Field(0.0, ge=0.0, description="Estimated tax")
    shipping_fee: float = Field(0.0, ge=0.0, description="Logistics fee charged")
    profit_margin: float = Field(0.0, description="Operating profit margin ratio")

class FulfillmentSubdoc(BaseModel):
    warehouse_id: str = Field(..., description="Origin fulfillment center")
    shipping_carrier: str = Field("FedEx", description="Carrier name (FedEx, UPS, DHL, Amazon Logistics)")
    delivery_days: float = Field(..., ge=0.0, description="Transit duration in days")
    status: str = Field("delivered", description="delivered, in_transit, pending, returned, cancelled")
    delayed: bool = Field(False, description="Flag indicating logistics anomaly / delay")

class TransactionDocument(BaseModel):
    """
    Core document model representing an atomic transaction in MongoDB.
    Uses embedded document pattern for 0-join analytical aggregation speed.
    """
    transaction_id: str = Field(..., description="Unique immutable transaction reference")
    order_id: str = Field(..., description="Parent order reference")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event occurrence timestamp")
    customer: CustomerSubdoc
    product: ProductSubdoc
    metrics: MetricsSubdoc
    fulfillment: FulfillmentSubdoc
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Ingestion telemetry, batch ID, version")

    @field_validator("timestamp", mode="before")
    @classmethod
    def parse_timestamp(cls, v):
        if isinstance(v, str):
            try:
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except Exception:
                return datetime.utcnow()
        return v

class IngestStats(BaseModel):
    batch_id: str
    status: str
    rows_received: int
    rows_inserted: int
    rows_rejected: int
    duration_seconds: float
    throughput_rows_per_sec: float
    errors_sample: List[str] = []

class QueryFilters(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(25, ge=1, le=500)
    category: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    sort_by: str = Field("timestamp")
    sort_order: int = Field(-1, description="-1 for DESC, 1 for ASC")

class PaginatedResult(BaseModel):
    items: List[Dict[str, Any]]
    total_count: int
    page: int
    limit: int
    total_pages: int
    query_execution_time_ms: float

class KPIOverview(BaseModel):
    total_transactions: int
    total_gross_revenue: float
    total_net_revenue: float
    average_order_value: float
    total_units_sold: int
    average_delivery_days: float
    delayed_percentage: float
    top_categories: List[Dict[str, Any]]
    top_countries: List[Dict[str, Any]]
    status_breakdown: List[Dict[str, Any]]
    revenue_trend: List[Dict[str, Any]]

class ExplainBenchmarkResult(BaseModel):
    query_description: str
    index_used: Optional[str]
    execution_stage: str
    total_docs_examined: int
    n_returned: int
    execution_time_ms: float
    is_optimal_index: bool
    index_bounds: Optional[Dict[str, Any]]
    raw_stats_summary: Dict[str, Any]
