import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "MongoDB Big Data Analytics Platform"
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "bigdata_analytics")
    COLLECTION_NAME: str = os.getenv("COLLECTION_NAME", "transactions")
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "10000"))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "60"))
    ENABLE_TTL_INDEX: bool = os.getenv("ENABLE_TTL_INDEX", "false").lower() == "true"
    TTL_DAYS: int = int(os.getenv("TTL_DAYS", "90"))
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    class Config:
        env_file = (
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            ".env"
        )
        extra = "ignore"

settings = Settings()
