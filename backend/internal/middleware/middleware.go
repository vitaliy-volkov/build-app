package middleware

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "net/http"
    "time"

    "stroy-control-backend/internal/models"

    "github.com/gin-gonic/gin"
)

// RequestIDMiddleware middleware для генерации и установки Request ID
func RequestIDMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Получаем или создаем Request ID
        requestID := c.GetHeader("X-Request-ID")
        if requestID == "" {
            // Генерируем новый Request ID
            bytes := make([]byte, 16)
            _, err := rand.Read(bytes)
            if err != nil {
                // В случае ошибки используем текущее время
                requestID = "req-" + hex.EncodeToString([]byte(time.Now().Format("20060102150405")))
            } else {
                requestID = "req-" + hex.EncodeToString(bytes)
            }
        }

        // Устанавливаем Request ID в контекст и заголовки
        c.Set("request_id", requestID)
        c.Header("X-Request-ID", requestID)
        c.Header("X-Response-Time", time.Now().Format(time.RFC3339))

        c.Next()
    }
}

// LoggingMiddleware middleware для логирования запросов
func LoggingMiddleware() gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        // Получаем Request ID из контекста
        requestID := "-"
        if value, exists := param.Keys["request_id"]; exists {
            requestID = value.(string)
        }

        // Форматируем лог записи
        log := gin.H{
            "request_id":  requestID,
            "method":      param.Method,
            "path":        param.Path,
            "status_code": param.StatusCode,
            "latency":     param.Latency.String(),
            "ip":          param.ClientIP,
            "time":        param.TimeStamp.Format(time.RFC3339),
        }

        // Если есть ошибка, добавляем ее в лог
        if param.ErrorMessage != "" {
            log["error"] = param.ErrorMessage
        }

        // Возвращаем отформатированную строку
        return fmt.Sprintf("[%s] %s %s %d %s %s %s\n",
            param.TimeStamp.Format(time.RFC3339),
            param.Method,
            param.Path,
            param.StatusCode,
            param.Latency.String(),
            param.ClientIP,
            requestID,
        )
    })
}

// ErrorHandlingMiddleware middleware для централизованной обработки ошибок
func ErrorHandlingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Выполняем следующий middleware/handler
        c.Next()

        // Проверяем на наличие ошибок
        if len(c.Errors) > 0 {
            // Получаем Request ID для логирования
            // requestID := "-"
            // if value, exists := c.Get("request_id"); exists {
            //     requestID = value.(string)
            // }

            // Обрабатываем каждую ошибку
            for _, err := range c.Errors {
                switch err.Type {
                case gin.ErrorTypeBind:
                    // Ошибка связывания данных
                    c.JSON(http.StatusBadRequest, models.NewErrorResponse(
                        "Invalid request data",
                        http.StatusBadRequest,
                        err.Error(),
                    ))
                case gin.ErrorTypeRender:
                    // Ошибка рендеринга
                    c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
                        "Internal server error",
                        http.StatusInternalServerError,
                    ))
                case gin.ErrorTypePublic:
                    // Публичная ошибка (уже обработана)
                    continue
                default:
                    // Неизвестная ошибка
                    c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
                        "Internal server error",
                        http.StatusInternalServerError,
                    ))
                }

                // Логируем ошибку
                // В реальном приложении здесь был бы вызов логгера
                // logrus.WithFields(logrus.Fields{
                //     "request_id": requestID,
                //     "error":      err.Error(),
                //     "type":       err.Type.String(),
                // }).Error("Request error")
            }

            // Завершаем обработку запроса
            c.Abort()
            return
        }

        // Если статус код >= 500, это серверная ошибка
        if c.Writer.Status() >= http.StatusInternalServerError {
            // requestID := "-"
            // if value, exists := c.Get("request_id"); exists {
            //     requestID = value.(string)
            // }

            c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
                "Internal server error",
                http.StatusInternalServerError,
            ))

            // Логируем серверную ошибку
            // logrus.WithFields(logrus.Fields{
            //     "request_id":  requestID,
            //     "status_code": c.Writer.Status(),
            //     "method":      c.Request.Method,
            //     "path":        c.Request.URL.Path,
            // }).Error("Server error")
        }
    }
}

// CORSMiddleware middleware для настройки CORS
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        allowOrigin := ""

        for _, o := range allowedOrigins {
            if o == "*" {
                allowOrigin = "*"
                break
            }
            if o == origin {
                allowOrigin = origin
                break
            }
        }

        if allowOrigin != "" {
            c.Header("Access-Control-Allow-Origin", allowOrigin)
        }

        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
        c.Header("Access-Control-Expose-Headers", "Content-Length, X-Request-ID")
        c.Header("Access-Control-Allow-Credentials", "true")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}

// SecurityHeadersMiddleware добавляет заголовки безопасности
func SecurityHeadersMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        c.Header("Content-Security-Policy", "default-src 'self'")

        c.Next()
    }
}
