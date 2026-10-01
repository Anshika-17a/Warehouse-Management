from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from app.services.ingestion import ingest_file_stream
from app.services.generator import generate_and_insert_dataset
from app.services.analytics import clear_analytics_cache
from app.models.transaction import IngestStats
from app.database import get_sync_collection

router = APIRouter(prefix="/api/ingest", tags=["Ingestion"])

@router.post("/upload", response_model=IngestStats)
async def upload_dataset(
    file: UploadFile = File(...),
    batch_size: int = Form(10000),
    use_upsert: bool = Form(True)
):
    """
    Accepts CSV, JSON, or Parquet file uploads.
    Streams batches of 5,000 - 10,000 documents into MongoDB using bulk operations.
    Validates documents with Pydantic and returns comprehensive ingestion telemetry.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        stats = ingest_file_stream(
            file_bytes=content,
            filename=file.filename,
            batch_size=batch_size,
            use_upsert=use_upsert
        )
        # Invalidate cache so newly ingested numbers immediately reflect in analytics
        clear_analytics_cache()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.post("/generate", response_model=IngestStats)
def generate_sample_data(
    count: int = Query(10000, ge=100, le=500000, description="Number of synthetic documents to generate"),
    batch_size: int = Query(5000, ge=500, le=25000)
):
    """
    Generates and bulk-inserts synthetic high-volume transaction records for testing.
    Ideal for simulating datasets in the thousands to millions of documents.
    """
    try:
        stats = generate_and_insert_dataset(count=count, batch_size=batch_size)
        clear_analytics_cache()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@router.get("/collection-stats")
def get_collection_stats():
    """Returns database size, storage size, document count, and index stats."""
    col = get_sync_collection()
    count = col.estimated_document_count()
    indexes = list(col.list_indexes())
    
    return {
        "collection_name": col.name,
        "estimated_document_count": count,
        "active_indexes": [
            {
                "name": idx.get("name"),
                "key": list(idx.get("key", {}).items()),
                "unique": idx.get("unique", False)
            }
            for idx in indexes
        ]
    }
