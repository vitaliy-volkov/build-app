from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import time
import uuid
import structlog

from app.models.requests import EstimateAnalysisRequest
from app.models.responses import EstimateAnalysisResponse, ErrorResponse
from app.services.llm_service import LLMService
from app.core.monitoring import record_request, record_tokens_used

logger = structlog.get_logger()
router = APIRouter()

# Глобальные сервисы (в продакшене будут через DI)
llm_service = LLMService()


@router.post("/analyze", response_model=EstimateAnalysisResponse)
async def analyze_estimate(request: EstimateAnalysisRequest, http_request: Request):
    """Анализ строительной сметы с помощью AI"""
    start_time = time.time()
    
    try:
        # Проверка доступности кэша
        cache_service = getattr(http_request.app.state, 'cache', None)
        
        # Генерация ключа кэша
        cache_key = None
        if cache_service:
            cache_key = cache_service.generate_cache_key(
                str(request.estimate_id), 
                request.estimate_data
            )
            
            # Проверка кэша
            cached_result = await cache_service.get_cached_result(cache_key)
            if cached_result:
                logger.info("Returning cached estimate analysis", estimate_id=request.estimate_id)
                return EstimateAnalysisResponse(**cached_result)
        
        # Выполнение AI анализа
        logger.info("Starting estimate analysis", estimate_id=request.estimate_id)
        
        ai_result = await llm_service.analyze_estimate(
            request.estimate_data, 
            request.options
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Формирование ответа
        response_data = {
            "analysis_id": f"analysis-{uuid.uuid4().hex[:8]}",
            "overall_score": ai_result["parsed_result"].get("overall_score", 75.0),
            "risk_level": ai_result["parsed_result"].get("risk_level", "medium"),
            "risk_factors": ai_result["parsed_result"].get("risk_factors", []),
            "optimization_suggestions": ai_result["parsed_result"].get("optimization_suggestions", []),
            "market_comparison": ai_result["parsed_result"].get("market_comparison", {}),
            "recommendations": ai_result["parsed_result"].get("recommendations", []),
            "confidence": ai_result["parsed_result"].get("confidence", 0.8),
            "processing_time_ms": processing_time,
            "tokens_used": ai_result["tokens_used"]
        }
        
        # Сохранение в кэш
        if cache_service:
            await cache_service.set_cached_result(cache_key, response_data)
        
        # Запись метрик
        record_request(
            method="POST", 
            endpoint="/estimates/analyze", 
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
            "Estimate analysis completed",
            estimate_id=request.estimate_id,
            analysis_id=response_data["analysis_id"],
            processing_time_ms=processing_time,
            tokens_used=ai_result["tokens_used"]
        )
        
        return EstimateAnalysisResponse(**response_data)
        
    except ValueError as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        record_request(
            method="POST", 
            endpoint="/estimates/analyze", 
            status="client_error",
            duration=processing_time / 1000
        )
        
        logger.error("Invalid request for estimate analysis", error=str(e))
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
            endpoint="/estimates/analyze", 
            status="server_error",
            duration=processing_time / 1000
        )
        
        logger.error("Estimate analysis failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "AI_SERVICE_ERROR",
                "error_message": "AI сервис временно недоступен"
            }
        )


@router.get("/analysis/{analysis_id}")
async def get_analysis_status(analysis_id: str):
    """Получение статуса анализа сметы"""
    # В реальной реализации здесь будет проверка статуса в БД
    return {
        "analysis_id": analysis_id,
        "status": "completed",
        "created_at": "2024-01-01T12:00:00Z",
        "completed_at": "2024-01-01T12:01:30Z"
    }


@router.get("/health")
async def health_check():
    """Проверка здоровья сервиса анализа смет"""
    try:
        # Проверка доступности AI сервиса
        if not llm_service.openai_client:
            raise ValueError("OpenAI client not available")
            
        return {
            "status": "healthy",
            "service": "estimate-analysis",
            "ai_provider": "openai",
            "model": "gpt-4",
            "timestamp": "2024-01-01T12:00:00Z"
        }
    except Exception as e:
        logger.error("Estimate service health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={
                "error_code": "SERVICE_UNHEALTHY",
                "error_message": "Сервис анализа смет недоступен"
            }
        )
