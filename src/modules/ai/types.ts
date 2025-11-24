export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface LocationData {
  x: number;
  y: number;
  width?: number;
  height?: number;
  pageNumber?: number;
}

export interface TimeEstimate {
  value: number;
  unit: 'hours' | 'days' | 'weeks';
}

export interface DefectDetectionResult {
  id: string;
  defectType: string;
  confidence: number; // 0-100
  location: LocationData;
  severity: SeverityLevel;
  description: string;
  suggestedFix: string;
  estimatedCost: number;
  timeToFix: TimeEstimate;
  relatedDrawingElements?: string[]; // IDs of related elements
}

export interface DrawingAnalysisResult {
  elements: any[]; // Placeholder for detailed elements if needed
  complianceIssues: any[];
  summary: string;
}

export interface ChatResponse {
  message: string;
  actions?: string[];
}

export type AIAnalysisType = 'drawing_analysis' | 'defect_detection' | 'chat';

export interface AIAnalysisRequest {
  id: string;
  type: AIAnalysisType;
  payload: File | string; // File for drawing, URL for defect detection, string for chat
  context?: Record<string, any>;
}

export interface AIAnalysisResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
}
