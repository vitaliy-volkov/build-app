package middleware

import (
	"net/http"
	"time"

	"stroy-control-backend/internal/models"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
)

// RateLimitMiddleware middleware для ограничения частоты запросов
type RateLimitMiddleware struct {
	redisService  *redis.RedisService
	defaultLimit  int
	defaultWindow time.Duration
}

// NewRateLimitMiddleware создает новый экземпляр middleware для rate limiting
func NewRateLimitMiddleware(redisService *redis.RedisService) *RateLimitMiddleware {
	return &RateLimitMiddleware{
		redisService:  redisService,
		defaultLimit:  10000,     // 10000 запросов для разработки
		defaultWindow: time.Hour, // в час
	}
}

// RateLimitByIP ограничивает запросы по IP адресу
func (m *RateLimitMiddleware) RateLimitByIP() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		limit := m.defaultLimit
		window := m.defaultWindow

		// Проверяем лимит для аутентифицированных пользователей
		if _, exists := c.Get("user_id"); exists {
			if userRole := c.GetString("user_role"); userRole == string(models.RoleAdmin) {
				limit = 1000 // Админы имеют высокий лимит
			} else {
				limit = 50 // Обычные пользователи имеют более низкий лимит
			}
		}

		isLimited, err := m.redisService.IsRateLimited(clientIP, limit, window)
		if err != nil {
			// В случае ошибки Redis, продолжаем без ограничений
			c.Next()
			return
		}

		if isLimited {
			c.JSON(http.StatusTooManyRequests, models.NewErrorResponse(
				"Rate limit exceeded",
				http.StatusTooManyRequests,
				"Too many requests from this IP address",
			))
			c.Abort()
			return
		}

		// Увеличиваем счетчик
		if err := m.redisService.IncrementRateLimit(clientIP); err != nil {
			// В случае ошибки продолжаем без ограничений
			c.Next()
			return
		}

		// Добавляем заголовки с информацией о лимитах
		c.Header("X-RateLimit-Limit", string(rune(limit)))
		c.Header("X-RateLimit-Remaining", string(rune(limit-1))) // Приблизительно

		c.Next()
	}
}

// RateLimitByUser ограничивает запросы по пользователю
func (m *RateLimitMiddleware) RateLimitByUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			// Если пользователь не аутентифицирован, используем IP
			c.Next()
			return
		}

		limit := 50 // Лимит для пользователей
		window := time.Hour

		isLimited, err := m.redisService.IsRateLimited("user:"+userID.(string), limit, window)
		if err != nil {
			c.Next()
			return
		}

		if isLimited {
			c.JSON(http.StatusTooManyRequests, models.NewErrorResponse(
				"User rate limit exceeded",
				http.StatusTooManyRequests,
				"Too many requests from this user",
			))
			c.Abort()
			return
		}

		if err := m.redisService.IncrementRateLimit("user:" + userID.(string)); err != nil {
			c.Next()
			return
		}

		c.Header("X-User-RateLimit-Limit", string(rune(limit)))
		c.Header("X-User-RateLimit-Remaining", string(rune(limit-1)))

		c.Next()
	}
}

// TokenBlacklistMiddleware проверяет черный список токенов
func (m *RateLimitMiddleware) TokenBlacklistMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Извлекаем токен из заголовка Authorization
		tokenID, err := extractTokenID(authHeader)
		if err != nil {
			c.Next()
			return
		}

		// Проверяем, находится ли токен в черном списке
		isBlacklisted, err := m.redisService.IsTokenBlacklisted(tokenID)
		if err != nil {
			c.Next()
			return
		}

		if isBlacklisted {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Token is blacklisted",
				http.StatusUnauthorized,
				"This token has been revoked",
			))
			c.Abort()
			return
		}

		c.Next()
	}
}

// extractTokenID извлекает ID токена из JWT (простая реализация)
func extractTokenID(token string) (string, error) {
	// Простая реализация для примера
	// В реальном приложении нужно использовать полноценный парсер JWT
	if len(token) < 7 {
		return "", nil
	}

	tokenPart := token[7:] // Убираем "Bearer "
	if len(tokenPart) < 10 {
		return "", nil
	}

	// Возвращаем первые 10 символов как ID токена (очень упрощенно)
	return tokenPart[:10], nil
}
