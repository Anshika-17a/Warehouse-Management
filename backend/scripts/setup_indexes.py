#!/usr/bin/env python3
"""
MongoDB Schema & Index Setup Script
Creates and validates compound indexes, unique constraints, and schema validators.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import get_sync_client, init_indexes
from app.config import settings

def run_setup():
    print(f"Connecting to MongoDB at: {settings.MONGODB_URL}")
    client = get_sync_client()
    db = client[settings.DATABASE_NAME]
    
    # 1. Collection schema validation (JSON Schema)
    print(f"Ensuring collection '{settings.COLLECTION_NAME}' with schema validation...")
    validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["transaction_id", "order_id", "timestamp", "customer", "product", "metrics", "fulfillment"],
            "properties": {
                "transaction_id": {
                    "bsonType": "string",
                    "description": "Unique transaction identifier"
                },
                "order_id": {
                    "bsonType": "string",
                    "description": "Order reference code"
                },
                "timestamp": {
                    "bsonType": "date",
                    "description": "UTC timestamp of the transaction"
                },
                "metrics": {
                    "bsonType": "object",
                    "required": ["gross_amount", "net_amount", "quantity"],
                    "properties": {
                        "gross_amount": {"bsonType": ["double", "int", "decimal"]},
                        "net_amount": {"bsonType": ["double", "int", "decimal"]},
                        "quantity": {"bsonType": ["int", "long"]}
                    }
                }
            }
        }
    }

    existing_collections = db.list_collection_names()
    if settings.COLLECTION_NAME not in existing_collections:
        db.create_collection(settings.COLLECTION_NAME, validator=validator)
        print(f"Created collection '{settings.COLLECTION_NAME}' with JSON Schema validator.")
    else:
        try:
            db.command({
                "collMod": settings.COLLECTION_NAME,
                "validator": validator,
                "validationLevel": "moderate"
            })
            print(f"Updated JSON Schema validator on '{settings.COLLECTION_NAME}'.")
        except Exception as e:
            print(f"Notice: collMod validator setup: {e}")

    # 2. Build compound and unique indexes
    print("Building compound and unique indexes...")
    indexes = init_indexes()
    print(f"Successfully configured indexes: {indexes}")

    print("\n--- Active Indexes on Collection ---")
    for idx in db[settings.COLLECTION_NAME].list_indexes():
        print(f"• Name: {idx['name']}, Keys: {idx['key']}, Unique: {idx.get('unique', False)}")

    print("\nDatabase setup complete!")

if __name__ == "__main__":
    run_setup()
