// src/modules/drawings/types.ts

// Типы для работы с чертежами
export interface Drawing {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    file_path: string;
    file_size: number;
    pages: DrawingPage[];
    version: number;
    status: 'draft' | 'approved' | 'archived';
    uploaded_by: string;
    uploaded_at: string;
    updated_at: string;
    scale?: ScaleInfo;
    metadata: DrawingMetadata;
    ai_analysis?: DrawingAnalysis;
    annotations: Annotation[];
    linked_defects: string[];
    parent_drawing_id?: string; // для версий
  }

  export interface DrawingPage {
    page_number: number;
    width: number;
    height: number;
    scale: number;
    elements: DrawingElement[];
    annotations: Annotation[];
    defects: DefectMarker[];
    thumbnail_url?: string;
    canvas_data?: string; // base64 для офлайн режима
  }

  export interface ScaleInfo {
    ratio: number; // e.g., 1:100 -> 0.01
    unit: 'm' | 'cm' | 'mm' | 'ft' | 'in';
    paperSize?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Custom';
  }

  export interface DrawingMetadata {
    titleBlock?: Record<string, string>;
    revision?: string;
    sheetNumber?: string;
    discipline?: string; // AR, KR, OV, VK, etc.
  }

  export interface DrawingAnalysis {
    elements: DrawingElement[];
    complianceIssues: ComplianceIssue[];
    suggestedAnnotations: Annotation[];
    riskAreas: RiskArea[];
    standardsViolations: StandardsViolation[];
  }

  export interface DrawingElement {
    id: string;
    type: 'wall' | 'door' | 'window' | 'room' | 'dimension' | 'text' | 'symbol';
    coordinates: Coordinate[];
    properties: Record<string, any>;
    confidence: number;
  }

  export interface Coordinate {
    x: number;
    y: number;
  }

  export interface Annotation {
    id: string;
    drawing_id: string;
    page_number: number;
    type: AnnotationType;
    coordinates: Coordinate[];
    properties: AnnotationProperties;
    linked_defects: string[];
    photos: PhotoAttachment[];
    created_by: string;
    created_at: string;
    updated_at: string;
    version: number;
    ai_suggested?: boolean;
    ai_confidence?: number;
  }

  export enum AnnotationType {
    Point = 'point',
    Line = 'line',
    Arrow = 'arrow',
    Rectangle = 'rectangle',
    Circle = 'circle',
    Text = 'text',
    Freehand = 'freehand',
    Photo = 'photo',
    Dimension = 'dimension'
  }

  export interface AnnotationProperties {
    color: string;
    stroke_width: number;
    fill_color?: string;
    text?: string;
    font_size?: number;
    opacity: number;
    style: 'solid' | 'dashed' | 'dotted';
  }

  export interface DefectMarker {
    id: string;
    defect_id: string;
    drawing_id: string;
    page_number: number;
    coordinates: Coordinate;
    marker_type: 'pin' | 'circle' | 'highlight';
    properties: MarkerProperties;
    photos: PhotoAttachment[];
    annotations: string[]; // linked annotation IDs
  }

  export interface MarkerProperties {
    color: string;
    size: number;
    icon?: string;
  }

  export interface PhotoAttachment {
    id: string;
    file_path: string;
    thumbnail_path: string;
    coordinates?: Coordinate; // где на чертеже привязано
    description?: string;
    uploaded_at: string;
    ai_analysis?: any; // To be defined in AI types
  }

  export interface ComplianceIssue {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: Coordinate[];
    standard_reference?: string;
  }

  export interface RiskArea {
    id: string;
    type: string;
    risk_level: number; // 0-100
    description: string;
    area: Coordinate[];
  }

  export interface StandardsViolation {
    id: string;
    standard: string; // e.g. "GOST 21.501-2011"
    description: string;
    element_id?: string;
  }
