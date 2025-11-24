/**
 * Конфигурация AI для управления платежами в строительной компании
 * Экспертный уровень настройки с возможностью полной кастомизации
 */

export interface AIPaymentConfig {
  // Общие настройки
  enabled: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  
  // Настройки валидации платежей
  validation: {
    enabled: boolean;
    strictMode: boolean;
    riskThresholds: {
      low: number;      // 0-25
      medium: number;   // 26-50
      high: number;     // 51-75
      critical: number; // 76-100
    };
    customRules: string[];
  };
  
  // Настройки рекомендаций
  recommendations: {
    enabled: boolean;
    includeCashFlowAnalysis: boolean;
    includeHistoricalData: boolean;
    includeSupplierAnalysis: boolean;
    customFactors: string[];
  };
  
  // Промты для различных сценариев
  prompts: {
    // Валидация платежа
    paymentValidation: string;
    
    // Анализ рисков
    riskAnalysis: string;
    
    // Рекомендации по оптимизации
    optimizationRecommendations: string;
    
    // Прогнозирование кэшфлоу
    cashFlowForecast: string;
    
    // Анализ поставщиков
    supplierAnalysis: string;
    
    // Проектная аналитика
    projectAnalytics: string;
  };
  
  // Бизнес-правила строительной компании
  businessRules: {
    // Лимиты по ролям
    roleLimits: {
      Director: number;
      ProjectManager: number;
      Foreman: number;
      Estimator: number;
      SupplyManager: number;
    };
    
    // Ограничения по типам операций
    operationLimits: {
      maxSinglePayment: number;
      maxDailyTotal: number;
      maxAccountabilityAmount: number;
      advancePaymentPercentage: number;
    };
    
    // Правила для контрагентов
    counterpartyRules: {
      requirePrepaymentForSuppliers: boolean;
      maxDebtToSuppliers: number;
      paymentTerms: {
        standard: number; // дней
        urgent: number;   // дней
        critical: number; // дней
      };
    };
    
    // Проектные правила
    projectRules: {
      maxBudgetUtilization: number; // %
      requireApprovalForLargeExpenses: number; // ₽
      minProfitMargin: number; // %
    };
  };
}

// Настройки по умолчанию
export const defaultAIPaymentConfig: AIPaymentConfig = {
  enabled: true,
  model: 'gemini-1.5-flash',
  temperature: 0.3,
  maxTokens: 2000,
  
  validation: {
    enabled: true,
    strictMode: false,
    riskThresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 100
    },
    customRules: []
  },
  
  recommendations: {
    enabled: true,
    includeCashFlowAnalysis: true,
    includeHistoricalData: true,
    includeSupplierAnalysis: true,
    customFactors: []
  },
  
  prompts: {
    // Промт для валидации платежа
    paymentValidation: `
Ты - финансовый аналитик строительной компании. Проанализируй предложенный платеж и оцени его риски.

Контекст:
- Компания: Строительная организация
- Специфика: Работа с договорами, поставщиками материалов, субподрядчиками
- Бизнес-модель: Проектное финансирование, авансовые платежи, поэтапная оплата

Параметры платежа:
- Тип: {type}
- Сумма: {amount} ₽
- Дата: {date}
- Описание: {description}
- Проект: {project}
- Контрагент: {counterparty}
- Счет: {account}

Дополнительные данные:
- Текущий баланс кэшфлоу: {currentBalance} ₽
- Исторические платежи: {historicalPayments}
- Бюджеты проектов: {projectBudgets}

Проанализируй платеж по следующим критериям:
1. Финансовая состоятельность (достаточность средств)
2. Соответствие бизнес-процессам строительной компании
3. Риски для кэшфлоу
4. Сезонные факторы строительного рынка
5. История работы с контрагентом
6. Соответствие бюджету проекта

Верни результат в формате JSON:
{
  "isValid": true/false,
  "score": 0-100,
  "errors": ["ошибка1", "ошибка2"],
  "warnings": ["предупреждение1", "предупреждение2"],
  "riskFactors": ["риск1", "риск2"],
  "recommendations": ["рекомендация1", "рекомендация2"],
  "cashFlowImpact": "описание влияния",
  "suggestedAmount": число (если нужно скорректировать),
  "suggestedDate": "YYYY-MM-DD" (если нужно изменить)
}
`,

    // Промт для анализа рисков
    riskAnalysis: `
Проанализируй риски платежа в строительной компании с учетом специфики отрасли.

Платеж: {paymentDetails}
Контекст: {context}

Основные риски в строительстве:
1. Кэшфлоу разрывы из-за задержек оплаты от заказчиков
2. Сезонные колебания (зимний период, праздники)
3. Рост цен на материалы
4. Проблемы с поставщиками и субподрядчиками
5. Бюджетные ограничения проектов
6. Валютные риски (при импортных материалах)

Оцени каждый риск по шкале 0-10 и предложи меры mitigation.
Верни JSON с анализом рисков.
`,

    // Промт для рекомендаций по оптимизации
    optimizationRecommendations: `
Проанализируй финансовые данные и предложи оптимизацию платежей.

Текущие данные: {financialData}
История: {historicalData}

Оптимизационные возможности в строительстве:
1. Согласование графиков платежей с этапами работ
2. Оптимизация авансовых платежей
3. Улучшение условий с поставщиками
4. Управление запасами материалов
5. Оптимизация субподрядчиков
6. Сезонное планирование

Верни рекомендации с расчетом экономического эффекта.
`,

    // Промт для прогнозирования кэшфлоу
    cashFlowForecast: `
Спрогнозируй кэшфлоу строительной компании на 30 дней.

Текущие данные: {currentData}
Исторические данные: {historicalData}
Планируемые платежи: {plannedPayments}

Учитывай строительную специфику:
- Сезонность (май-сентябрь - пик, ноябрь-февраль - спад)
- Задержки оплаты от заказчиков (30-60 дней в среднем)
- Цикличность платежей поставщикам (ежемесячно)
- Налоговые выплаты (ежеквартально)
- Зарплатные выплаты (2 раза в месяц)

Верни прогноз с confidence score и факторами риска.
`,

    // Промт для анализа поставщиков
    supplierAnalysis: `
Проанализируй поставщика в контексте строительного проекта.

Поставщик: {supplierDetails}
История работы: {workHistory}
Рыночные условия: {marketConditions}

Критерии оценки поставщиков в строительстве:
1. Надежность поставок (своевременность, качество)
2. Ценовая конкурентоспособность
3. Гибкость условий оплаты
4. Наличие лицензий и сертификатов
5. Опыт работы со строительными объектами
6. Финансовая стабильность

Верни рекомендации по работе с поставщиком.
`,

    // Промт для проектной аналитики
    projectAnalytics: `
Проанализируй финансовые показатели строительного проекта.

Проект: {projectDetails}
Финансовые данные: {financialData}
График работ: {workSchedule}

Метрики строительного проекта:
1. Освоение бюджета (%)
2. Рентабельность (%)
3. Кэшфлоу проекта
4. Соблюдение графика платежей
5. Стоимость работ по этапам
6. Факторы риска проекта

Верни полный анализ с рекомендациями.
`
  },
  
  businessRules: {
    roleLimits: {
      Director: 1000000,      // 1M ₽
      ProjectManager: 500000, // 500K ₽
      Foreman: 100000,        // 100K ₽
      Estimator: 200000,      // 200K ₽
      SupplyManager: 750000   // 750K ₽
    },
    
    operationLimits: {
      maxSinglePayment: 5000000,      // 5M ₽
      maxDailyTotal: 10000000,         // 10M ₽
      maxAccountabilityAmount: 100000, // 100K ₽
      advancePaymentPercentage: 30    // 30%
    },
    
    counterpartyRules: {
      requirePrepaymentForSuppliers: true,
      maxDebtToSuppliers: 2000000,    // 2M ₽
      paymentTerms: {
        standard: 30,   // 30 дней
        urgent: 7,      // 7 дней
        critical: 3    // 3 дня
      }
    },
    
    projectRules: {
      maxBudgetUtilization: 95,     // 95%
      requireApprovalForLargeExpenses: 100000, // 100K ₽
      minProfitMargin: 15           // 15%
    }
  }
};

