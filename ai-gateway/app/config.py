from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Конфигурация AI Gateway"""
    
    # Application
    app_name: str = "AI Gateway for Stroy-Control"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/stroy_control"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_cache_ttl: int = 3600  # 1 час
    
    # AI Providers
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    
    # Vector Database
    pinecone_api_key: Optional[str] = None
    pinecone_environment: str = "us-west1-gcp"
    pinecone_index_name: str = "construction-docs"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Rate Limiting
    rate_limit_per_user: int = 100
    rate_limit_window: int = 3600  # 1 час
    
    # AI Settings
    max_tokens_per_request: int = 4000
    default_model: str = "gpt-4"
    temperature: float = 0.7
    
    # File Processing
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list = ["pdf", "jpg", "jpeg", "png"]
    
    # Monitoring
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Глобальная инстанс конфигурации
settings = Settings()
