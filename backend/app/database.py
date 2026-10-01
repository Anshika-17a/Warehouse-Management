import logging
from pymongo import MongoClient, ASCENDING, DESCENDING, IndexModel
import motor.motor_asyncio
from app.config import settings

logger = logging.getLogger("platform.database")

# Sync PyMongo Client (Optimized for Bulk Ingestion batches, Pandas cursor reading, and Explain benchmarks)
_sync_client: MongoClient | None = None

# Async Motor Client (Optimized for non-blocking FastAPI queries)
_async_client: motor.motor_asyncio.AsyncIOMotorClient | None = None

def get_sync_client() -> MongoClient:
    global _sync_client
    if _sync_client is None:
        _sync_client = MongoClient(
            settings.MONGODB_URL,
            maxPoolSize=100,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=30000,
            retryWrites=True
        )
    return _sync_client

def get_sync_db():
    return get_sync_client()[settings.DATABASE_NAME]

def get_sync_collection():
    return get_sync_db()[settings.COLLECTION_NAME]

def get_async_client() -> motor.motor_asyncio.AsyncIOMotorClient:
    global _async_client
    if _async_client is None:
        _async_client = motor.motor_asyncio.AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=100,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000
        )
    return _async_client

def get_async_db():
    return get_async_client()[settings.DATABASE_NAME]

def get_async_collection():
    return get_async_db()[settings.COLLECTION_NAME]

def init_indexes():
    """
    Initializes high-performance compound, unique, and TTL indexes.
    
    SCHEMA & INDEXING STRATEGY RATIONALE:
    -------------------------------------------------------------------------
    1. Unique Key: `transaction_id` (1)
       - Ensures idempotent ingestion. Bulk upsert (`UpdateOne` with `upsert=True`)
         or duplicate suppression relies on this index to achieve O(1) lookups.
    
    2. Compound Time-Series / Slicing Index: `timestamp` (-1), `product.category` (1), `fulfillment.status` (1)
       - The Equality, Sort, Range (ESR) rule is prioritized. Queries filtering by
         category/status and ordering by recency can be satisfied directly via IXSCAN
         without in-memory sort stages (avoiding MongoDB's 100MB sort buffer spill).
    
    3. Regional Analytics Index: `customer.country` (1), `timestamp` (-1)
       - Powers geographical aggregation pipelines and localized revenue queries.
    
    4. Numerical Range / Percentile Index: `metrics.net_amount` (-1), `timestamp` (-1)
       - Accelerates top-N high-value orders and percentile boundary computations ($bucketAuto / $match).
    
    5. Warehouse Fulfillment Index: `fulfillment.warehouse_id` (1), `fulfillment.delayed` (1)
       - Powers logistics bottleneck analysis and outlier identification.

    6. Natural Expiry TTL Index (Optional / Toggleable):
       - If ENABLE_TTL_INDEX is set, MongoDB background TTL thread automatically purges
         telemetry older than `TTL_DAYS`.
    -------------------------------------------------------------------------
    """
    try:
        col = get_sync_collection()
        indexes = [
            IndexModel([("transaction_id", ASCENDING)], unique=True, name="idx_transaction_id_unique"),
            IndexModel([("timestamp", DESCENDING), ("product.category", ASCENDING), ("fulfillment.status", ASCENDING)], name="idx_time_cat_status"),
            IndexModel([("customer.country", ASCENDING), ("timestamp", DESCENDING)], name="idx_country_time"),
            IndexModel([("metrics.net_amount", DESCENDING), ("timestamp", DESCENDING)], name="idx_net_amount_time"),
            IndexModel([("fulfillment.warehouse_id", ASCENDING), ("fulfillment.delayed", ASCENDING)], name="idx_warehouse_delayed"),
            IndexModel([("product.sku", ASCENDING)], name="idx_product_sku")
        ]

        if settings.ENABLE_TTL_INDEX:
            expire_after_seconds = settings.TTL_DAYS * 86400
            indexes.append(
                IndexModel(
                    [("timestamp", ASCENDING)],
                    expireAfterSeconds=expire_after_seconds,
                    name="idx_timestamp_ttl"
                )
            )

        created = col.create_indexes(indexes)
        logger.info(f"Database indexes successfully ensured: {created}")
        return created
    except Exception as e:
        logger.error(f"Error ensuring MongoDB indexes: {e}")
        raise e