// Фабрика промтов с подстановкой параметров
export class PromptFactory {
  static createPaymentValidationPrompt(params: {
    type: string;
    amount: number;
    date: string;
    description: string;
    project?: string;
    counterparty?: string;
    account?: string;
    currentBalance: number;
    historicalPayments: string;
    projectBudgets: string;
  }): string {
    const prompt = defaultAIPaymentConfig.prompts.paymentValidation;
    
    return prompt
      .replace('{type}', params.type)
      .replace('{amount}', params.amount.toString())
      .replace('{date}', params.date)
      .replace('{description}', params.description)
      .replace('{project}', params.project || 'Не указан')
      .replace('{counterparty}', params.counterparty || 'Не указан')
      .replace('{account}', params.account || 'Не указан')
      .replace('{currentBalance}', params.currentBalance.toString())
      .replace('{historicalPayments}', params.historicalPayments)
      .replace('{projectBudgets}', params.projectBudgets);
  }
  
  static createRiskAnalysisPrompt(paymentDetails: string, context: string): string {
    return defaultAIPaymentConfig.prompts.riskAnalysis
      .replace('{paymentDetails}', paymentDetails)
      .replace('{context}', context);
  }
  
  static createCashFlowForecastPrompt(
    currentData: string, 
    historicalData: string, 
    plannedPayments: string
  ): string {
    return defaultAIPaymentConfig.prompts.cashFlowForecast
      .replace('{currentData}', currentData)
      .replace('{historicalData}', historicalData)
      .replace('{plannedPayments}', plannedPayments);
  }
}

// Валидатор конфигурации
export class ConfigValidator {
  static validate(config: Partial<AIPaymentConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.validation?.riskThresholds) {
      const thresholds = config.validation.riskThresholds;
      if (thresholds.low >= thresholds.medium) errors.push('Низкий порог должен быть меньше среднего');
      if (thresholds.medium >= thresholds.high) errors.push('Средний порог должен быть меньше высокого');
      if (thresholds.high >= thresholds.critical) errors.push('Высокий порог должен быть меньше критического');
    }
    
    if (config.businessRules?.roleLimits) {
      const limits = config.businessRules.roleLimits;
      if (limits.Foreman > limits.ProjectManager) errors.push('Лимит прораба не может превышать лимит руководителя проекта');
      if (limits.ProjectManager > limits.Director) errors.push('Лимит руководителя проекта не может превышать лимит директора');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Мигратор конфигурации для обновлений
export class ConfigMigrator {
  static migrateToLatestVersion(config: any): AIPaymentConfig {
    // Логика миграции между версиями конфигурации
    return {
      ...defaultAIPaymentConfig,
      ...config
    };
  }
}
