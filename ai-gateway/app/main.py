from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
import redis.asyncio as redis

from app.config import settings
from app.core.cache_service import CacheService
from app.core.monitoring import setup_monitoring
from app.routers import estimates, chat, vision
# from app.middleware.auth import AuthenticationMiddleware


# Настройка логирования
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management для FastAPI приложения"""
    # Startup
    logger.info("AI Gateway starting up...", version=settings.app_version)
    
    # Инициализация Redis для middleware
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    app.state.redis = redis_client
    
    # Инициализация кэша
    cache_service = CacheService()
    try:
        await cache_service.initialize()
        app.state.cache = cache_service
        logger.info("Cache service initialized successfully")
    except Exception as e:
        logger.warning("Cache service initialization failed, continuing without cache", error=str(e))
        app.state.cache = None
    
    # Настройка мониторинга
    if settings.enable_metrics:
        setup_monitoring()
    
    # Добавление authentication middleware
    # if not settings.debug:  # Only in production
    #     app.add_middleware(AuthenticationMiddleware, redis_client=redis_client)
    
    logger.info("AI Gateway startup complete")
    
    yield
    
    # Shutdown
    logger.info("AI Gateway shutting down...")
    await cache_service.close()
    await redis_client.close()
    logger.info("AI Gateway shutdown complete")


# Создание FastAPI приложения
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Gateway для строительной системы Строй-Контроль",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check
@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "AI Gateway for Stroy-Control",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health"
    }


# Регистрация роутеров
app.include_router(estimates.router, prefix="/api/v1/estimates", tags=["Estimates"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision"])


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
