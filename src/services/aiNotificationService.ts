import { NotificationType, UserRole, AppNotification, UserActivity, AIConfiguration } from '../types';
import { getLLMAdapter, PromptPart } from './llmAdapters';
import { AIService } from './aiService';

const textPart = (text: string): PromptPart => ({ type: 'text', text });

// AI Thresholds Configuration
const AI_THRESHOLDS = {
  AUTO_APPROVE: { min: 90, max: 100 },
  STRONG_RECOMMEND: { min: 75, max: 89 },
  ATTENTION_NEEDED: { min: 50, max: 74 },
  MANUAL_REVIEW: { min: 25, max: 49 },
  REJECT: { min: 0, max: 24 }
};

export class AINotificationGenerator {
  
  // 1. Generate Payment Notification
  static async generatePaymentNotification(
    paymentScore: number,
    paymentData: any,
    context: any,
    config: AIConfiguration
  ): Promise<AppNotification> {
    try {
      const threshold = this.getThreshold(paymentScore);
      const urgency = this.getUrgencyLevel(paymentScore);
      
      const prompt = `
      Сгенерируй уведомление о платеже на основе ИИ-анализа.
      
      Данные платежа: ${paymentData.date} - ${paymentData.amount}₽ - "${paymentData.description}"
      Оценка ИИ: ${paymentScore}/100 (${threshold.label})
      Уровень срочности: ${urgency}
      
      Сгенерируй:
      1. Краткий заголовок (до 50 символов)
      2. Детальное сообщение (2-3 предложения)
      3. 3 рекомендуемых действия
      
      Стиль: профессиональный, но понятный. Используй эмодзи для визуализации.
      
      Верни JSON:
      {
        "title": "Заголовок",
        "message": "Детальное сообщение",
        "suggested_actions": ["действие1", "действие2", "действие3"]
      }
      `;

      const response = await AIService.chat(
        [{ role: 'user', text: prompt }],
        '',
        config
      );

      let content;
      try {
        content = JSON.parse(response);
      } catch (e) {
        // Fallback content
        content = {
          title: `ИИ-анализ платежа: ${threshold.label}`,
          message: `Платеж на ${paymentData.amount}₽ получил оценку ${paymentScore}/100. ${threshold.description}`,
          suggested_actions: ['Проверить детали', 'Связаться с клиентом', 'Принять решение']
        };
      }

      return {
        id: `ai_payment_${Date.now()}`,
        title: content.title,
        message: content.message,
        type: NotificationType.AIPaymentRecommendation,
        is_read: false,
        created_at: new Date().toISOString(),
        action_payload: {
          type: 'approve_payment',
          entity_id: paymentData.id
        },
        ai_generated: true,
        ai_context: {
          urgency_level: urgency,
          predicted_impact: threshold.impact,
          suggested_actions: content.suggested_actions
        }
      };
    } catch (error) {
      console.error("AI Notification Generation Error:", error);
      
      // Fallback notification
      return {
        id: `ai_payment_fallback_${Date.now()}`,
        title: '🤖 ИИ-анализ платежа',
        message: `Платеж получил оценку ${paymentScore}/100. Требуется проверка.`,
        type: NotificationType.AIPaymentRecommendation,
        is_read: false,
        created_at: new Date().toISOString(),
        ai_generated: false,
        ai_context: {
          urgency_level: 'medium',
          predicted_impact: 'Требуется ручная проверка',
          suggested_actions: ['Проверить детали платежа']
        }
      };
    }
  }

  // 2. Generate Cash Flow Alert
  static async generateCashFlowAlert(
    forecast: any,
    config: AIConfiguration
  ): Promise<AppNotification> {
    try {
      const riskEmoji = forecast.risk_level === 'high' ? '🔴' : 
                       forecast.risk_level === 'medium' ? '🟡' : '🟢';

      const prompt = `
      Сгенерируй предупреждение о кэшфлоу.
      
      Прогноз: ${forecast.net_cash_flow > 0 ? 'Положительный' : 'Отрицательный'} кэшфлоу ${Math.abs(forecast.net_cash_flow)}₽
      Период: ${forecast.period_start} - ${forecast.period_end}
      Уровень риска: ${forecast.risk_level}
      
      Рекомендации: ${forecast.recommendations.join(', ')}
      
      Верни JSON:
      {
        "title": "Заголовок (с эмодзи)",
        "message": "Детальное сообщение",
        "suggested_actions": ["действие1", "действие2"]
      }
      `;

      const response = await AIService.chat(
        [{ role: 'user', text: prompt }],
        '',
        config
      );

      let content;
      try {
        content = JSON.parse(response);
      } catch (e) {
        content = {
          title: `${riskEmoji} Прогноз кэшфлоу`,
          message: `Прогнозируемый кэшфлоу: ${forecast.net_cash_flow}₽. Уровень риска: ${forecast.risk_level}`,
          suggested_actions: ['Проверить расходы', 'Оптимизировать поступления']
        };
      }

      return {
        id: `ai_cashflow_${Date.now()}`,
        title: content.title,
        message: content.message,
        type: NotificationType.AIForecast,
        is_read: false,
        created_at: new Date().toISOString(),
        ai_generated: true,
        ai_context: {
          urgency_level: forecast.risk_level === 'high' ? 'high' : 
                        forecast.risk_level === 'medium' ? 'medium' : 'low',
          predicted_impact: `Кэшфлоу: ${forecast.net_cash_flow}₽`,
          suggested_actions: content.suggested_actions
        }
      };
    } catch (error) {
      console.error("AI Cash Flow Alert Error:", error);
      
      return {
        id: `ai_cashflow_fallback_${Date.now()}`,
        title: '📊 Прогноз кэшфлоу',
        message: `Требуется анализ финансового прогноза`,
        type: NotificationType.AIForecast,
        is_read: false,
        created_at: new Date().toISOString(),
        ai_generated: false
      };
    }
  }

