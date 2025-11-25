import json
import time
import uuid
import asyncio
import structlog
from typing import Dict, Any

logger = structlog.get_logger()


class MockLLMService:
    """Mock LLM сервис для демонстрации без реального API ключа"""
    
    def __init__(self):
        self.mock_responses = {
            "estimate_analysis": {
                "overall_score": 85.5,
                "risk_level": "medium",
                "risk_factors": [
                    "Возможные задержки поставок материалов",
                    "Сезонные колебания цен на стройматериалы",
                    "Сложность выполнения работ в старом фонде"
                ],
                "optimization_suggestions": [
                    {
                        "type": "material",
                        "description": "Замена дорогой плитки на аналогичную российского производства",
                        "savings": 75000,
                        "impact": "medium",
                        "category": "materials"
                    },
                    {
                        "type": "labor",
                        "description": "Оптимизация графика работ для сокращения простоев",
                        "savings": 50000,
                        "impact": "low",
                        "category": "labor"
                    }
                ],
                "market_comparison": {
                    "average_price": 1650000,
                    "your_price": 1500000,
                    "deviation": -9.1,
                    "market_insight": "Ваша смета ниже средней по рынку на 9%, что хорошо для конкурентоспособности"
                },
                "recommendations": [
                    "Проверить наличие альтернативных поставщиков материалов",
                    "Создать резерв времени 10% от общего срока",
                    "Рассмотреть возможность закупки материалов в низкий сезон"
                ],
                "confidence": 0.87
            },
            "chat_responses": {
                "ремонт": "Для расчета стоимости ремонта квартиры необходимо учесть: 1) Площадь помещения, 2) Состояние стен и пола, 3) Тип отделки, 4) Стоимость материалов. Средняя стоимость ремонта под ключ - 15 000-25 000 руб/м².",
                "смета": "Смета включает прямые затраты (материалы, работа), накладные расходы (10-15%) и прибыль (8-12%). Рекомендую добавить резерв 5-7% на непредвиденные расходы.",
                "риск": "Основные риски в строительстве: задержки поставок, рост цен, некачественные работы. Для минимизации - заключайте договоры с фиксированными ценами и проверяйте подрядчиков."
            }
        }
    
    async def analyze_estimate(self, estimate_data: Dict[str, Any], options: Dict[str, Any]) -> Dict[str, Any]:
        """Mock анализ сметы"""
        logger.info("Mock estimate analysis", estimate_id=estimate_data.get('name', 'unknown'))
        
        # Имитация времени обработки
        await self._simulate_processing_time(1.0, 2.0)
        
        # Адаптация ответа под данные сметы
        mock_result = self.mock_responses["estimate_analysis"].copy()
        
        # Корректировка оценки на основе стоимости
        total_cost = estimate_data.get('total_cost', 0)
        if total_cost > 2000000:
            mock_result["risk_factors"].append("Высокая стоимость проекта требует дополнительного контроля")
            mock_result["overall_score"] = min(mock_result["overall_score"], 78.0)
        elif total_cost < 500000:
            mock_result["overall_score"] = max(mock_result["overall_score"], 90.0)
            mock_result["risk_level"] = "low"
        
        # Расчет экономии на основе количества позиций
        items_count = len(estimate_data.get('items', []))
        if items_count > 10:
            additional_savings = {
                "type": "optimization",
                "description": "Объединение похожих работ для экономии",
                "savings": items_count * 2500,
                "impact": "medium",
                "category": "optimization"
            }
            mock_result["optimization_suggestions"].append(additional_savings)
        
        return {
            "raw_response": json.dumps(mock_result, ensure_ascii=False),
            "parsed_result": mock_result,
            "tokens_used": 850,
            "model": "mock-gpt-4",
            "provider": "mock"
        }
    
    async def chat_assistant(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Mock чат-ассистент"""
        logger.info("Mock chat assistant", message=message[:50])
        
        # Имитация времени обработки
        await self._simulate_processing_time(0.5, 1.5)
        
        # Поиск релевантного ответа
        message_lower = message.lower()
        response = self._get_mock_response(message_lower)
        
        # Добавление контекстуализации
        if context.get("user_role") == "project_manager":
            response += "\n\nКак руководителю проекта, рекомендую обратить внимание на планирование ресурсов и контроль сроков."
        elif context.get("user_role") == "foreman":
            response += "\n\nНа объекте следите за качеством выполнения работ и своевременной поставкой материалов."
        
        return {
            "response": response,
            "tokens_used": 420,
            "model": "mock-gpt-3.5-turbo",
            "provider": "mock"
        }
    
    def _get_mock_response(self, message: str) -> str:
        """Получение mock ответа на основе ключевых слов"""
        for keyword, response in self.mock_responses["chat_responses"].items():
            if keyword in message:
                return response
        
        # Ответ по умолчанию
        return (
            "Спасибо за ваш вопрос! Я AI ассистент для строительной компании 'Строй-Контроль'. "
            "Я могу помочь с расчетом смет, анализом рисков, оптимизацией затрат и другими вопросами "
            "в области строительства. Пожалуйста, уточните ваш вопрос, и я предоставлю подробную консультацию."
        )
    
    async def _simulate_processing_time(self, min_seconds: float, max_seconds: float):
        """Имитация времени обработки AI запроса"""
        processing_time = min_seconds + (max_seconds - min_seconds) * 0.7
        await asyncio.sleep(processing_time)
