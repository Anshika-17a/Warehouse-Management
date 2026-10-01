import time
import uuid
import logging
import io
import json
import pandas as pd
from datetime import datetime
from typing import Generator, List, Dict, Any, Tuple
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError, DuplicateKeyError

from app.database import get_sync_collection
from app.models.transaction import TransactionDocument, IngestStats
from app.config import settings

logger = logging.getLogger("platform.ingestion")

def coerce_record_to_schema(raw: Dict[str, Any], batch_id: str) -> Dict[str, Any]:
    """
    Validates, coerces, and normalizes raw dictionary keys into the canonical TransactionDocument schema.
    Supports flat CSV/Parquet records as well as nested JSON documents.
    """
    # 1. Transaction & Order ID
    tx_id = str(raw.get("transaction_id") or raw.get("id") or str(uuid.uuid4()))
    order_id = str(raw.get("order_id") or f"ORD-{tx_id[:8].upper()}")

    # 2. Timestamp coercion
    raw_time = raw.get("timestamp") or raw.get("date") or raw.get("created_at")
    if isinstance(raw_time, (pd.Timestamp, datetime)):
        dt_val = raw_time.to_pydatetime() if isinstance(raw_time, pd.Timestamp) else raw_time
    elif isinstance(raw_time, str):
        try:
            dt_val = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
        except Exception:
            dt_val = datetime.utcnow()
    else:
        dt_val = datetime.utcnow()

    # 3. Customer Info (handle flat or nested)
    cust_raw = raw.get("customer") if isinstance(raw.get("customer"), dict) else {}
    customer = {
        "customer_id": str(cust_raw.get("customer_id") or raw.get("customer_id") or f"CUST-{uuid.uuid4().hex[:6]}"),
        "segment": str(cust_raw.get("segment") or raw.get("customer_segment") or raw.get("segment") or "Consumer"),
        "country": str(cust_raw.get("country") or raw.get("customer_country") or raw.get("country") or "USA"),
        "loyalty_tier": str(cust_raw.get("loyalty_tier") or raw.get("loyalty_tier") or "Bronze")
    }

    # 4. Product Info
    prod_raw = raw.get("product") if isinstance(raw.get("product"), dict) else {}
    category = str(prod_raw.get("category") or raw.get("category") or "General Merchandise")
    product = {
        "sku": str(prod_raw.get("sku") or raw.get("sku") or f"SKU-{uuid.uuid4().hex[:6].upper()}"),
        "category": category,
        "subcategory": str(prod_raw.get("subcategory") or raw.get("subcategory") or category),
        "unit_price": float(prod_raw.get("unit_price") or raw.get("unit_price") or 49.99)
    }

    # 5. Financial Metrics
    met_raw = raw.get("metrics") if isinstance(raw.get("metrics"), dict) else {}
    qty = int(met_raw.get("quantity") or raw.get("quantity") or 1)
    if qty <= 0:
        qty = 1
    unit_price = product["unit_price"]
    gross = float(met_raw.get("gross_amount") or raw.get("gross_amount") or (unit_price * qty))
    disc_pct = float(met_raw.get("discount_percent") or raw.get("discount_percent") or 0.0)
    net = float(met_raw.get("net_amount") or raw.get("net_amount") or (gross * (1 - (disc_pct / 100.0))))
    tax = float(met_raw.get("tax_amount") or raw.get("tax_amount") or round(net * 0.08, 2))
    ship_fee = float(met_raw.get("shipping_fee") or raw.get("shipping_fee") or (12.50 if net < 100 else 0.0))
    margin = float(met_raw.get("profit_margin") or raw.get("profit_margin") or 0.28)

    metrics = {
        "quantity": qty,
        "gross_amount": round(gross, 2),
        "discount_percent": round(disc_pct, 2),
        "net_amount": round(net, 2),
        "tax_amount": round(tax, 2),
        "shipping_fee": round(ship_fee, 2),
        "profit_margin": round(margin, 4)
    }

    # 6. Fulfillment
    ful_raw = raw.get("fulfillment") if isinstance(raw.get("fulfillment"), dict) else {}
    del_days = float(ful_raw.get("delivery_days") or raw.get("delivery_days") or 3.2)
    status = str(ful_raw.get("status") or raw.get("status") or "delivered")
    delayed = bool(ful_raw.get("delayed") if "delayed" in ful_raw else (raw.get("delayed", del_days > 5.0)))

    fulfillment = {
        "warehouse_id": str(ful_raw.get("warehouse_id") or raw.get("warehouse_id") or "WH-CENTRAL-01"),
        "shipping_carrier": str(ful_raw.get("shipping_carrier") or raw.get("shipping_carrier") or "FedEx Express"),
        "delivery_days": round(del_days, 1),
        "status": status,
        "delayed": delayed
    }

    doc = {
        "transaction_id": tx_id,
        "order_id": order_id,
        "timestamp": dt_val,
        "customer": customer,
        "product": product,
        "metrics": metrics,
        "fulfillment": fulfillment,
        "metadata": {
            "batch_id": batch_id,
            "ingested_at": datetime.utcnow()
        }
    }

    # Strict validation through Pydantic
    TransactionDocument(**doc)
    return doc

