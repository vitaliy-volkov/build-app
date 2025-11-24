// src/modules/ai/types.ts

// AI Analysis Types

export interface AIAnalysisRequest {
    type: 'drawing' | 'estimate' | 'defect' | 'chat';
    data: any; // Generic payload depending on type
    options?: AIAnalysisOptions;
}

export interface AIAnalysisOptions {
    checkCompliance?: boolean;
    detectAnomalies?: boolean;
    suggestOptimizations?: boolean;
    generateReport?: boolean;
    priority?: 'speed' | 'accuracy';
}

export interface AIAnalysisResponse<T> {
    result: T;
    confidence: number;
    processingTime: number;
    tokensUsed?: number;
    model?: string;
}

// Drawing Analysis Result
export interface DrawingAnalysisResult {
    elements: any[]; // DrawingElement[]
    issues: any[];   // ComplianceIssue[]
    summary: string;
}

// Defect Detection Result
export interface DefectDetectionResult {
    defects: DetectedDefect[];
    imageQualityScore: number;
}

export interface DetectedDefect {
    type: string;
    confidence: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestedAction?: string;
}

// Estimate Analysis Result
export interface EstimateAnalysisResult {
    risks: EstimateRisk[];
    optimizations: EstimateOptimization[];
    marketComparison: MarketComparison;
}

export interface EstimateRisk {
    category: 'price' | 'quantity' | 'timing' | 'completeness';
    description: string;
    severity: 'low' | 'medium' | 'high';
    probability: number; // 0-1
}

export interface EstimateOptimization {
    description: string;
    potentialSavings: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface MarketComparison {
    percentile: number; // e.g. 75th percentile of market prices
    avgDifference: number; // % diff from market avg
}

// Chat Types
export interface AIChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    context?: {
        projectId?: string;
        documentId?: string;
    };
}
