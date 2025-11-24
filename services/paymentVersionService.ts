import { 
  EstimatePaymentScheduleItem, 
  PaymentVersionHistory, 
  AIAnalysis,
  PaymentContext,
  AIConfiguration 
} from '../types';
import { AIService } from './aiService';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentChange {
  field: 'date' | 'amount' | 'percent' | 'description';
  old_value: any;
  new_value: any;
}

export class PaymentVersionService {
  
  // 1. Create version history entry for payment changes
  static async createVersionHistory(
    paymentId: string,
    changes: PaymentChange[],
    changedBy: string,
    context?: PaymentContext,
    aiConfig?: AIConfiguration
  ): Promise<PaymentVersionHistory> {
    const versionId = uuidv4();
    const now = new Date().toISOString();
    
    let aiAnalysis;
    
    // Perform AI analysis if context and config provided
    if (context && aiConfig) {
      try {
        const currentPayment = context.payment_schedule.find(p => p.id === paymentId);
        if (currentPayment) {
          aiAnalysis = await this.analyzeChangeImpact(currentPayment, changes, context, aiConfig);
        }
      } catch (error) {
        console.error("AI Change Analysis Error:", error);
        // Continue without AI analysis
      }
    }
    
    const versionHistory: PaymentVersionHistory = {
      id: versionId,
      payment_schedule_id: paymentId,
      changed_at: now,
      changed_by: changedBy,
      changes,
      ai_analysis: aiAnalysis,
      approval_required: this.isApprovalRequired(changes, aiAnalysis)
    };
    
    return versionHistory;
  }
  
