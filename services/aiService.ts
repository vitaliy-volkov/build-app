import { Project, EstimateItem, EstimateItemType, ResourceType, PriceListItem, ChatMessage, ProjectEvent, Estimate, AIAnalysisResult, AIConfiguration, DesignMaterial, AITaskType, EstimatePaymentScheduleItem, AIAnalysis, PaymentContext, CashFlowForecast, AIAuditTrail } from '../types';
import { getLLMAdapter, PromptPart } from './llmAdapters';

// Helper to clean JSON string from markdown
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
};

type CapabilityRequirements = {
  multimodal?: boolean;
  image?: boolean;
};

const promptMap: Partial<Record<AITaskType, keyof AIConfiguration['prompts']>> = {
  chat: 'chat_system',
  estimate_analysis: 'estimate_analysis_system',
  risk_assessment: 'risk_assessment_system'
};

const getSystemInstruction = (task: AITaskType, config: AIConfiguration) => {
  const key = promptMap[task];
  if (!key) return config.prompts.chat_system;
  return config.prompts[key];
};

const textPart = (text: string): PromptPart => ({ type: 'text', text });

const dataPart = (mimeType: string, data: string): PromptPart => ({
  type: 'data',
  mimeType,
  data
});

const resolveTaskRoute = (task: AITaskType, config: AIConfiguration) => {
  const taskConfig = config.taskDefaults[task];
  if (!taskConfig) {
    throw new Error(`Не настроен провайдер для задачи ${task}`);
  }

  const provider = config.providers.find(p => p.id === taskConfig.providerId);
  if (!provider) {
    throw new Error(`Провайдер ${taskConfig.providerId} не найден.`);
  }
  if (!provider.enabled) {
    throw new Error(`Провайдер ${provider.name} отключен.`);
  }

  const adapter = getLLMAdapter(provider.providerType);
  if (!adapter) {
    throw new Error(`Провайдер ${provider.providerType} пока не поддерживается.`);
  }

  return { adapter, provider, modelId: taskConfig.modelId };
};

const callLLM = async (
  task: AITaskType,
  config: AIConfiguration,
  options: {
    parts: PromptPart[];
    responseFormat?: 'text' | 'json';
    mode?: 'text' | 'image';
    requires?: CapabilityRequirements;
  }
) => {
  const { adapter, provider, modelId } = resolveTaskRoute(task, config);
  if (options.requires?.multimodal && !adapter.supports.multimodal) {
    throw new Error(`Провайдер ${provider.name} не поддерживает работу с файлами/аудио. Выберите другого в настройках.`);
  }
  if (options.requires?.image && !adapter.supports.image) {
    throw new Error(`Провайдер ${provider.name} не поддерживает генерацию изображений.`);
  }
  if (options.responseFormat === 'json' && !adapter.supports.json) {
    throw new Error(`Провайдер ${provider.name} не поддерживает прямой JSON-ответ. Выберите другой для этой задачи.`);
  }

  return adapter.invoke(
    { apiKey: provider.apiKey, baseUrl: provider.baseUrl, providerId: provider.providerType },
    {
      model: modelId,
      mode: options.mode || 'text',
      parts: options.parts,
      systemInstruction: getSystemInstruction(task, config),
      responseFormat: options.responseFormat || 'text'
    }
  );
};