  // 3. Optimize Notification Timing
  static async optimizeNotificationTiming(
    notification: AppNotification,
    userActivity: UserActivity,
    config: AIConfiguration
  ): Promise<Date> {
    try {
      const prompt = `
      Оптимизируй время отправки уведомления.
      
      Уведомление: "${notification.title}"
      Уровень срочности: ${notification.ai_context?.urgency_level || 'medium'}
      
      Активность пользователя:
      - Последняя активность: ${userActivity.last_active}
      - Ставка ответа на уведомления: ${userActivity.notification_response_rate}%
      - Предпочтительное время: ${userActivity.preferred_communication_time}
      - Активность утром: ${userActivity.activity_patterns.morning_active}
      - Активность вечером: ${userActivity.activity_patterns.evening_active}
      - Активность в выходные: ${userActivity.activity_patterns.weekend_active}
      
      Текущее время: ${new Date().toISOString()}
      
      Верни JSON:
      {
        "delay_hours": число,
        "reason": "причина задержки"
      }
      `;

      const response = await AIService.chat(
        [{ role: 'user', text: prompt }],
        '',
        config
      );

      let optimization;
      try {
        optimization = JSON.parse(response);
      } catch (e) {
        // Default: send immediately for urgent, delay 2 hours for non-urgent
        optimization = {
          delay_hours: notification.ai_context?.urgency_level === 'high' ? 0 : 2,
          reason: 'Стандартная оптимизация'
        };
      }

      const scheduledTime = new Date();
      scheduledTime.setHours(scheduledTime.getHours() + optimization.delay_hours);
      
      return scheduledTime;
    } catch (error) {
      console.error("AI Timing Optimization Error:", error);
      return new Date(); // Send immediately as fallback
    }
  }

  // 4. Personalize Notification Content
  static async personalizeContent(
    notification: AppNotification,
    userProfile: any,
    config: AIConfiguration
  ): Promise<string> {
    try {
      const prompt = `
      Персонализируй уведомление для пользователя.
      
      Оригинальное сообщение: "${notification.message}"
      Роль пользователя: ${userProfile.role}
      Опыт работы: ${userProfile.tenureDays} дней
      KPI пользователя: ${userProfile.kpiScore}/100
      
      Адаптируй стиль сообщения под роль и опыт пользователя.
      
      Верни только персонализированный текст сообщения.
      `;

      const response = await AIService.chat(
        [{ role: 'user', text: prompt }],
        '',
        config
      );

      return response || notification.message;
    } catch (error) {
      console.error("AI Personalization Error:", error);
      return notification.message;
    }
  }

  // Helper methods
  private static getThreshold(score: number) {
    if (score >= AI_THRESHOLDS.AUTO_APPROVE.min && score <= AI_THRESHOLDS.AUTO_APPROVE.max) {
      return { 
        label: 'Авто-одобрение', 
        description: 'Минимальный риск, рекомендуется авто-одобрение',
        impact: 'Платеж безопасен для автоматического одобрения'
      };
    }
    if (score >= AI_THRESHOLDS.STRONG_RECOMMEND.min && score <= AI_THRESHOLDS.STRONG_RECOMMEND.max) {
      return { 
        label: 'Рекомендуется', 
        description: 'Низкий риск, сильная рекомендация к одобрению',
        impact: 'Платеж соответствует ожиданиям'
      };
    }
    if (score >= AI_THRESHOLDS.ATTENTION_NEEDED.min && score <= AI_THRESHOLDS.ATTENTION_NEEDED.max) {
      return { 
        label: 'Требует внимания', 
        description: 'Средний риск, рекомендуется проверка',
        impact: 'Возможны незначительные отклонения'
      };
    }
    if (score >= AI_THRESHOLDS.MANUAL_REVIEW.min && score <= AI_THRESHOLDS.MANUAL_REVIEW.max) {
      return { 
        label: 'Ручная проверка', 
        description: 'Высокий риск, обязательна ручная проверка',
        impact: 'Выявлены значительные риски'
      };
    }
    return { 
      label: 'Не рекомендуется', 
      description: 'Критический риск, рекомендуется отклонение',
      impact: 'Платеж несет высокие финансовые риски'
    };
  }

  private static getUrgencyLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 75) return 'low';
    if (score >= 50) return 'medium';
    return 'high';
  }
}

// AI Notification Service - Main interface
export const AINotificationService = {
  generatePaymentNotification: AINotificationGenerator.generatePaymentNotification,
  generateCashFlowAlert: AINotificationGenerator.generateCashFlowAlert,
  optimizeTiming: AINotificationGenerator.optimizeNotificationTiming,
  personalizeContent: AINotificationGenerator.personalizeContent
};
