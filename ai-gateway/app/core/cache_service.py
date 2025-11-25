import redis.asyncio as redis
import json
import hashlib
from typing import Optional, Any, Dict
import structlog

from app.config import settings

logger = structlog.get_logger()


class CacheService:
    """Сервис для интеллектуального кэширования AI результатов"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.default_ttl = settings.redis_cache_ttl
        
    async def initialize(self):
        """Инициализация Redis подключения"""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Проверка подключения
            await self.redis_client.ping()
            logger.info("Redis cache service initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize Redis", error=str(e))
            raise
            
    async def close(self):
        """Закрытие Redis подключения"""
        if self.redis_client:
            await self.redis_client.close()
            
    def generate_cache_key(self, prompt: str, context: Dict[str, Any]) -> str:
        """Генерация ключа кэша на основе контента"""
        # Создание детерминированного ключа на основе промпта и контекста
        content = {
            "prompt": prompt,
            "context": sorted(context.items())  # Сортировка для консистентности
        }
        content_str = json.dumps(content, sort_keys=True, separators=(',', ':'))
        hash_value = hashlib.md5(content_str.encode()).hexdigest()
        return f"ai_cache:{hash_value}"
        
    async def get_cached_result(self, cache_key: str) -> Optional[Any]:
        """Получение кэшированного результата"""
        if not self.redis_client:
            return None
            
        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                logger.debug("Cache hit", key=cache_key)
                return json.loads(cached_data)
            else:
                logger.debug("Cache miss", key=cache_key)
                return None
        except Exception as e:
            logger.warning("Cache get error", key=cache_key, error=str(e))
            return None
            
    async def set_cached_result(self, cache_key: str, result: Any, ttl: Optional[int] = None) -> bool:
        """Сохранение результата в кэш"""
        if not self.redis_client:
            return False
            
        try:
            ttl = ttl or self.default_ttl
            serialized_result = json.dumps(result, default=str)
            await self.redis_client.setex(cache_key, ttl, serialized_result)
            logger.debug("Cache set", key=cache_key, ttl=ttl)
            return True
        except Exception as e:
            logger.warning("Cache set error", key=cache_key, error=str(e))
            return False
            
    async def delete_cache(self, cache_key: str) -> bool:
        """Удаление из кэша"""
        if not self.redis_client:
            return False
            
        try:
            await self.redis_client.delete(cache_key)
            logger.debug("Cache deleted", key=cache_key)
            return True
        except Exception as e:
            logger.warning("Cache delete error", key=cache_key, error=str(e))
            return False
            
    async def clear_cache_by_pattern(self, pattern: str) -> int:
        """Очистка кэша по паттерну"""
        if not self.redis_client:
            return 0
            
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                deleted_count = await self.redis_client.delete(*keys)
                logger.info("Cache cleared by pattern", pattern=pattern, deleted_count=deleted_count)
                return deleted_count
            return 0
        except Exception as e:
            logger.warning("Cache clear pattern error", pattern=pattern, error=str(e))
            return 0
            
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Получение статистики кэша"""
        if not self.redis_client:
            return {}
            
        try:
            info = await self.redis_client.info()
            return {
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info)
            }
        except Exception as e:
            logger.warning("Cache stats error", error=str(e))
            return {}
            
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Расчет hit rate кэша"""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
            
        return round((hits / total) * 100, 2)