export const AIService = {
  
  // 1. General Chat Assistant
  async chat(history: {role: 'user' | 'assistant', text: string}[], context: string, config: AIConfiguration): Promise<string> {
    try {
      const lastMessage = history[history.length - 1].text;
      const contextPrompt = context ? `\n\nТЕКУЩИЙ КОНТЕКСТ ДАННЫХ (Отвечай на русском):\n${context}` : '';
      const response = await callLLM('chat', config, {
        parts: [textPart(`${lastMessage}${contextPrompt}`)]
      });

      return response.text || "Извините, я не смог сгенерировать ответ.";
    } catch (error) {
      console.error("AI Chat Error:", error);
      return "Произошла ошибка при обращении к ИИ сервису. Проверьте настройки API ключа.";
    }
  },

  // 2. Estimate from File
  async generateEstimateFromFile(fileData: { data: string, mimeType: string, isText?: boolean }, priceList: PriceListItem[], config: AIConfiguration): Promise<EstimateItem[]> {
    try {
      const priceListContext = priceList.slice(0, 100).map(p => `${p.name} (${p.unit}) - ${p.cost_price} руб`).join('\n');

      const prompt = `
      Проанализируй предоставленный файл.
      Определи все необходимые виды строительных работ и материалов.
      Сопоставь выявленные работы с этим Прайс-листом, где это возможно:
      ${priceListContext}
      
      Верни JSON массив объектов EstimateItem:
      [{ "item_type": "Position", "resource_type": "Work", "name": "...", "unit": "...", "quantity": 0, "cost_price": 0, "markup": 0 }]
      `;

      const parts: PromptPart[] = [];
      if (fileData.isText) {
          parts.push(textPart(`Содержимое файла (${fileData.mimeType}):\n${fileData.data}`));
      } else {
          const base64Data = fileData.data.includes(',') ? fileData.data.split(',')[1] : fileData.data;
          parts.push(dataPart(fileData.mimeType, base64Data));
      }
      parts.push(textPart(prompt));

      const response = await callLLM('estimate_analysis', config, {
        parts,
        responseFormat: 'json',
        requires: { multimodal: true }
      });

      if (response.text) {
        try {
          const cleanText = cleanJsonString(response.text);
          const items = JSON.parse(cleanText);
          return items.map((item: any) => ({
             ...item,
             markup: item.markup || 20,
             cost_price: item.cost_price || 0,
             item_type: item.item_type || EstimateItemType.Position,
             resource_type: item.resource_type || ResourceType.Work
          }));
        } catch (parseError) {
          console.error("AI JSON Parse Error:", parseError);
          throw new Error("Ошибка обработки ответа от ИИ (некорректный JSON).");
        }
      }
      return [];
    } catch (error) {
      console.error("AI Estimate Error:", error);
      throw new Error("Не удалось создать смету по файлу.");
    }
  },

  // 2.1 Estimate from Audio (Voice)
  async generateEstimateFromAudio(audioBase64: string, mimeType: string, priceList: PriceListItem[], config: AIConfiguration, location?: { lat: number, lng: number }): Promise<EstimateItem[]> {
    try {
      const priceListContext = priceList.slice(0, 100).map(p => `${p.name} (${p.unit}) - ${p.cost_price} руб`).join('\n');

      let prompt = `
      Listen to the audio instructions for a construction estimate.
      Transcribe the request and structure it into a list of construction works and materials (Stages and Positions).
      `;

      if (location) {
          prompt += `
          The user is located at Coordinates: ${location.lat}, ${location.lng}.
          1. Identify the city/region from these coordinates.
          2. Search for current market prices (labor and materials) in this specific city/region using Google Search.
          3. Use these local market prices for the 'cost_price' field.
          `;
      } else {
          prompt += `
          If possible, match items to this Price List:
          ${priceListContext}
          `;
      }

      prompt += `
      Return a JSON array of objects in a Markdown code block like \`\`\`json [...] \`\`\`.
      Structure:
      [{ 
        "item_type": "Stage" | "Position", 
        "resource_type": "Work" | "Material" | "Mechanism", 
        "name": "...", 
        "unit": "...", 
        "quantity": number, 
        "cost_price": number, 
        "markup": number 
      }]
      
      If the user mentions a Stage (e.g. "Foundation"), create a "Stage" item first, followed by "Position" items belonging to it.
      `;

      // Remove data URL prefix if present
      const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;

      const response = await callLLM('estimate_analysis', config, {
        parts: [
          dataPart(mimeType, cleanBase64),
          textPart(prompt)
        ],
        responseFormat: 'json',
        requires: { multimodal: true }
      });

      if (response.text) {
        const cleanText = cleanJsonString(response.text);
        try {
            const items = JSON.parse(cleanText);
            return items.map((item: any) => ({
               ...item,
               markup: item.markup || 20,
               cost_price: item.cost_price || 0,
               item_type: item.item_type || EstimateItemType.Position,
               resource_type: item.resource_type || ResourceType.Work,
               quantity: Number(item.quantity) || 1
            }));
        } catch (e) {
            console.error("JSON Parse Error in Voice:", e);
            console.log("Raw text:", response.text);
            return [];
        }
      }
      return [];
    } catch (error) {
      console.error("AI Voice Error:", error);
      throw new Error("Не удалось обработать голосовой запрос: " + (error as any).message);
    }
  },

  // 3. Project Health Analysis
  async analyzeProjectHealth(project: Project, chats: ChatMessage[], events: ProjectEvent[], config: AIConfiguration): Promise<any> {
    try {
      const chatLog = chats.map(c => `[${c.type}] ${c.timestamp}: ${c.text}`).join('\n');
      const eventLog = events.map(e => `${e.timestamp}: ${e.event_description}`).join('\n');

      const prompt = `
      Проанализируй здоровье проекта "${project.name}".
      
      Логи чата:
      ${chatLog}
      
      События:
      ${eventLog}
      
      Определи: riskScore (0-100), sentiment (Позитивное/Нейтральное/Негативное), riskFactors (array string), recommendations (array string).
      `;

      const response = await callLLM('risk_assessment', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
        try {
          const cleanText = cleanJsonString(response.text);
          return JSON.parse(cleanText);
        } catch (e) {
          return { riskScore: 50, sentiment: 'Нейтральное', riskFactors: ["Ошибка чтения"], recommendations: [] };
        }
      }
      return null;
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return { riskScore: 0, sentiment: 'Нейтральное', riskFactors: ["Ошибка анализа"], recommendations: [] };
    }
  },

  // 4. Analyze Estimate
  async analyzeEstimate(estimate: Estimate, items: EstimateItem[], priceList: PriceListItem[], config: AIConfiguration): Promise<AIAnalysisResult> {
    try {
      const itemsList = items.map(i => `- ${i.name} (${i.quantity} ${i.unit}): ${i.cost_price} руб`).join('\n');

      const prompt = `
      Проанализируй смету "${estimate.name}".
      Позиции:
      ${itemsList}
      
      1. analysisText: Текстовый анализ.
      2. missingItems: Список { item_type, resource_type, name, unit, quantity, cost_price, markup, reason }.
      3. optimizations: Список { originalItemName, suggestion, potentialSavings }.
      `;

      const response = await callLLM('estimate_analysis', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
        try {
           const cleanText = cleanJsonString(response.text);
           const result = JSON.parse(cleanText);
           result.missingItems = result.missingItems.map((i: any) => ({
              ...i,
              markup: i.markup || 20,
              item_type: i.item_type || EstimateItemType.Position,
              resource_type: i.resource_type || ResourceType.Material
           }));
           return result;
        } catch(e) {
           throw new Error("Ошибка обработки ответа ИИ");
        }
      }
      throw new Error("Пустой ответ от ИИ");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      throw error;
    }
  },

  // 5. Generate Design Image (Moodboard/Visualization)
  async generateDesignImage(prompt: string, sourceImageBase64: string | null, styleImageBase64: string | null, config: AIConfiguration): Promise<string | null> {
    try {
      const parts: PromptPart[] = [];

      const processImage = (b64: string) => {
        if (b64.startsWith('data:')) {
          const matches = b64.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            return dataPart(matches[1], matches[2]);
          }
          const split = b64.split(',');
          return dataPart(split[0].split(':')[1].split(';')[0], split[1]);
        }
        return dataPart('image/jpeg', b64);
      };

      if (sourceImageBase64) {
        parts.push(processImage(sourceImageBase64));
      }

      if (styleImageBase64) {
        parts.push(processImage(styleImageBase64));
      }

      let finalPrompt = prompt;
      if (sourceImageBase64 && styleImageBase64) {
          finalPrompt = `Using the first image as the source structure/layout and the second image as the style/texture reference, generate a new image based on this instruction: ${prompt}`;
      } else if (sourceImageBase64) {
          finalPrompt = `Redesign this image based on the following instruction: ${prompt}`;
      } else if (styleImageBase64) {
          finalPrompt = `Generate an interior design image using the provided image as a style reference. Instruction: ${prompt}`;
      }

      parts.push(textPart(finalPrompt));

      const response = await callLLM('generation', config, {
        parts,
        mode: 'image',
        requires: { image: true, multimodal: Boolean(sourceImageBase64 || styleImageBase64) }
      });

      return response.dataUri || null;
    } catch (error) {
      console.error("AI Image Gen Error:", error);
      throw error;
    }
  },

  // 6. Analyze Materials from Image
  async analyzeMaterials(imageUrlOrBase64: string, config: AIConfiguration): Promise<DesignMaterial[]> {
    try {
      let base64Data = '';
      let mimeType = 'image/jpeg';

      if (imageUrlOrBase64.startsWith('blob:')) {
          // Fetch blob and convert to base64
          const response = await fetch(imageUrlOrBase64);
          const blob = await response.blob();
          mimeType = blob.type || 'image/jpeg';
          base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1]);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
          });
      } else if (imageUrlOrBase64.startsWith('data:')) {
          const matches = imageUrlOrBase64.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
              mimeType = matches[1];
              base64Data = matches[2];
          } else {
              const parts = imageUrlOrBase64.split(',');
              mimeType = parts[0].split(':')[1].split(';')[0];
              base64Data = parts[1];
          }
      } else {
          base64Data = imageUrlOrBase64;
      }
      
      const prompt = `
        Analyze this interior design image. 
        List ONLY specific physical items visible.
        Rules:
        1. Use specific, short descriptive names in Russian.
        2. Format each line strictly as: "Category: Item Name".
      `;

      const response = await callLLM('generation', config, {
        parts: [dataPart(mimeType, base64Data), textPart(prompt)],
        requires: { multimodal: true }
      });

      const text = response.text || "";
      const items: DesignMaterial[] = [];
      const lines = text.split('\n');

      lines.forEach(line => {
         const cleanLine = line.trim();
         if (!cleanLine) return;
         const colonIndex = cleanLine.indexOf(':');
         if (colonIndex > -1) {
             const category = cleanLine.substring(0, colonIndex).trim().replace(/[-*]/g, '');
             const name = cleanLine.substring(colonIndex + 1).trim();
             if (name && category) {
                 items.push({ name, category, search_query: name });
             }
         }
      });
      return items;
    } catch (error) {
      console.error("AI Material Analysis Error:", error);
      throw error;
    }
  },

  // 7. Auto-Schedule Gantt (NEW)
  async optimizeSchedule(items: EstimateItem[], startDate: string, config: AIConfiguration): Promise<{id: string, start_date: string, end_date: string, dependencies: string[]}[]> {
    try {
      // Filter purely positions or stages
      const simpleItems = items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.item_type,
        quantity: i.quantity,
        unit: i.unit,
        resource: i.resource_type
      }));

      const prompt = `
      You are a professional construction scheduler.
      Project Start Date: ${startDate}.
      
      Given this list of estimate items (tasks), generate a logical Gantt chart schedule.
      Consider standard construction sequences (e.g. Foundation -> Walls -> Roof).
      Estimate realistic durations based on quantity and unit.
      
      Return a JSON array of objects with fields:
      - id: string (matching input id)
      - start_date: string (YYYY-MM-DD)
      - end_date: string (YYYY-MM-DD)
      - dependencies: array of strings (ids of tasks that must finish before this one starts)
      
      Input Items:
      ${JSON.stringify(simpleItems)}
      `;

      const response = await callLLM('estimate_analysis', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
         const cleanText = cleanJsonString(response.text);
         return JSON.parse(cleanText);
      }
      return [];
    } catch (error) {
      console.error("AI Schedule Error:", error);
      throw error;
    }
  },

  // 8. Analyze Critical Path Risks (NEW)
  async analyzeCriticalPathRisks(items: EstimateItem[], criticalPathIds: string[], config: AIConfiguration): Promise<{riskLevel: string, advice: string}> {
      try {
          const criticalItems = items.filter(i => criticalPathIds.includes(i.id)).map(i => `${i.name} (${i.start_date} - ${i.end_date})`);
          
          const prompt = `
          Analyze the critical path of this construction schedule.
          Critical Items:
          ${criticalItems.join('\n')}
          
          Identify potential risks (weather, supply chain, sequence) and provide brief advice.
          Return JSON: { "riskLevel": "Low"|"Medium"|"High", "advice": "..." }
          `;

          const response = await callLLM('risk_assessment', config, {
            parts: [textPart(prompt)],
            responseFormat: 'json'
          });

          if (response.text) return JSON.parse(cleanJsonString(response.text));
          return { riskLevel: 'Unknown', advice: 'AI unavailable' };
      } catch (e) {
          return { riskLevel: 'Unknown', advice: 'Error analyzing risks' };
      }
  },

  // --- AI Payment Analyzer Methods (v9.0) ---

  // 9. Analyze Payment Risk
  async analyzePaymentRisk(payment: EstimatePaymentScheduleItem, context: PaymentContext, config: AIConfiguration): Promise<AIAnalysis> {
    try {
      const scheduleContext = context.payment_schedule.map(p => 
        `${p.date}: ${p.amount}₽ (${p.percent}%) - ${p.is_paid ? 'Оплачен' : 'Ожидается'}`
      ).join('\n');

      const clientContext = context.client_history ? 
        `История клиента: своевременная оплата ${context.client_history.on_time_payment_rate}%, средняя задержка ${context.client_history.average_delay_days} дней` : 
        'Новый клиент (нет истории)';

      const cashFlowContext = context.company_cash_flow ? 
        `Текущий баланс: ${context.company_cash_flow.current_balance}₽, предстоящие расходы: ${context.company_cash_flow.upcoming_expenses}₽` : 
        'Данные о кэшфлоу недоступны';

      const prompt = `
      Проанализируй риск платежа в строительном проекте.
      
      Текущий платеж: ${payment.date} - ${payment.amount}₽ (${payment.percent}%) - "${payment.description}"
      
      Контекст:
      - Полный график платежей:
      ${scheduleContext}
      
      - ${clientContext}
      
      - ${cashFlowContext}
      
      Оцени по шкале 0-100, где:
      - 90-100: Минимальный риск (рекомендация авто-одобрения)
      - 75-89: Низкий риск (сильная рекомендация одобрения)
      - 50-74: Средний риск (требуется внимание)
      - 25-49: Высокий риск (ручная проверка обязательна)
      - 0-24: Критический риск (рекомендация отклонения)
      
      Верни JSON с полями:
      {
        "score": 0-100,
        "risk_level": "low"|"medium"|"high",
        "risk_factors": ["фактор1", "фактор2"],
        "recommendations": ["рекомендация1", "рекомендация2"],
        "confidence": 0-100
      }
      `;

      const response = await callLLM('risk_assessment', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
        const analysis = JSON.parse(cleanJsonString(response.text));
        return {
          ...analysis,
          analysis_timestamp: new Date().toISOString()
        };
      }

      return {
        score: 50,
        risk_level: 'medium',
        risk_factors: ['Ошибка анализа'],
        recommendations: ['Требуется ручная проверка'],
        confidence: 0,
        analysis_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("AI Payment Risk Analysis Error:", error);
      return {
        score: 50,
        risk_level: 'medium',
        risk_factors: ['Ошибка ИИ-анализа'],
        recommendations: ['Требуется ручная проверка'],
        confidence: 0,
        analysis_timestamp: new Date().toISOString()
      };
    }
  },

  // 10. Forecast Cash Flow
  async forecastCashFlow(payments: EstimatePaymentScheduleItem[], context: PaymentContext, config: AIConfiguration): Promise<CashFlowForecast> {
    try {
      const upcomingPayments = payments.filter(p => !p.is_paid && new Date(p.date) > new Date());
      const totalUpcoming = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = upcomingPayments.length > 0 ? 
        upcomingPayments[upcomingPayments.length - 1].date : 
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const prompt = `
      Сделай прогноз кэшфлоу на основе графика платежей.
      
      Предстоящие платежи: ${upcomingPayments.map(p => `${p.date}: ${p.amount}₽`).join(', ')}
      Общая сумма: ${totalUpcoming}₽
      Период: ${startDate} - ${endDate}
      
      ${context.company_cash_flow ? 
        `Текущий баланс: ${context.company_cash_flow.current_balance}₽, прогнозируемый доход: ${context.company_cash_flow.projected_income}₽` : 
        'Данные о балансе недоступны'}
      
      Верни JSON:
      {
        "period_start": "${startDate}",
        "period_end": "${endDate}",
        "projected_income": число,
        "projected_expenses": число,
        "net_cash_flow": число,
        "risk_level": "low"|"medium"|"high",
        "recommendations": ["рекомендация1", "рекомендация2"]
      }
      `;

      const response = await callLLM('risk_assessment', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
        return JSON.parse(cleanJsonString(response.text));
      }

      // Fallback
      return {
        period_start: startDate,
        period_end: endDate,
        projected_income: totalUpcoming,
        projected_expenses: context.company_cash_flow?.upcoming_expenses || 0,
        net_cash_flow: totalUpcoming - (context.company_cash_flow?.upcoming_expenses || 0),
        risk_level: 'medium',
        recommendations: ['Требуется детальный анализ кэшфлоу']
      };
    } catch (error) {
      console.error("AI Cash Flow Forecast Error:", error);
      throw new Error("Не удалось спрогнозировать кэшфлоу");
    }
  },

  // 11. Generate Payment Recommendations
  async generatePaymentRecommendations(context: PaymentContext, config: AIConfiguration): Promise<string[]> {
    try {
      const prompt = `
      Проанализируй график платежей и дай рекомендации по оптимизации.
      
      График платежей: ${context.payment_schedule.map(p => `${p.date}: ${p.amount}₽ (${p.percent}%)`).join(', ')}
      Общая сумма сметы: ${context.total_estimate_amount}₽
      
      ${context.client_history ? 
        `Надежность клиента: ${context.client_history.on_time_payment_rate}% своевременных оплат` : 
        'Новый клиент'}
      
      Дай 3-5 конкретных рекомендаций по русски:
      1. Оптимизация тайминга платежей
      2. Управление рисками
      3. Улучшение кэшфлоу
      4. Коммуникация с клиентом
      
      Верни JSON массив строк: ["рекомендация1", "рекомендация2", ...]
      `;

      const response = await callLLM('risk_assessment', config, {
        parts: [textPart(prompt)],
        responseFormat: 'json'
      });

      if (response.text) {
        return JSON.parse(cleanJsonString(response.text));
      }

      return ['Проверьте соответствие графика этапам работ', 'Оцените финансовую устойчивость клиента'];
    } catch (error) {
      console.error("AI Payment Recommendations Error:", error);
      return ['Ошибка генерации рекомендаций'];
    }
  }
};