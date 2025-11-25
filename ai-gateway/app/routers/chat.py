from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import time
import uuid
import structlog

from app.models.requests import ChatRequest
from app.models.responses import ChatResponse, ErrorResponse
from app.services.llm_service import LLMService
from app.core.monitoring import record_request, record_tokens_used

logger = structlog.get_logger()
router = APIRouter()

# Глобальные сервисы
llm_service = LLMService()


@router.post("/assistant", response_model=ChatResponse)
async def chat_assistant(request: ChatRequest, http_request: Request):
    """Чат с AI ассистентом"""
    start_time = time.time()
    
    try:
        # Генерация session_id если не предоставлен
        session_id = request.session_id or f"session-{uuid.uuid4().hex[:8]}"
        
        # Проверка кэша
        cache_service = getattr(http_request.app.state, 'cache', None)
        cache_key = None
        
        if cache_service:
            cache_key = cache_service.generate_cache_key(
                request.message,
                request.context or {}
            )
            
            # Для чата не используем кэш для уникальных ответов
        
        logger.info("Processing chat request", session_id=session_id)
        
        # Выполнение запроса к AI
        ai_result = await llm_service.chat_assistant(
            request.message,
            request.context or {}
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Формирование ответа
        response_data = {
            "response": ai_result["response"],
            "session_id": session_id,
            "suggestions": _generate_suggestions(request.message),
            "context_used": list(request.context.keys()) if request.context else [],
            "confidence": 0.85,  # Базовая уверенность для чата
            "processing_time_ms": processing_time,
            "tokens_used": ai_result["tokens_used"]
        }
        
        # Запись метрик
        record_request(
            method="POST",
            endpoint="/chat/assistant",
            status="success",
            duration=processing_time / 1000,
            ai_provider=ai_result["provider"]
        )
        record_tokens_used(
            ai_result["provider"],
            ai_result["model"],
            ai_result["tokens_used"]
        )
        
        logger.info(
            "Chat request completed",
            session_id=session_id,
            processing_time_ms=processing_time,
            tokens_used=ai_result["tokens_used"]
        )
        
        return ChatResponse(**response_data)
        
    except ValueError as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        record_request(
            method="POST",
            endpoint="/chat/assistant",
            status="client_error",
            duration=processing_time / 1000
        )
        
        logger.error("Invalid chat request", error=str(e))
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "INVALID_REQUEST",
                "error_message": str(e)
            }
        )
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        record_request(
            method="POST",
            endpoint="/chat/assistant",
            status="server_error",
            duration=processing_time / 1000
        )
        
        logger.error("Chat request failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "AI_SERVICE_ERROR",
                "error_message": "AI ассистент временно недоступен"
            }
        )


@router.get("/sessions/{session_id}/history")
async def get_chat_history(session_id: str, limit: int = 50):
    """Получение истории чата"""
    # В реальной реализации здесь будет получение истории из БД
    return {
        "session_id": session_id,
        "messages": [
            {
                "id": "msg-1",
                "role": "user",
                "content": "Привет! Как рассчитать стоимость ремонта?",
                "timestamp": "2024-01-01T12:00:00Z"
            },
            {
                "id": "msg-2", 
                "role": "assistant",
                "content": "Здравствуйте! Для расчета стоимости ремонта необходимо...",
                "timestamp": "2024-01-01T12:00:05Z"
            }
        ],
        "total_messages": 2
    }


@router.delete("/sessions/{session_id}")
async def clear_chat_session(session_id: str):
    """Очистка сессии чата"""
    # В реальной реализации здесь будет очистка истории в БД
    return {
        "session_id": session_id,
        "status": "cleared",
        "timestamp": "2024-01-01T12:00:00Z"
    }


@router.get("/health")
async def health_check():
    """Проверка здоровья чат сервиса"""
    try:
        if not llm_service.openai_client:
            raise ValueError("OpenAI client not available")
            
        return {
            "status": "healthy",
            "service": "chat-assistant",
            "ai_provider": "openai",
            "model": "gpt-3.5-turbo",
            "timestamp": "2024-01-01T12:00:00Z"
        }
    except Exception as e:
        logger.error("Chat service health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "SERVICE_UNHEALTHY",
                "error_message": "Чат сервис недоступен"
            }
        )


def _generate_suggestions(message: str) -> list:
    """Генерация предложений по дальнейшим вопросам"""
    message_lower = message.lower()
    
    suggestions = []
    
    if "смета" in message_lower or "стоимость" in message_lower:
        suggestions.extend([
            "Как оптимизировать расходы на материалы?",
            "Какие факторы влияют на стоимость работ?"
        ])
    
    if "ремонт" in message_lower:
        suggestions.extend([
            "Какие этапы включает ремонт квартиры?",
            "Как выбрать подрядчика для ремонта?"
        ])
    
    if "риск" in message_lower or "проблема" in message_lower:
        suggestions.extend([
            "Как минимизировать риски при строительстве?",
            "Частые проблемы в ремонте и их решения"
        ])
    
    # Если нет специфических предложений, добавляем общие
    if not suggestions:
        suggestions = [
            "Как рассчитать бюджет на проект?",
            "Какие документы нужны для строительства?",
            "Как контролировать качество работ?"
        ]
    
    return suggestions[:3]  # Ограничиваем 3 предложениями
