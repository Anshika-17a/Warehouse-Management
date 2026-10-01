import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.services.ingestion import execute_batch_insertion, IngestStats
import time

CATEGORIES = [
    ("Electronics", ["Laptops", "Smartphones", "Audio", "Displays", "Accessories"]),
    ("Industrial", ["Motors", "Hydraulics", "Sensors", "Pneumatics", "Fasteners"]),
    ("Apparel", ["Footwear", "Outerwear", "Sportswear", "Workwear"]),
    ("Home & Office", ["Furniture", "Lighting", "Ergonomics", "Storage"]),
    ("Automotive", ["Diagnostics", "Batteries", "Brakes", "Lighting"])
]

COUNTRIES = ["USA", "Germany", "United Kingdom", "Japan", "Canada", "France", "Australia", "Singapore"]
SEGMENTS = ["Enterprise", "Corporate", "Small Business", "Consumer"]
TIERS = ["Platinum", "Gold", "Silver", "Bronze"]
CARRIERS = ["FedEx Express", "DHL Worldwide", "UPS Freight", "Amazon Logistics"]
STATUSES = ["delivered", "in_transit", "pending", "returned", "cancelled"]
WAREHOUSES = ["WH-EAST-01", "WH-WEST-02", "WH-CENTRAL-03", "WH-EU-01", "WH-APAC-01"]

def generate_random_transaction(base_time: datetime) -> Dict[str, Any]:
    cat_tuple = random.choice(CATEGORIES)
    category = cat_tuple[0]
    subcategory = random.choice(cat_tuple[1])

    # Price based on category
    if category == "Electronics":
        unit_price = round(random.uniform(80.0, 1850.0), 2)
    elif category == "Industrial":
        unit_price = round(random.uniform(150.0, 3200.0), 2)
    elif category == "Automotive":
        unit_price = round(random.uniform(45.0, 890.0), 2)
    else:
        unit_price = round(random.uniform(15.0, 350.0), 2)

    qty = random.choices([1, 2, 3, 5, 10, 25], weights=[60, 20, 10, 5, 3, 2])[0]
    gross = round(unit_price * qty, 2)
    disc_pct = random.choices([0.0, 5.0, 10.0, 15.0, 25.0, 40.0], weights=[45, 20, 15, 10, 7, 3])[0]
    net = round(gross * (1.0 - (disc_pct / 100.0)), 2)
    tax = round(net * 0.0825, 2)
    shipping_fee = 0.0 if net > 250 else round(random.uniform(8.5, 35.0), 2)
    profit_margin = round(random.uniform(0.12, 0.48), 4)

    # Fulfillment
    status = random.choices(STATUSES, weights=[72, 16, 5, 4, 3])[0]
    delivery_days = round(random.gauss(3.5, 1.8), 1)
    if delivery_days < 0.5:
        delivery_days = 0.8
    delayed = delivery_days > 5.5 or (status == "in_transit" and delivery_days > 4.0)

    # Random timestamp in past 90 days
    delta_minutes = random.randint(0, 90 * 24 * 60)
    tx_time = base_time - timedelta(minutes=delta_minutes)

    tx_id = f"TX-{uuid.uuid4().hex[:12].upper()}"

    return {
        "transaction_id": tx_id,
        "order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": tx_time,
        "customer": {
            "customer_id": f"CUST-{random.randint(1000, 99999)}",
            "segment": random.choice(SEGMENTS),
            "country": random.choice(COUNTRIES),
            "loyalty_tier": random.choice(TIERS)
        },
        "product": {
            "sku": f"SKU-{category[:3].upper()}-{random.randint(100, 999)}",
            "category": category,
            "subcategory": subcategory,
            "unit_price": unit_price
        },
        "metrics": {
            "quantity": qty,
            "gross_amount": gross,
            "discount_percent": disc_pct,
            "net_amount": net,
            "tax_amount": tax,
            "shipping_fee": shipping_fee,
            "profit_margin": profit_margin
        },
        "fulfillment": {
            "warehouse_id": random.choice(WAREHOUSES),
            "shipping_carrier": random.choice(CARRIERS),
            "delivery_days": delivery_days,
            "status": status,
            "delayed": delayed
        },
        "metadata": {
            "source": "synthetic_generator",
            "ingested_at": datetime.utcnow()
        }
    }

def generate_and_insert_dataset(count: int = 10000, batch_size: int = 5000) -> IngestStats:
    start_time = time.time()
    batch_id = f"gen-{uuid.uuid4().hex[:8]}"
    base_time = datetime.utcnow()
    total_inserted = 0
    total_rejected = 0
    errors = []

    remaining = count
    while remaining > 0:
        current_chunk_size = min(remaining, batch_size)
        batch = [generate_random_transaction(base_time) for _ in range(current_chunk_size)]
        ins, rej, errs = execute_batch_insertion(batch, use_upsert=False)
        total_inserted += ins
        total_rejected += rej
        errors.extend(errs[:2])
        remaining -= current_chunk_size

    duration = max(time.time() - start_time, 0.001)
    throughput = round(total_inserted / duration, 2)

    return IngestStats(
        batch_id=batch_id,
        status="completed",
        rows_received=count,
        rows_inserted=total_inserted,
        rows_rejected=total_rejected,
        duration_seconds=round(duration, 3),
        throughput_rows_per_sec=throughput,
        errors_sample=errors[:5]
    )