def chunked_iterable(iterable: Generator, chunk_size: int):
    """Yields batches of items from a generator without loading entire stream into memory."""
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk

def execute_batch_insertion(
    batch: List[Dict[str, Any]], 
    use_upsert: bool = True
) -> Tuple[int, int, List[str]]:
    """
    Executes a high-throughput bulk insertion or upsert into MongoDB.
    
    If use_upsert=True:
        Uses `bulk_write` with `UpdateOne(..., upsert=True)` to gracefully handle duplicates
        without failing the batch.
    If use_upsert=False:
        Uses `insert_many(ordered=False)` for maximum raw ingestion speed.
    """
    col = get_sync_collection()
    errors = []
    inserted = 0
    rejected = 0

    if not batch:
        return 0, 0, []

    if use_upsert:
        operations = [
            UpdateOne(
                {"transaction_id": doc["transaction_id"]},
                {"$set": doc},
                upsert=True
            )
            for doc in batch
        ]
        try:
            result = col.bulk_write(operations, ordered=False)
            # Upserted + Matched + Modified
            inserted = result.upserted_count + result.modified_count + result.matched_count
        except BulkWriteError as bwe:
            # Handle partial write errors gracefully
            write_errors = bwe.details.get("writeErrors", [])
            rejected = len(write_errors)
            inserted = len(batch) - rejected
            for err in write_errors[:3]:
                errors.append(f"Write error code {err.get('code')}: {err.get('errmsg')}")
    else:
        try:
            res = col.insert_many(batch, ordered=False)
            inserted = len(res.inserted_ids)
        except BulkWriteError as bwe:
            write_errors = bwe.details.get("writeErrors", [])
            rejected = len(write_errors)
            inserted = bwe.details.get("nInserted", len(batch) - rejected)
            for err in write_errors[:3]:
                errors.append(f"Duplicate/insert error: {err.get('errmsg')}")
        except Exception as ex:
            rejected = len(batch)
            errors.append(str(ex))

    return inserted, rejected, errors

def process_dataframe_stream(
    df: pd.DataFrame, 
    batch_size: int = 10000, 
    use_upsert: bool = True
) -> IngestStats:
    """
    Streams a Pandas DataFrame into MongoDB using chunked batch insertions.
    """
    batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    total_received = len(df)
    total_inserted = 0
    total_rejected = 0
    all_errors = []

    logger.info(f"Initiating ingestion batch {batch_id} for {total_received} rows (chunk size: {batch_size})")

    # Iterate in memory-efficient chunks
    for i in range(0, total_received, batch_size):
        chunk_df = df.iloc[i : i + batch_size]
        batch_docs = []
        for _, row in chunk_df.iterrows():
            try:
                doc = coerce_record_to_schema(row.to_dict(), batch_id)
                batch_docs.append(doc)
            except Exception as e:
                total_rejected += 1
                if len(all_errors) < 5:
                    all_errors.append(f"Validation rejection: {str(e)}")

        if batch_docs:
            ins, rej, errs = execute_batch_insertion(batch_docs, use_upsert=use_upsert)
            total_inserted += ins
            total_rejected += rej
            all_errors.extend(errs[:2])

    duration = max(time.time() - start_time, 0.001)
    throughput = round(total_inserted / duration, 2)

    logger.info(
        f"Completed batch {batch_id}: {total_inserted} inserted, {total_rejected} rejected "
        f"in {duration:.2f}s ({throughput} docs/sec)"
    )

    return IngestStats(
        batch_id=batch_id,
        status="completed" if total_inserted > 0 else "failed",
        rows_received=total_received,
        rows_inserted=total_inserted,
        rows_rejected=total_rejected,
        duration_seconds=round(duration, 3),
        throughput_rows_per_sec=throughput,
        errors_sample=all_errors[:5]
    )

def ingest_file_stream(
    file_bytes: bytes, 
    filename: str, 
    batch_size: int = 10000, 
    use_upsert: bool = True
) -> IngestStats:
    """
    Detects file type (CSV, JSON, Parquet) and processes it into MongoDB.
    """
    lower = filename.lower()
    stream = io.BytesIO(file_bytes)

    if lower.endswith(".csv"):
        # Read in chunks or direct dataframe
        df = pd.read_csv(stream)
    elif lower.endswith(".json") or lower.endswith(".jsonl"):
        try:
            df = pd.read_json(stream, orient="records", lines=True)
        except Exception:
            stream.seek(0)
            data = json.load(stream)
            df = pd.DataFrame(data if isinstance(data, list) else [data])
    elif lower.endswith(".parquet") or lower.endswith(".pq"):
        df = pd.read_parquet(stream)
    else:
        raise ValueError(f"Unsupported file format: {filename}. Please provide CSV, JSON, or Parquet.")

    return process_dataframe_stream(df, batch_size=batch_size, use_upsert=use_upsert)
