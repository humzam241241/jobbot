/**
 * Types for PDF analysis and processing
 */

/**
 * Represents a rectangle with position, dimensions, and page number
 */
export type Rect = { 
  x: number; 
  y: number; 
  w: number; 
  h: number; 
  page: number;
};

/**
 * Represents a text item extracted from a PDF
 */
export type TextItem = {
  page: number;
  text: string;
  x: number; 
  y: number; 
  w: number; 
  h: number;
  fontSize: number;
  fontName?: string;
  boldGuess?: boolean; // infer from fontName/embedded flags
  capsRatio?: number;  // % uppercase
  lineId?: string;
};

/**
 * Represents a block of text (multiple lines in the same column)
 */
export type Block = {
  page: number;
  rect: Rect;
  lines: TextItem[];     // contiguous, same column
};

/**
 * Represents a section of the resume with a label and content blocks
 */
export type Section = {
  label: string;         // e.g., 'profile','skills','experience','education','other'
  confidence: number;    // 0..1
  page: number;
  rect: Rect;            // where content currently lives
  blocks: Block[];
};

/**
 * Represents the mapping of sections in the document
 */
export type SectionMap = {
  sections: Section[];
  meta: { 
    columnCountByPage: Record<number, 1|2|3>;
    lowConfidence?: boolean;
  };
};

/**
 * Types of sections in a resume
 */
export enum SectionType {
  PROFILE = 'profile',
  SKILLS = 'skills',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  OTHER = 'other',
  UNKNOWN = 'unknown'
}

/**
 * Confidence levels for section detection
 */
export enum ConfidenceLevel {
  HIGH = 0.8,
  MEDIUM = 0.5,
  LOW = 0.3
}

/**
 * Result of PDF analysis
 */
export type AnalysisResult = {
  sectionMap: SectionMap;
  textItems: TextItem[];
  blocks: Block[];
  pageCount: number;
  dimensions: {
    width: number;
    height: number;
  };
  lowConfidence: boolean;
};
