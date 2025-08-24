/**
 * PDF Processing Pipeline
 * 
 * This module exports the main functions for the PDF processing pipeline.
 */

// Export all PDF processing modules
export * from './analyzer/extract';
export * from './analyzer/blocks';
export * from './analyzer/headings';
export * from './analyzer/sections';
export * from './analyzer/ocr';
export * from './analyzer/types';
export * from './renderer/draw';
export * from './renderer/paginate';
export * from './renderer/render';
export * from './normalize/json-schema';
export * from './normalize/map-json-to-slots';
export * from './debug/overlay';

// Import for local use
import { extractTextItems, isLikelyScannedPdf } from './analyzer/extract';
import { groupIntoLines, groupIntoBlocks } from './analyzer/blocks';
import { buildSectionMap } from './analyzer/sections';
import { processScannedPdf, createBlocksFromOcrTextItems } from './analyzer/ocr';
import { parseResumeJson, SYSTEM_PROMPT, createUserPrompt } from './normalize/json-schema';
import { mapResumeDataToSlots } from './normalize/map-json-to-slots';
import { renderResume, renderFallbackResume } from './renderer/render';
import { createDebugOverlay, logDebug } from './debug/overlay';
import { SectionMap } from './analyzer/types';

/**
 * Options for resume generation
 */
export interface ResumeGenerationOptions {
  pdfBytes: Uint8Array;
  jobDescription: string;
  model?: string;
  debug?: boolean;
  strict?: boolean;
}

/**
 * Result of resume generation
 */
export interface ResumeGenerationResult {
  pdfBytes: Uint8Array;
  mode: 'inplace' | 'fallback';
  isScanned: boolean;
  sectionMap: SectionMap;
  debugInfo?: any;
}

/**
 * Main function to generate a tailored resume
 * @param options Resume generation options
 * @param llmCallback Function to call LLM with system and user prompts
 * @returns Result with modified PDF bytes
 */
export async function generateTailoredResume(
  options: ResumeGenerationOptions,
  llmCallback: (system: string, user: string, model?: string) => Promise<string>
): Promise<ResumeGenerationResult> {
  const { pdfBytes, jobDescription, model, debug = false, strict = false } = options;
  const debugInfo: any = {};
  
  // Step 1: Analyze PDF structure
  let textItems = await extractTextItems(pdfBytes);
  let isScanned = false;
  let mode: 'inplace' | 'fallback' = 'inplace';
  
  // Check if it's a scanned PDF
  if (isLikelyScannedPdf(textItems, textItems.length > 0 ? Math.max(...textItems.map(item => item.page)) + 1 : 1)) {
    isScanned = true;
    textItems = await processScannedPdf(pdfBytes);
    mode = 'fallback'; // Use fallback mode for scanned PDFs
  }
  
  // Group text items into lines and blocks
  const lines = groupIntoLines(textItems);
  const blocks = isScanned 
    ? createBlocksFromOcrTextItems(textItems) 
    : groupIntoBlocks(lines);
  
  // Build section map
  const sectionMap = buildSectionMap(blocks);
  
  // Check confidence level
  if (sectionMap.meta.lowConfidence || strict) {
    mode = 'fallback';
  }
  
  // Create debug overlay if enabled
  if (debug) {
    const debugDir = await createDebugOverlay(pdfBytes, sectionMap);
    debugInfo.debugDir = debugDir;
  }
  
  // Step 2: Extract text for LLM
  const resumeText = textItems.map(item => item.text).join(' ');
  
  // Step 3: Call LLM to generate structured content
  const llmResponse = await llmCallback(
    SYSTEM_PROMPT,
    createUserPrompt(resumeText, jobDescription),
    model
  );
  
  if (!llmResponse) {
    throw new Error('Failed to generate content from LLM');
  }
  
  // Step 4: Parse LLM response
  const resumeData = parseResumeJson(llmResponse);
  
  // Step 5: Map content to sections
  const { slots, overflow } = mapResumeDataToSlots(resumeData, sectionMap);
  
  // Step 6: Render PDF
  let modifiedPdfBytes;
  
  if (mode === 'inplace') {
    // In-place rendering
    modifiedPdfBytes = await renderResume(pdfBytes, resumeData, sectionMap, debug);
  } else {
    // Fallback rendering (append page)
    modifiedPdfBytes = await renderFallbackResume(pdfBytes, resumeData);
  }
  
  return {
    pdfBytes: modifiedPdfBytes,
    mode,
    isScanned,
    sectionMap,
    debugInfo: debug ? debugInfo : undefined
  };
}
