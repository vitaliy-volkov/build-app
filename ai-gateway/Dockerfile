# Production-ready AI Gateway Dockerfile
FROM python:3.11-slim AS builder

# Установка рабочей директории
WORKDIR /build

# Установка системных зависимостей для сборки
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Копирование и установка Python зависимостей
COPY requirements.txt .
RUN pip install --user --no-cache-dir --compile -r requirements.txt

# Финальная стадия - минимальный образ
FROM python:3.11-slim

# Установка рабочей директории
WORKDIR /app

# Установка runtime системных зависимостей
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Создание non-root пользователя
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/bash -m appuser

# Копирование установленных пакетов из builder
COPY --from=builder /root/.local /home/appuser/.local

# Обновление PATH для пользовательских пакетов
ENV PATH=/home/appuser/.local/bin:$PATH

# Копирование приложения
COPY app/ ./app/

# Создание необходимых директорий
RUN mkdir -p /app/logs /app/cache /app/uploads && \
    chown -R appuser:appgroup /app

# Переключение на непривилегированного пользователя
USER appuser

# Переменные окружения
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV UVICORN_PORT=8000
ENV UVICORN_HOST=0.0.0.0
ENV UVICORN_WORKERS=1

# Экспорт порта
EXPOSE 8000

# Улучшенный health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || \
        wget --no-verbose --tries=1 --spider http://localhost:8000/health || \
        exit 1

# Labels для метаданных
LABEL maintainer="Stroy-Control AI Team"
LABEL version="1.0"
LABEL description="AI Gateway for Stroy Control - Production Ready"
LABEL ai-service="true"

# Использование dumb-init для правильной обработки сигналов
ENTRYPOINT ["dumb-init", "--"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
