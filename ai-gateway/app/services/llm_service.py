import openai
import httpx
import json
import asyncio
import structlog
from typing import Dict, Any, Optional, List
from app.config import settings

logger = structlog.get_logger()


class LLMService:
    """Сервис для работы с LLM провайдерами"""
    
    def __init__(self):
        self.openai_client = None
        self.mock_mode = False
        self._init_openai()
        
    def _init_openai(self):
        """Инициализация OpenAI клиента"""
        if settings.openai_api_key and not settings.openai_api_key.startswith("sk-test"):
            self.openai_client = openai.AsyncOpenAI(
                api_key=settings.openai_api_key
            )
            logger.info("OpenAI client initialized")
        else:
            logger.warning("Using mock mode - set real OpenAI API key in .env")
            self.mock_mode = True
            # Импорт mock сервиса
            from app.services.mock_llm_service import MockLLMService
            self.mock_service = MockLLMService()
            
    async def analyze_estimate(self, estimate_data: Dict[str, Any], options: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ сметы с помощью OpenAI или mock"""
        if self.mock_mode:
            return await self.mock_service.analyze_estimate(estimate_data, options)
            
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
            
        prompt = self._build_estimate_prompt(estimate_data, options)
        
        try:
            response = await self.openai_client.chat.completions.create(
                model=settings.default_model,
                messages=[
                    {"role": "system", "content": "Ты - эксперт по строительным сметам с 20-летним опытом."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=options.get("max_tokens", settings.max_tokens_per_request),
                temperature=settings.temperature
            )
            
            result_text = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            # Парсинг ответа в структурированный формат
            parsed_result = self._parse_estimate_analysis(result_text)
            
            return {
                "raw_response": result_text,
                "parsed_result": parsed_result,
                "tokens_used": tokens_used,
                "model": settings.default_model,
                "provider": "openai"
            }
            
        except Exception as e:
            logger.error("OpenAI estimate analysis failed", error=str(e))
            raise
            
    async def chat_assistant(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Чат-ассистент"""
        if self.mock_mode:
            return await self.mock_service.chat_assistant(message, context)
            
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
            
        system_prompt = self._build_chat_system_prompt(context)
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",  # Более быстрая модель для чата
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            result_text = response.choices[0].message.content
            tokens_used = response.usage.total_tokens
            
            return {
                "response": result_text,
                "tokens_used": tokens_used,
                "model": "gpt-3.5-turbo",
                "provider": "openai"
            }
            
        except Exception as e:
            logger.error("OpenAI chat failed", error=str(e))
            raise
            
    def _build_estimate_prompt(self, estimate_data: Dict[str, Any], options: Dict[str, Any]) -> str:
        """Построение промпта для анализа сметы"""
        prompt = f"""
Проанализируй строительную смету и предоставь экспертное заключение.

Данные сметы:
Название: {estimate_data.get('name', 'Без названия')}
Общая стоимость: {estimate_data.get('total_cost', 0)} руб.
Количество позиций: {len(estimate_data.get('items', []))}

Позиции сметы:
"""
        
        for i, item in enumerate(estimate_data.get('items', [])[:10], 1):  # Ограничим для экономии токенов
            prompt += f"{i}. {item.get('name', 'Без названия')} - {item.get('cost', 0)} руб.\n"
            
        prompt += f"""

Требования к анализу:
"""
        
        if options.get("check_risks"):
            prompt += "- Выяви потенциальные риски и проблемы\n"
        if options.get("optimize_costs"):
            prompt += "- Предложи способы оптимизации затрат\n"
        if options.get("market_comparison"):
            prompt += "- Сравни с рыночными ценами\n"
        if options.get("generate_report"):
            prompt += "- Сгенерируй подробный отчет\n"
            
        prompt += """

Формат ответа (JSON):
{
    "overall_score": 85.5,
    "risk_level": "medium",
    "risk_factors": ["фактор1", "фактор2"],
    "optimization_suggestions": [
        {"type": "material", "description": "описание", "savings": 50000, "impact": "medium"}
    ],
    "market_comparison": {
        "average_price": 1600000,
        "your_price": 1500000,
        "deviation": -6.25,
        "market_insight": "анализ рынка"
    },
    "recommendations": ["рекомендация1", "рекомендация2"],
    "confidence": 0.87
}

Проанализируй смету и верни JSON.
"""
        return prompt
        
    def _build_chat_system_prompt(self, context: Dict[str, Any]) -> str:
        """Построение системного промпта для чата"""
        base_prompt = "Ты - AI ассистент для строительной компании 'Строй-Контроль'. "
        
        if context.get("user_role") == "project_manager":
            base_prompt += "Ты помогаешь руководителю проектов управлять строительными проектами. "
        elif context.get("user_role") == "foreman":
            base_prompt += "Ты помогаешь прорабу решать оперативные вопросы на стройплощадке. "
        elif context.get("user_role") == "estimator":
            base_prompt += "Ты помогаешь сметчику рассчитывать и оптимизировать сметы. "
        else:
            base_prompt += "Ты помогаешь сотрудникам строительной компании. "
            
        base_prompt += """
Отвечай кратко, по делу, с учетом специфики строительства.
Используй профессиональную лексику, но объясняй сложные термины.
При предоставлении советов учитывай безопасность и нормативы.
"""
        return base_prompt
        
    def _parse_estimate_analysis(self, response_text: str) -> Dict[str, Any]:
        """Парсинг ответа от AI"""
        try:
            # Попытка извлечь JSON из ответа
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            
            if start != -1 and end != -1:
                json_str = response_text[start:end]
                parsed_data = json.loads(json_str)
                
                # Конвертация типов данных для соответствия Pydantic моделям
                normalized_data = self._normalize_response_data(parsed_data)
                return normalized_data
            else:
                # Если не удалось извлечь JSON, возвращаем базовую структуру
                return {
                    "overall_score": 75.0,
                    "risk_level": "medium",
                    "risk_factors": ["Не удалось структурировать анализ"],
                    "optimization_suggestions": [],
                    "market_comparison": {},
                    "recommendations": ["Требуется ручной анализ"],
                    "confidence": 0.5
                }
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI response as JSON", response_text=response_text[:200])
            return {
                "overall_score": 70.0,
                "risk_level": "medium",
                "risk_factors": ["Ошибка парсинга AI ответа"],
                "optimization_suggestions": [],
                "market_comparison": {},
                "recommendations": ["Требуется проверка AI ответа"],
                "confidence": 0.3
            }
    
    def _normalize_response_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Нормализация данных ответа для соответствия Pydantic моделям"""
        normalized = {}
        
        # overall_score - должен быть float
        if "overall_score" in data:
            try:
                normalized["overall_score"] = float(data["overall_score"])
            except (ValueError, TypeError):
                normalized["overall_score"] = 75.0
        else:
            normalized["overall_score"] = 75.0
        
        # risk_level - должен быть string
        if "risk_level" in data and isinstance(data["risk_level"], str):
            normalized["risk_level"] = data["risk_level"]
        else:
            normalized["risk_level"] = "medium"
        
        # risk_factors - должен быть list of strings
        if "risk_factors" in data and isinstance(data["risk_factors"], list):
            normalized["risk_factors"] = [str(item) for item in data["risk_factors"]]
        else:
            normalized["risk_factors"] = []
        
        # optimization_suggestions - должен быть list с правильной структурой
        if "optimization_suggestions" in data and isinstance(data["optimization_suggestions"], list):
            normalized_suggestions = []
            for suggestion in data["optimization_suggestions"]:
                if isinstance(suggestion, dict):
                    normalized_suggestion = {
                        "type": str(suggestion.get("type", "unknown")),
                        "description": str(suggestion.get("description", "")),
                        "savings": self._convert_to_float(suggestion.get("savings", 0)),
                        "impact": str(suggestion.get("impact", "medium"))
                    }
                    normalized_suggestions.append(normalized_suggestion)
            normalized["optimization_suggestions"] = normalized_suggestions
        else:
            normalized["optimization_suggestions"] = []
        
        # market_comparison - должен быть dict с правильными типами
        if "market_comparison" in data and isinstance(data["market_comparison"], dict):
            comparison = data["market_comparison"]
            normalized["market_comparison"] = {
                "average_price": self._convert_to_float(comparison.get("average_price", 0)),
                "your_price": self._convert_to_float(comparison.get("your_price", 0)),
                "deviation": self._convert_to_float(comparison.get("deviation", 0)),
                "market_insight": str(comparison.get("market_insight", ""))
            }
        else:
            normalized["market_comparison"] = {}
        
        # recommendations - должен быть list of strings
        if "recommendations" in data and isinstance(data["recommendations"], list):
            normalized["recommendations"] = [str(item) for item in data["recommendations"]]
        else:
            normalized["recommendations"] = []
        
        # confidence - должен быть float
        if "confidence" in data:
            try:
                normalized["confidence"] = float(data["confidence"])
            except (ValueError, TypeError):
                normalized["confidence"] = 0.8
        else:
            normalized["confidence"] = 0.8
        
        return normalized
    
    def _convert_to_float(self, value: Any) -> float:
        """Конвертация значения в float с обработкой ошибок"""
        try:
            if isinstance(value, str):
                if value.lower() in ["unknown", "n/a", "н/д"]:
                    return 0.0
                return float(value.replace(",", "").replace(" ", ""))
            return float(value)
        except (ValueError, TypeError):
            return 0.0
