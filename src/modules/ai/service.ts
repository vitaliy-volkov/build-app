import {
  AIAnalysisResponse,
  DefectDetectionResult,
  DrawingAnalysisResult,
  ChatResponse
} from './types';

// Mock data generation helpers
const generateMockDefect = (id: string): DefectDetectionResult => ({
  id,
  defectType: 'Cracked Concrete',
  confidence: 95,
  location: { x: 100, y: 200, width: 50, height: 50, pageNumber: 1 },
  severity: 'high',
  description: 'Severe cracking observed in the foundation wall.',
  suggestedFix: 'Inject epoxy resin and monitor for further movement.',
  estimatedCost: 500,
  timeToFix: { value: 4, unit: 'hours' },
});

export const AIService = {
  analyzeDrawing: async (file: File): Promise<AIAnalysisResponse<DrawingAnalysisResult>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            elements: [],
            complianceIssues: [],
            summary: `Analysis complete for ${file.name}. No critical issues found.`,
          },
          processingTime: 1500,
        });
      }, 2000);
    });
  },

  detectDefects: async (imageUrl: string): Promise<AIAnalysisResponse<DefectDetectionResult[]>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [generateMockDefect('1'), generateMockDefect('2')],
          processingTime: 800,
        });
      }, 1500);
    });
  },

  chatWithAssistant: async (message: string): Promise<AIAnalysisResponse<ChatResponse>> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            message: `I received your message: "${message}". How can I help you further with the construction supervision?`,
            actions: ['Create Report', 'View Drawings'],
          },
          processingTime: 500,
        });
      }, 1000);
    });
  },
};
