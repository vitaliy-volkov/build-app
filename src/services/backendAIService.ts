import { apiClient } from './apiClient';
import { AIConfiguration, AITaskType, AIMessage, Project, EstimateItem } from '../types';

// AI Service API Integration
export class BackendAIService {
  
  // Get AI Configuration from backend
  static async getConfiguration(): Promise<AIConfiguration> {
    const response = await apiClient.getAIConfiguration();
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get AI configuration');
  }

  // Update AI Configuration
  static async updateConfiguration(config: AIConfiguration): Promise<AIConfiguration> {
    const response = await apiClient.updateAIConfiguration(config);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to update AI configuration');
  }

  // Test AI Provider
  static async testProvider(providerId: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.testAIProvider(providerId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to test AI provider');
  }

  // Chat with AI through backend
  static async chat(messages: AIMessage[], context: string): Promise<string> {
    try {
      // This would be implemented on the backend
      // For now, return a placeholder response
      return "Backend AI chat integration is being implemented. This will connect to the actual AI service.";
    } catch (error) {
      console.error("Backend AI Chat Error:", error);
      throw error;
    }
  }

  // Analyze estimate through backend AI service
  static async analyzeEstimate(estimateId: string): Promise<any> {
    try {
      // This would call the backend AI analysis endpoint
      // Implementation depends on backend AI service structure
      const response = await apiClient.customRequest(`/ai/analyze/estimate/${estimateId}`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error("Backend AI Estimate Analysis Error:", error);
      throw error;
    }
  }

  // Generate design image through backend AI service
  static async generateDesignImage(prompt: string, referenceImage?: string): Promise<string> {
    try {
      // This would call the backend AI image generation endpoint
      const response = await apiClient.customRequest<{ success: boolean; data?: { image_url: string }; error?: string }>('/ai/generate/design', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          reference_image: referenceImage,
        }),
      });
      
      if (response.success && response.data?.image_url) {
        return response.data.image_url;
      }
      
      throw new Error(response.error || 'Failed to generate design image');
    } catch (error) {
      console.error("Backend AI Image Generation Error:", error);
      throw error;
    }
  }

  // Project health analysis through backend AI
  static async analyzeProjectHealth(projectId: string): Promise<any> {
    try {
      const response = await apiClient.customRequest(`/ai/analyze/project/${projectId}`, {
        method: 'POST',
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to analyze project health');
    } catch (error) {
      console.error("Backend AI Project Health Analysis Error:", error);
      throw error;
    }
  }

  // Auto-schedule Gantt through backend AI
  static async optimizeSchedule(projectId: string, startDate: string): Promise<any> {
    try {
      const response = await apiClient.customRequest(`/ai/optimize/schedule/${projectId}`, {
        method: 'POST',
        body: JSON.stringify({ start_date: startDate }),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to optimize schedule');
    } catch (error) {
      console.error("Backend AI Schedule Optimization Error:", error);
      throw error;
    }
  }

  // Payment risk analysis through backend AI
  static async analyzePaymentRisk(paymentId: string): Promise<any> {
    try {
      const response = await apiClient.customRequest(`/ai/analyze/payment/${paymentId}`, {
        method: 'POST',
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to analyze payment risk');
    } catch (error) {
      console.error("Backend AI Payment Risk Analysis Error:", error);
      throw error;
    }
  }

  // Cash flow forecast through backend AI
  static async forecastCashFlow(projectId: string, period: { start: string; end: string }): Promise<any> {
    try {
      const response = await apiClient.customRequest(`/ai/forecast/cashflow/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(period),
      });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error(response.error || 'Failed to forecast cash flow');
    } catch (error) {
      console.error("Backend AI Cash Flow Forecast Error:", error);
      throw error;
    }
  }

  // Generate payment recommendations through backend AI
  static async generatePaymentRecommendations(projectId: string): Promise<string[]> {
    try {
      const response = await apiClient.customRequest(`/ai/recommendations/payment/${projectId}`, {
        method: 'POST',
      });
      
      if (response.success && response.data?.recommendations) {
        return response.data.recommendations;
      }
      
      return ['Failed to generate payment recommendations'];
    } catch (error) {
      console.error("Backend AI Payment Recommendations Error:", error);
      throw error;
    }
  }
}

// Export the service for use in components
export const backendAIService = BackendAIService;