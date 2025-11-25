#!/usr/bin/env python3
"""
Отладочный скрипт для LLM сервиса
"""

import asyncio
import json
from app.services.llm_service import LLMService

async def debug_llm_service():
    """Отладка LLM сервиса"""
    
    llm_service = LLMService()
    
    print(f"🔍 Mock режим: {llm_service.mock_mode}")
    print(f"🔍 OpenAI клиент: {'есть' if llm_service.openai_client else 'нет'}")
    
    # Тестовые данные
    estimate_data = {
        "name": "Тестовый ремонт",
        "total_cost": 800000,
        "items": [{"name": "Базовые работы", "cost": 800000, "unit": "компл"}]
    }
    
    options = {"check_risks": True}
    
    try:
        print("\n🚀 Вызов analyze_estimate...")
        result = await llm_service.analyze_estimate(estimate_data, options)
        
        print("✅ Ответ получен!")
        print(f"📊 Провайдер: {result['provider']}")
        print(f"🔢 Токены: {result['tokens_used']}")
        print(f"📝 Сырой ответ (первые 500 символов):")
        print("-" * 40)
        print(result['raw_response'][:500])
        print("-" * 40)
        
        print(f"\n📦 Распарсенный результат:")
        print("-" * 40)
        parsed = result['parsed_result']
        for key, value in parsed.items():
            print(f"{key}: {type(value)} = {value}")
        print("-" * 40)
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_llm_service())