  // 2. Analyze impact of changes with AI
  private static async analyzeChangeImpact(
    currentPayment: EstimatePaymentScheduleItem,
    changes: PaymentChange[],
    context: PaymentContext,
    aiConfig: AIConfiguration
  ): Promise<{
    risk_level: 'low' | 'medium' | 'high';
    recommendations: string[];
    impact_forecast: string;
  }> {
    try {
      const changesDescription = changes.map(c => 
        `${c.field}: "${c.old_value}" → "${c.new_value}"`
      ).join(', ');
      
      const prompt = `
      Проанализируй влияние изменений в графике платежей.
      
      Текущий платеж: ${currentPayment.date} - ${currentPayment.amount}₽ (${currentPayment.percent}%) - "${currentPayment.description}"
      
      Изменения: ${changesDescription}
      
      Контекст проекта:
      - Общая сумма сметы: ${context.total_estimate_amount}₽
      - График платежей: ${context.payment_schedule.map(p => `${p.date}: ${p.amount}₽`).join(', ')}
      
      ${context.client_history ? 
        `- История клиента: ${context.client_history.on_time_payment_rate}% своевременных оплат` : 
        '- Новый клиент'}
      
      Оцени:
      1. Уровень риска (low/medium/high)
      2. Влияние на кэшфлоу проекта
      3. Рекомендации по управлению изменениями
      
      Верни JSON:
      {
        "risk_level": "low"|"medium"|"high",
        "recommendations": ["рекомендация1", "рекомендация2"],
        "impact_forecast": "Прогноз влияния изменений"
      }
      `;
      
      const response = await AIService.chat(
        [{ role: 'user', text: prompt }],
        '',
        aiConfig
      );
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // Fallback analysis
        return {
          risk_level: 'medium',
          recommendations: ['Проверить соответствие графика работам', 'Уведомить клиента об изменениях'],
          impact_forecast: 'Изменения требуют дополнительного анализа'
        };
      }
    } catch (error) {
      console.error("AI Impact Analysis Error:", error);
      return {
        risk_level: 'medium',
        recommendations: ['Требуется ручная проверка изменений'],
        impact_forecast: 'Ошибка анализа влияния'
      };
    }
  }
  
  // 3. Determine if approval is required for changes
  private static isApprovalRequired(
    changes: PaymentChange[], 
    aiAnalysis?: { risk_level: 'low' | 'medium' | 'high' }
  ): boolean {
    // Always require approval for amount changes over 10%
    const amountChange = changes.find(c => c.field === 'amount');
    if (amountChange) {
      const oldAmount = Number(amountChange.old_value) || 0;
      const newAmount = Number(amountChange.new_value) || 0;
      const percentChange = Math.abs((newAmount - oldAmount) / oldAmount) * 100;
      
      if (percentChange > 10) {
        return true;
      }
    }
    
    // Require approval if AI indicates high risk
    if (aiAnalysis?.risk_level === 'high') {
      return true;
    }
    
    // Require approval for date changes (schedule impact)
    if (changes.some(c => c.field === 'date')) {
      return true;
    }
    
    return false;
  }
  
  // 4. Get version history for payment
  static getVersionHistory(
    allVersions: PaymentVersionHistory[], 
    paymentId: string
  ): PaymentVersionHistory[] {
    return allVersions
      .filter(version => version.payment_schedule_id === paymentId)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  }
  
  // 5. Get recent changes across all payments
  static getRecentChanges(
    allVersions: PaymentVersionHistory[], 
    limit: number = 10
  ): PaymentVersionHistory[] {
    return allVersions
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
      .slice(0, limit);
  }
  
  // 6. Get changes summary for a period
  static getChangesSummary(
    allVersions: PaymentVersionHistory[], 
    startDate: string, 
    endDate: string
  ): {
    total_changes: number;
    changes_by_user: Record<string, number>;
    changes_by_field: Record<string, number>;
    high_risk_changes: number;
    approval_required: number;
  } {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const filteredVersions = allVersions.filter(version => {
      const versionTime = new Date(version.changed_at).getTime();
      return versionTime >= start && versionTime <= end;
    });
    
    const summary = {
      total_changes: filteredVersions.length,
      changes_by_user: {} as Record<string, number>,
      changes_by_field: {} as Record<string, number>,
      high_risk_changes: 0,
      approval_required: 0
    };
    
    filteredVersions.forEach(version => {
      // Count by user
      summary.changes_by_user[version.changed_by] = 
        (summary.changes_by_user[version.changed_by] || 0) + 1;
      
      // Count by field
      version.changes.forEach(change => {
        summary.changes_by_field[change.field] = 
          (summary.changes_by_field[change.field] || 0) + 1;
      });
      
      // Count high risk and approval required
      if (version.ai_analysis?.risk_level === 'high') {
        summary.high_risk_changes++;
      }
      
      if (version.approval_required) {
        summary.approval_required++;
      }
    });
    
    return summary;
  }
  
  // 7. Compare payment versions
  static compareVersions(
    currentPayment: EstimatePaymentScheduleItem,
    versionHistory: PaymentVersionHistory[]
  ): {
    current_version: EstimatePaymentScheduleItem;
    previous_version?: Partial<EstimatePaymentScheduleItem>;
    changes: PaymentChange[];
    ai_insights?: any;
  } {
    // Reconstruct previous version from history
    const previousVersion: Partial<EstimatePaymentScheduleItem> = {};
    const changes: PaymentChange[] = [];
    
    // Apply changes in reverse order to get previous state
    const sortedHistory = versionHistory.sort((a, b) => 
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    );
    
    sortedHistory.forEach(version => {
      version.changes.forEach(change => {
        // Store current value as old value
        if (!previousVersion[change.field as keyof EstimatePaymentScheduleItem]) {
          (previousVersion as any)[change.field] = change.old_value;
        }
        
        changes.push(change);
      });
    });
    
    // Get AI insights from latest analysis
    const latestVersion = versionHistory[versionHistory.length - 1];
    
    return {
      current_version: currentPayment,
      previous_version: Object.keys(previousVersion).length > 0 ? previousVersion : undefined,
      changes,
      ai_insights: latestVersion?.ai_analysis
    };
  }
  
  // 8. Generate change report
  static generateChangeReport(
    allVersions: PaymentVersionHistory[], 
    paymentId: string,
    format: 'text' | 'html' = 'text'
  ): string {
    const versions = this.getVersionHistory(allVersions, paymentId);
    
    if (versions.length === 0) {
      return 'История изменений отсутствует';
    }
    
    let report = format === 'html' ? 
      '<h3>История изменений платежа</h3>' : 
      'ИСТОРИЯ ИЗМЕНЕНИЙ ПЛАТЕЖА\n' + '='.repeat(50) + '\n\n';
    
    versions.forEach((version, index) => {
      const date = new Date(version.changed_at).toLocaleString('ru-RU');
      
      if (format === 'html') {
        report += `
          <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd;">
            <h4>Изменение #${versions.length - index} - ${date}</h4>
            <p><strong>Автор:</strong> ${version.changed_by}</p>
            <p><strong>Требуется согласование:</strong> ${version.approval_required ? 'Да' : 'Нет'}</p>
            
            <h5>Измененные поля:</h5>
            <ul>
              ${version.changes.map(change => 
                `<li><strong>${change.field}:</strong> "${change.old_value}" → "${change.new_value}"</li>`
              ).join('')}
            </ul>
            
            ${version.ai_analysis ? `
              <h5>Анализ ИИ:</h5>
              <p><strong>Уровень риска:</strong> ${version.ai_analysis.risk_level}</p>
              <p><strong>Прогноз влияния:</strong> ${version.ai_analysis.impact_forecast}</p>
              <p><strong>Рекомендации:</strong></p>
              <ul>
                ${version.ai_analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      } else {
        report += `
ИЗМЕНЕНИЕ #${versions.length - index}
Дата: ${date}
Автор: ${version.changed_by}
Согласование: ${version.approval_required ? 'Требуется' : 'Не требуется'}

Измененные поля:
${version.changes.map(change => 
  `  • ${change.field}: "${change.old_value}" → "${change.new_value}"`
).join('\n')}

${version.ai_analysis ? `
Анализ ИИ:
  Уровень риска: ${version.ai_analysis.risk_level}
  Прогноз влияния: ${version.ai_analysis.impact_forecast}
  Рекомендации:
${version.ai_analysis.recommendations.map(rec => `    • ${rec}`).join('\n')}
` : ''}

${'-'.repeat(50)}\n
        `;
      }
    });
    
    return report;
  }
}

// Export main service interface
export const PaymentVersionServiceAPI = {
  createVersionHistory: PaymentVersionService.createVersionHistory,
  getVersionHistory: PaymentVersionService.getVersionHistory,
  getRecentChanges: PaymentVersionService.getRecentChanges,
  getChangesSummary: PaymentVersionService.getChangesSummary,
  compareVersions: PaymentVersionService.compareVersions,
  generateChangeReport: PaymentVersionService.generateChangeReport
};
