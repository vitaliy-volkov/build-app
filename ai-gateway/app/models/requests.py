from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class EstimateAnalysisRequest(BaseModel):
    """Запрос на анализ сметы"""
    estimate_id: str = Field(..., description="ID сметы")
    estimate_data: Dict[str, Any] = Field(..., description="Данные сметы")
    options: Optional[Dict[str, Any]] = Field(
        default={
            "check_risks": True,
            "optimize_costs": True,
            "generate_report": True,
            "market_comparison": True
        },
        description="Опции анализа"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "estimate_id": "est-123",
                "estimate_data": {
                    "name": "Ремонт квартиры",
                    "total_cost": 1500000,
                    "items": [
                        {
                            "name": "Демонтаж стен",
                            "cost": 50000,
                            "unit": "м2"
                        }
                    ]
                },
                "options": {
                    "check_risks": True,
                    "optimize_costs": True
                }
            }
        }


class ChatRequest(BaseModel):
    """Запрос к чат-ассистенту"""
    message: str = Field(..., min_length=1, max_length=4000, description="Сообщение пользователя")
    session_id: Optional[str] = Field(None, description="ID сессии чата")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Контекст запроса")
    project_id: Optional[str] = Field(None, description="ID проекта (если применимо)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Как рассчитать стоимость ремонта кухни?",
                "session_id": "chat-123",
                "context": {
                    "user_role": "project_manager",
                    "project_type": "residential"
                },
                "project_id": "proj-456"
            }
        }


class VisionAnalysisRequest(BaseModel):
    """Запрос на анализ изображения"""
    image_url: Optional[str] = Field(None, description="URL изображения")
    image_base64: Optional[str] = Field(None, description="Base64 изображение")
    analysis_type: str = Field(..., description="Тип анализа: defect_detection, measurement, quality_check")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Контекст анализа")
    
    class Config:
        json_schema_extra = {
            "example": {
                "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
                "analysis_type": "defect_detection",
                "context": {
                    "project_phase": "construction",
                    "location": "wall_surface"
                }
            }
        }


class RiskPredictionRequest(BaseModel):
    """Запрос на прогнозирование рисков"""
    project_id: str = Field(..., description="ID проекта")
    project_data: Dict[str, Any] = Field(..., description="Данные проекта")
    analysis_type: str = Field(default="comprehensive", description="Тип анализа")
    time_horizon: Optional[int] = Field(default=90, description="Горизонт прогнозирования в днях")
    
    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "proj-789",
                "project_data": {
                    "name": "Строительство дома",
                    "budget": 5000000,
                    "timeline": "6 месяцев",
                    "location": "Москва",
                    "team_size": 10
                },
                "analysis_type": "comprehensive",
                "time_horizon": 90
            }
        }
