import prometheus_client
from prometheus_client import Counter, Histogram, Gauge
import structlog

logger = structlog.get_logger()


# Метрики для AI Gateway
REQUEST_COUNT = Counter(
    'ai_gateway_requests_total',
    'Total number of AI requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'ai_gateway_request_duration_seconds',
    'AI request duration in seconds',
    ['method', 'endpoint', 'ai_provider']
)

AI_TOKENS_USED = Counter(
    'ai_gateway_tokens_used_total',
    'Total AI tokens used',
    ['ai_provider', 'model']
)

CACHE_HIT_RATE = Gauge(
    'ai_gateway_cache_hit_rate',
    'Cache hit rate percentage'
)

ACTIVE_CONNECTIONS = Gauge(
    'ai_gateway_active_connections',
    'Number of active connections'
)


def setup_monitoring():
    """Настройка Prometheus метрик"""
    logger.info("Monitoring setup complete")
    return {
        "request_count": REQUEST_COUNT,
        "request_duration": REQUEST_DURATION,
        "tokens_used": AI_TOKENS_USED,
        "cache_hit_rate": CACHE_HIT_RATE,
        "active_connections": ACTIVE_CONNECTIONS
    }


def record_request(method: str, endpoint: str, status: str, duration: float, ai_provider: str = "unknown"):
    """Запрос метрик запроса"""
    REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    REQUEST_DURATION.labels(method=method, endpoint=endpoint, ai_provider=ai_provider).observe(duration)


def record_tokens_used(ai_provider: str, model: str, tokens: int):
    """Запрос метрик токенов"""
    AI_TOKENS_USED.labels(ai_provider=ai_provider, model=model).inc(tokens)


def update_cache_hit_rate(hit_rate: float):
    """Обновление hit rate кэша"""
    CACHE_HIT_RATE.set(hit_rate)


def update_active_connections(count: int):
    """Обновление активных соединений"""
    ACTIVE_CONNECTIONS.set(count)
