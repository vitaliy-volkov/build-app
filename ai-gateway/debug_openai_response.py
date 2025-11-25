#!/usr/bin/env python3
"""
Отладочный скрипт для проверки формата ответов OpenAI
"""

import asyncio
import openai
import json
from app.config import settings

async def debug_openai_response():
    """Отладка реального ответа от OpenAI"""
    
    # Инициализация OpenAI клиента
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    
    # Тестовый промпт для анализа сметы
    prompt = """
Проанализируй строительную смету и предоставь экспертное заключение.

Данные сметы:
Название: Ремонт трехкомнатной квартиры
Общая стоимость: 2500000 руб.
Количество позиций: 8

Позиции сметы:
1. Демонтаж стен и перегородок - 150000 руб.
2. Возведение новых стен - 200000 руб.
3. Электромонтажные работы - 300000 руб.
4. Сантехнические работы - 250000 руб.
5. Черновая отделка - 400000 руб.
6. Чистовая отделка - 800000 руб.
7. Установка дверей - 180000 руб.
8. Кухонный гарнитур - 220000 руб.

Требования к анализу:
- Выяви потенциальные риски и проблемы
- Предложи способы оптимизации затрат
- Сравни с рыночными ценами
- Сгенерируй подробный отчет

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
    
    try:
        print("🔍 Отправка запроса к OpenAI...")
        response = await client.chat.completions.create(
            model=settings.default_model,
            messages=[
                {"role": "system", "content": "Ты - эксперт по строительным сметам с 20-летним опытом."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        print("✅ Ответ получен!")
        print(f"📊 Модель: {response.model}")
        print(f"🔢 Токенов использовано: {response.usage.total_tokens}")
        print(f"⏱️ Время обработки: {response.created}")
        
        # Получение текста ответа
        result_text = response.choices[0].message.content
        print(f"\n📝 Полный ответ от OpenAI:")
        print("=" * 50)
        print(result_text)
        print("=" * 50)
        
        # Попытка извлечь JSON
        print("\n🔍 Попытка извлечь JSON...")
        start = result_text.find('{')
        end = result_text.rfind('}') + 1
        
        if start != -1 and end != -1:
            json_str = result_text[start:end]
            print(f"📦 Извлеченный JSON:")
            print("-" * 30)
            print(json_str)
            print("-" * 30)
            
            try:
                parsed_json = json.loads(json_str)
                print(f"\n✅ JSON успешно распарсен!")
                print(f"📊 Структура данных:")
                for key, value in parsed_json.items():
                    print(f"  {key}: {type(value)} = {value}")
            except json.JSONDecodeError as e:
                print(f"\n❌ Ошибка парсинга JSON: {e}")
                print(f"📍 Проблема в символах: {json_str[max(0, e.pos-20):e.pos+20]}")
        else:
            print("❌ Не удалось найти JSON в ответе")
            
    except Exception as e:
        print(f"❌ Ошибка запроса к OpenAI: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_openai_response())
