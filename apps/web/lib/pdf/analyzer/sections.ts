import { Block, Section, SectionMap, SectionType, Rect, ConfidenceLevel } from './types';
import { detectHeadings } from './headings';
import { detectColumns } from './blocks';
import _ from 'lodash';

/**
 * Build a section map from blocks and detected headings
 * @param blocks Array of blocks
 * @returns SectionMap object
 */
export function buildSectionMap(blocks: Block[]): SectionMap {
  // Group blocks by page
  const blocksByPage = _.groupBy(blocks, 'page');
  const pages = Object.keys(blocksByPage).map(Number);
  
  // Detect headings
  const headingBlocks = detectHeadings(blocks);
  
  // Initialize section map
  const sectionMap: SectionMap = {
    sections: [],
    meta: {
      columnCountByPage: {}
    }
  };
  
  // Detect columns for each page
  for (const page of pages) {
    const pageBlocks = blocksByPage[page] || [];
    sectionMap.meta.columnCountByPage[page] = detectColumns(pageBlocks);
  }
  
  // If we have headings, use them to define sections
  if (headingBlocks.length > 0) {
    // Sort headings by page and y-position
    const sortedHeadings = [...headingBlocks].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.rect.y - b.rect.y;
    });
    
    // Create sections from headings
    for (let i = 0; i < sortedHeadings.length; i++) {
      const heading = sortedHeadings[i];
      const nextHeading = sortedHeadings[i + 1];
      
      // Find blocks that belong to this section
      const sectionBlocks = blocks.filter(block => {
        // Must be on the same page as the heading
        if (block.page !== heading.page) return false;
        
        // Must be below the heading
        if (block.rect.y < heading.rect.y) return false;
        
        // Must be above the next heading (if there is one on the same page)
        if (nextHeading && nextHeading.page === heading.page && block.rect.y >= nextHeading.rect.y) {
          return false;
        }
        
        // Must be in the same column (approximate check)
        const columnCount = sectionMap.meta.columnCountByPage[heading.page] || 1;
        if (columnCount > 1) {
          const pageWidth = Math.max(...blocks.filter(b => b.page === heading.page).map(b => b.rect.x + b.rect.w));
          const columnWidth = pageWidth / columnCount;
          
          const headingColumn = Math.floor(heading.rect.x / columnWidth);
          const blockColumn = Math.floor(block.rect.x / columnWidth);
          
          if (headingColumn !== blockColumn) return false;
        }
        
        return true;
      });
      
      // Calculate section rectangle
      const sectionRect = calculateSectionRect(heading, sectionBlocks);
      
      // Add section to map
      sectionMap.sections.push({
        label: heading.sectionType,
        confidence: heading.confidence,
        page: heading.page,
        rect: sectionRect,
        blocks: [heading, ...sectionBlocks].filter(block => block !== heading) // Remove the heading from blocks if it's there
      });
    }
  } else {
    // No headings detected, try to infer sections
    sectionMap.meta.lowConfidence = true;
    
    // Group blocks by page
    for (const page of pages) {
      const pageBlocks = blocksByPage[page] || [];
      
      // Sort blocks by y-position
      const sortedBlocks = [...pageBlocks].sort((a, b) => a.rect.y - b.rect.y);
      
      // Try to infer sections based on content patterns
      const inferredSections = inferSectionsFromBlocks(sortedBlocks);
      
      // Add inferred sections to the map
      sectionMap.sections.push(...inferredSections);
    }
  }
  
  // If we still don't have any sections, create a generic one
  if (sectionMap.sections.length === 0) {
    for (const page of pages) {
      const pageBlocks = blocksByPage[page] || [];
      if (pageBlocks.length === 0) continue;
      
      // Calculate page rect
      const pageRect = calculateBoundingRect(pageBlocks.map(block => block.rect));
      
      // Add a generic section
      sectionMap.sections.push({
        label: SectionType.UNKNOWN,
        confidence: ConfidenceLevel.LOW,
        page,
        rect: pageRect,
        blocks: pageBlocks
      });
    }
  }
  
  return sectionMap;
}

/**
 * Calculate the bounding rectangle for a section based on heading and content blocks
 * @param heading Heading block
 * @param contentBlocks Content blocks
 * @returns Bounding rectangle for the section
 */
function calculateSectionRect(heading: Block, contentBlocks: Block[]): Rect {
  // Start with the heading rect
  const rect: Rect = { ...heading.rect };
  
  // Expand to include all content blocks
  for (const block of contentBlocks) {
    rect.x = Math.min(rect.x, block.rect.x);
    rect.y = Math.min(rect.y, block.rect.y);
    
    const right = Math.max(rect.x + rect.w, block.rect.x + block.rect.w);
    const bottom = Math.max(rect.y + rect.h, block.rect.y + block.rect.h);
    
    rect.w = right - rect.x;
    rect.h = bottom - rect.y;
  }
  
  return rect;
}

