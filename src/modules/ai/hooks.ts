import { useState, useCallback } from 'react';
import { AIService } from './service';
import {
  AIAnalysisResponse,
  DefectDetectionResult,
  DrawingAnalysisResult,
  ChatResponse
} from './types';

interface UseAIAnalysisState {
  loading: boolean;
  error: string | null;
}

export const useAIAnalysis = () => {
  const [state, setState] = useState<UseAIAnalysisState>({
    loading: false,
    error: null,
  });

  const analyzeDrawing = useCallback(async (file: File): Promise<AIAnalysisResponse<DrawingAnalysisResult> | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await AIService.analyzeDrawing(file);
      return result;
    } catch (err: any) {
      setState({ loading: false, error: err.message || 'An unexpected error occurred' });
      return null;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const detectDefects = useCallback(async (imageUrl: string): Promise<AIAnalysisResponse<DefectDetectionResult[]> | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await AIService.detectDefects(imageUrl);
      return result;
    } catch (err: any) {
      setState({ loading: false, error: err.message || 'An unexpected error occurred' });
      return null;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const chatWithAssistant = useCallback(async (message: string): Promise<AIAnalysisResponse<ChatResponse> | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await AIService.chatWithAssistant(message);
      return result;
    } catch (err: any) {
      setState({ loading: false, error: err.message || 'An unexpected error occurred' });
      return null;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  return {
    ...state,
    analyzeDrawing,
    detectDefects,
    chatWithAssistant,
  };
};
