from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class BaseResponse(BaseModel):
    """Базовый ответ API"""
    success: bool = Field(True, description="Успешность операции")
    message: Optional[str] = Field(None, description="Сообщение")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Время ответа")


class EstimateAnalysisResponse(BaseResponse):
    """Ответ на анализ сметы"""
    analysis_id: str = Field(..., description="ID анализа")
    overall_score: float = Field(..., ge=0, le=100, description="Общая оценка")
    risk_level: str = Field(..., description="Уровень риска: low, medium, high")
    risk_factors: List[str] = Field(default=[], description="Факторы риска")
    optimization_suggestions: List[Dict[str, Any]] = Field(default=[], description="Предложения по оптимизации")
    market_comparison: Dict[str, Any] = Field(default={}, description="Сравнение с рынком")
    recommendations: List[str] = Field(default=[], description="Рекомендации")
    confidence: float = Field(..., ge=0, le=1, description="Уверенность AI")
    processing_time_ms: int = Field(..., description="Время обработки в мс")
    tokens_used: int = Field(..., description="Использовано токенов")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "analysis_id": "analysis-123",
                "overall_score": 85.5,
                "risk_level": "medium",
                "risk_factors": [
                    "Возможные задержки поставок",
                    "Сезонные колебания цен"
                ],
                "optimization_suggestions": [
                    {
                        "type": "material",
                        "description": "Замена плитки на аналог",
                        "savings": 50000,
                        "impact": "medium"
                    }
                ],
                "market_comparison": {
                    "average_price": 1600000,
                    "your_price": 1500000,
                    "deviation": -6.25
                },
                "recommendations": [
                    "Проверить альтернативные поставщики",
                    "Создать резерв времени"
                ],
                "confidence": 0.87,
                "processing_time_ms": 1250,
                "tokens_used": 850
            }
        }


class ChatResponse(BaseResponse):
    """Ответ чат-ассистента"""
    response: str = Field(..., description="Ответ ассистента")
    session_id: str = Field(..., description="ID сессии")
    suggestions: List[str] = Field(default=[], description="Предложения по дальнейшим вопросам")
    context_used: List[str] = Field(default=[], description="Использованный контекст")
    confidence: float = Field(..., ge=0, le=1, description="Уверенность ответа")
    processing_time_ms: int = Field(..., description="Время обработки в мс")
    tokens_used: int = Field(..., description="Использовано токенов")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "response": "Для расчета стоимости ремонта кухни необходимо учесть...",
                "session_id": "chat-123",
                "suggestions": [
                    "Как рассчитать стоимость материалов?",
                    "Какие работы включены в ремонт?"
                ],
                "context_used": ["user_role", "project_type"],
                "confidence": 0.92,
                "processing_time_ms": 800,
                "tokens_used": 420
            }
        }


class VisionAnalysisResponse(BaseResponse):
    """Ответ на анализ изображения"""
    analysis_id: str = Field(..., description="ID анализа")
    detected_objects: List[Dict[str, Any]] = Field(default=[], description="Обнаруженные объекты")
    defects: List[Dict[str, Any]] = Field(default=[], description="Обнаруженные дефекты")
    measurements: List[Dict[str, Any]] = Field(default=[], description="Измерения")
    quality_score: Optional[float] = Field(None, description="Оценка качества")
    annotations: List[Dict[str, Any]] = Field(default=[], description="Аннотации")
    confidence: float = Field(..., ge=0, le=1, description="Уверенность анализа")
    processing_time_ms: int = Field(..., description="Время обработки в мс")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "analysis_id": "vision-456",
                "detected_objects": [
                    {
                        "type": "crack",
                        "confidence": 0.95,
                        "location": {"x": 120, "y": 80, "width": 45, "height": 3}
                    }
                ],
                "defects": [
                    {
                        "type": "structural_crack",
                        "severity": "medium",
                        "description": "Трещина в стене",
                        "recommendation": "Заделать трещину и укрепить стену"
                    }
                ],
                "quality_score": 78.5,
                "confidence": 0.91,
                "processing_time_ms": 2100
            }
        }


class RiskPredictionResponse(BaseResponse):
    """Ответ на прогнозирование рисков"""
    prediction_id: str = Field(..., description="ID прогноза")
    risk_score: float = Field(..., ge=0, le=100, description="Общая оценка риска")
    risk_level: str = Field(..., description="Уровень риска")
    identified_risks: List[Dict[str, Any]] = Field(default=[], description="Выявленные риски")
    mitigation_strategies: List[Dict[str, Any]] = Field(default=[], description="Стратегии митигации")
    probability_timeline: Dict[str, float] = Field(default={}, description="Вероятность по времени")
    impact_assessment: Dict[str, Any] = Field(default={}, description="Оценка влияния")
    confidence: float = Field(..., ge=0, le=1, description="Уверенность прогноза")
    processing_time_ms: int = Field(..., description="Время обработки в мс")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "prediction_id": "risk-789",
                "risk_score": 65.0,
                "risk_level": "medium",
                "identified_risks": [
                    {
                        "type": "supply_delay",
                        "probability": 0.7,
                        "impact": "high",
                        "description": "Задержка поставки материалов"
                    }
                ],
                "mitigation_strategies": [
                    {
                        "risk_type": "supply_delay",
                        "strategy": "diversify_suppliers",
                        "effectiveness": 0.8
                    }
                ],
                "probability_timeline": {
                    "week_1": 0.1,
                    "week_2": 0.3,
                    "week_3": 0.6
                },
                "confidence": 0.84,
                "processing_time_ms": 1500
            }
        }


class ErrorResponse(BaseResponse):
    """Ответ с ошибкой"""
    success: bool = Field(False, description="Успешность операции")
    error_code: str = Field(..., description="Код ошибки")
    error_message: str = Field(..., description="Сообщение об ошибке")
    details: Optional[Dict[str, Any]] = Field(None, description="Детали ошибки")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error_code": "AI_SERVICE_UNAVAILABLE",
                "error_message": "AI сервис временно недоступен",
                "details": {
                    "provider": "openai",
                    "retry_after": 60
                }
            }
        }