/**
 * Calculate a bounding rectangle that encompasses all input rectangles
 * @param rects Array of rectangles
 * @returns Bounding rectangle
 */
function calculateBoundingRect(rects: Rect[]): Rect {
  if (rects.length === 0) {
    throw new Error('Cannot calculate bounding rect for empty rects array');
  }
  
  const page = rects[0].page;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    page
  };
}

/**
 * Infer sections from blocks based on content patterns when no headings are detected
 * @param blocks Array of blocks sorted by y-position
 * @returns Array of inferred sections
 */
export function inferSectionsFromBlocks(blocks: Block[]): Section[] {
  if (blocks.length === 0) return [];
  
  const page = blocks[0].page;
  const sections: Section[] = [];
  
  // Look for patterns in the blocks
  
  // Pattern 1: Skills section (bullet points or comma-separated lists)
  const skillsBlocks = blocks.filter(block => {
    const text = block.lines.map(line => line.text).join(' ');
    // Check for bullet points
    if (/[•\-–*]/.test(text)) return true;
    // Check for comma-separated list
    if (text.split(',').length > 3) return true;
    return false;
  });
  
  if (skillsBlocks.length > 0) {
    const skillsRect = calculateBoundingRect(skillsBlocks.map(block => block.rect));
    sections.push({
      label: SectionType.SKILLS,
      confidence: ConfidenceLevel.LOW,
      page,
      rect: skillsRect,
      blocks: skillsBlocks
    });
  }
  
  // Pattern 2: Experience section (date patterns, job titles)
  const experienceBlocks = blocks.filter(block => {
    const text = block.lines.map(line => line.text).join(' ');
    // Check for date patterns (e.g., "2018 - 2020", "Jan 2018 - Present")
    if (/\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}|present|current\b/i.test(text)) return true;
    // Check for job title patterns
    if (/\b(senior|junior|lead|manager|director|engineer|developer|analyst|consultant|specialist)\b/i.test(text)) return true;
    return false;
  });
  
  if (experienceBlocks.length > 0) {
    const experienceRect = calculateBoundingRect(experienceBlocks.map(block => block.rect));
    sections.push({
      label: SectionType.EXPERIENCE,
      confidence: ConfidenceLevel.LOW,
      page,
      rect: experienceRect,
      blocks: experienceBlocks
    });
  }
  
  // Pattern 3: Education section (degree names, school names)
  const educationBlocks = blocks.filter(block => {
    const text = block.lines.map(line => line.text).join(' ');
    // Check for degree patterns
    if (/\b(bachelor|master|phd|doctorate|bs|ba|ms|ma|mba|bsc|msc)\b/i.test(text)) return true;
    // Check for university/college patterns
    if (/\b(university|college|school|institute|academy)\b/i.test(text)) return true;
    // Check for GPA patterns
    if (/\bgpa\s*[:=]?\s*\d+\.\d+\b/i.test(text)) return true;
    return false;
  });
  
  if (educationBlocks.length > 0) {
    const educationRect = calculateBoundingRect(educationBlocks.map(block => block.rect));
    sections.push({
      label: SectionType.EDUCATION,
      confidence: ConfidenceLevel.LOW,
      page,
      rect: educationRect,
      blocks: educationBlocks
    });
  }
  
  // If we have sections, remove blocks that are already assigned
  const assignedBlocks = new Set(
    sections.flatMap(section => section.blocks).map(block => JSON.stringify(block.rect))
  );
  
  // Remaining blocks could be profile or other
  const remainingBlocks = blocks.filter(
    block => !assignedBlocks.has(JSON.stringify(block.rect))
  );
  
  if (remainingBlocks.length > 0) {
    // First few blocks are likely profile/summary
    const topBlocks = remainingBlocks.slice(0, Math.min(3, remainingBlocks.length));
    const profileRect = calculateBoundingRect(topBlocks.map(block => block.rect));
    
    sections.push({
      label: SectionType.PROFILE,
      confidence: ConfidenceLevel.LOW,
      page,
      rect: profileRect,
      blocks: topBlocks
    });
    
    // Rest could be other sections
    const otherBlocks = remainingBlocks.slice(Math.min(3, remainingBlocks.length));
    
    if (otherBlocks.length > 0) {
      const otherRect = calculateBoundingRect(otherBlocks.map(block => block.rect));
      sections.push({
        label: SectionType.OTHER,
        confidence: ConfidenceLevel.LOW,
        page,
        rect: otherRect,
        blocks: otherBlocks
      });
    }
  }
  
  return sections;
}
