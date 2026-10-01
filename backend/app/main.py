import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_indexes, get_sync_client
from app.api import ingest, query, analytics, benchmark

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("platform.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MongoDB Big Data Storage & Analytics Platform...")
    try:
        # Check connection and ensure indexes
        client = get_sync_client()
        client.admin.command("ping")
        logger.info(f"Connected to MongoDB at {settings.MONGODB_URL}")
        
        # Initialize compound, unique, and TTL indexes
        init_indexes()
        logger.info("Database indexes successfully initialized.")
    except Exception as e:
        logger.warning(f"Could not connect to MongoDB during startup ping: {e}. Queries will retry dynamically.")
    
    yield
    
    logger.info("Shutting down Big Data Analytics Platform...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-Throughput Big Data Storage, Bulk Ingestion & Aggregation Platform powered by MongoDB, FastAPI, and Next.js",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(analytics.router)
app.include_router(benchmark.router)

@app.get("/health")
def healthcheck():
    """System health check and database ping."""
    db_status = "healthy"
    try:
        get_sync_client().admin.command("ping")
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "database_name": settings.DATABASE_NAME,
        "collection_name": settings.COLLECTION_NAME,
        "batch_size": settings.BATCH_SIZE
    }
