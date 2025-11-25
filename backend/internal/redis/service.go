package redis

import (
	"context"
	"fmt"
	"time"

	"stroy-control-backend/internal/config"

	"github.com/go-redis/redis/v8"
)

// RedisService сервис для работы с Redis
type RedisService struct {
	client *redis.Client
	ctx    context.Context
}

// NewRedisService создает новый экземпляр Redis сервиса
func NewRedisService(cfg *config.Config) *RedisService {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Host,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	return &RedisService{
		client: client,
		ctx:    context.Background(),
	}
}

// HealthCheck проверяет соединение с Redis
func (r *RedisService) HealthCheck() error {
	pong, err := r.client.Ping(r.ctx).Result()
	if err != nil {
		return err
	}

	if pong != "PONG" {
		return fmt.Errorf("unexpected ping response: %s", pong)
	}

	return nil
}

// RateLimiting

// IsRateLimited проверяет, ограничен ли запрос для ключа
func (r *RedisService) IsRateLimited(key string, limit int, window time.Duration) (bool, error) {
	pipe := r.client.Pipeline()

	// Получаем текущий счетчик
	get := pipe.Get(r.ctx, r.getRateLimitKey(key))

	// Устанавливаем TTL для ключа если он не существует
	pipe.SetNX(r.ctx, r.getRateLimitKey(key), 0, window)

	_, err := pipe.Exec(r.ctx)
	if err != nil && err != redis.Nil {
		return false, err
	}

	current, err := get.Result()
	if err != nil && err != redis.Nil {
		return false, err
	}

	if err == redis.Nil {
		// Ключ не существует, создаем его
		current = "0"
	}

	count := 0
	if current != "" {
		count = int(parseInt(current))
	}

	return count >= limit, nil
}

// IncrementRateLimit увеличивает счетчик для ключа
func (r *RedisService) IncrementRateLimit(key string) error {
	_, err := r.client.Incr(r.ctx, r.getRateLimitKey(key)).Result()
	return err
}

// getRateLimitKey формирует ключ для rate limiting
func (r *RedisService) getRateLimitKey(key string) string {
	return "rate_limit:" + key
}

// Token Blacklisting

// IsTokenBlacklisted проверяет, находится ли токен в черном списке
func (r *RedisService) IsTokenBlacklisted(tokenID string) (bool, error) {
	exists, err := r.client.Exists(r.ctx, r.getTokenBlacklistKey(tokenID)).Result()
	return exists > 0, err
}

// BlacklistToken добавляет токен в черный список
func (r *RedisService) BlacklistToken(tokenID string, ttl time.Duration) error {
	_, err := r.client.Set(r.ctx, r.getTokenBlacklistKey(tokenID), "blacklisted", ttl).Result()
	return err
}

// RemoveTokenFromBlacklist удаляет токен из черного списка
func (r *RedisService) RemoveTokenFromBlacklist(tokenID string) error {
	_, err := r.client.Del(r.ctx, r.getTokenBlacklistKey(tokenID)).Result()
	return err
}

// getTokenBlacklistKey формирует ключ для черного списка токенов
func (r *RedisService) getTokenBlacklistKey(tokenID string) string {
	return "blacklisted_token:" + tokenID
}

// Session Management

// SaveSession сохраняет сессию в Redis
func (r *RedisService) SaveSession(sessionID string, data map[string]interface{}, ttl time.Duration) error {
	pipe := r.client.Pipeline()

	// Сохраняем данные сессии
	for key, value := range data {
		pipe.HSet(r.ctx, r.getSessionKey(sessionID), key, value)
	}

	// Устанавливаем TTL
	pipe.Expire(r.ctx, r.getSessionKey(sessionID), ttl)

	_, err := pipe.Exec(r.ctx)
	return err
}

// GetSession получает данные сессии
func (r *RedisService) GetSession(sessionID string) (map[string]string, error) {
	result, err := r.client.HGetAll(r.ctx, r.getSessionKey(sessionID)).Result()
	return result, err
}

// DeleteSession удаляет сессию
func (r *RedisService) DeleteSession(sessionID string) error {
	_, err := r.client.Del(r.ctx, r.getSessionKey(sessionID)).Result()
	return err
}

// getSessionKey формирует ключ для сессии
func (r *RedisService) getSessionKey(sessionID string) string {
	return "session:" + sessionID
}

// Utility functions

// parseInt парсит строку в int (простая реализация для Redis результата)
func parseInt(s string) int {
	var result int = 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			result = result*10 + int(c-'0')
		}
	}
	return result
}

// Close закрывает соединение с Redis
func (r *RedisService) Close() error {
	return r.client.Close()
}

// GetClient возвращает клиент Redis для использования в других сервисах
func (r *RedisService) GetClient() *redis.Client {
	return r.client
}
