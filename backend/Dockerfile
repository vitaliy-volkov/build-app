# Multi-stage build для production оптимизации и безопасности
FROM golang:1.22-alpine AS builder

# Установка необходимых пакетов
RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev

# Создание рабочей директории
WORKDIR /build

# Копирование go mod файлов
COPY go.mod go.sum ./

# Загрузка зависимостей (кэширование слоя)
RUN go mod download

# Копирование исходного кода
COPY . .

# Сборка приложения с production оптимизацией
RUN CGO_ENABLED=1 CGO_CFLAGS_ALLOW=".*" \
    GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix cgo \
    -ldflags="-w -s -buildid='' -extldflags '-static'" \
    -o server cmd/server/main.go

# Проверка сборки
RUN chmod +x server && ./server --version 2>/dev/null || true

# Финальная стадия - минимальный образ
FROM alpine:3.18

# Установка ca-certificates для HTTPS запросов и curl для health checks
RUN apk --no-cache add ca-certificates tzdata curl dumb-init

# Создание системного пользователя для безопасности
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -s /bin/sh -D appuser

# Создание необходимых директорий с правильными правами
RUN mkdir -p /app/uploads /app/logs /app/config /app/backups && \
    chown -R appuser:appgroup /app

# Переключение в рабочую директорию
WORKDIR /app

# Копирование только необходимых файлов из builder
COPY --from=builder /build/server .
COPY --chown=appuser:appgroup config/ ./config/
COPY --chown=appuser:appgroup migrations/ ./migrations/

# Установка прав доступа на бинарник
RUN chmod +x server && \
    strip server 2>/dev/null || true

# Переключение на непривилегированного пользователя
USER appuser

# Настройка переменных окружения
ENV APP_ENV=production
ENV GIN_MODE=release
ENV GOGC=off

# Healthcheck с улучшенной проверкой
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || \
      wget --no-verbose --tries=1 --spider http://localhost:8080/health || \
      exit 1

# Экспорт портов
EXPOSE 8080 9090

# Labels для метаданных
LABEL maintainer="Stroy-Control Team"
LABEL version="1.0"
LABEL description="Stroy Control Backend - Production Ready"

# Использование dumb-init для правильной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]
CMD ["./server"]