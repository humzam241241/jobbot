import { SectionMap, SectionType, Rect } from '../analyzer/types';
import { ResumeDataType } from './json-schema';

/**
 * Content slot for rendering
 */
export interface ContentSlot {
  sectionType: SectionType;
  rect: Rect;
  content: any;
}

/**
 * Overflow content that didn't fit in the original slots
 */
export interface OverflowContent {
  profile?: string;
  skills?: string[];
  experience?: ResumeDataType['experience'];
  education?: ResumeDataType['education'];
  extras?: Record<string, any>;
}

/**
 * Map resume data to content slots based on the section map
 * @param resumeData Structured resume data
 * @param sectionMap Map of sections in the document
 * @returns Array of content slots
 */
export function mapResumeDataToSlots(
  resumeData: ResumeDataType,
  sectionMap: SectionMap
): { slots: ContentSlot[]; overflow: OverflowContent } {
  const slots: ContentSlot[] = [];
  const overflow: OverflowContent = {};
  
  // Track which sections have been mapped
  const mappedSections = new Set<SectionType>();
  
  // First, map sections that are explicitly identified
  for (const section of sectionMap.sections) {
    switch (section.label) {
      case SectionType.PROFILE:
        if (resumeData.profile) {
          slots.push({
            sectionType: SectionType.PROFILE,
            rect: section.rect,
            content: resumeData.profile
          });
          mappedSections.add(SectionType.PROFILE);
        }
        break;
        
      case SectionType.SKILLS:
        if (resumeData.skills && resumeData.skills.length > 0) {
          slots.push({
            sectionType: SectionType.SKILLS,
            rect: section.rect,
            content: resumeData.skills
          });
          mappedSections.add(SectionType.SKILLS);
        }
        break;
        
      case SectionType.EXPERIENCE:
        if (resumeData.experience && resumeData.experience.length > 0) {
          slots.push({
            sectionType: SectionType.EXPERIENCE,
            rect: section.rect,
            content: resumeData.experience
          });
          mappedSections.add(SectionType.EXPERIENCE);
        }
        break;
        
      case SectionType.EDUCATION:
        if (resumeData.education && resumeData.education.length > 0) {
          slots.push({
            sectionType: SectionType.EDUCATION,
            rect: section.rect,
            content: resumeData.education
          });
          mappedSections.add(SectionType.EDUCATION);
        }
        break;
        
      case SectionType.OTHER:
        if (resumeData.extras) {
          slots.push({
            sectionType: SectionType.OTHER,
            rect: section.rect,
            content: resumeData.extras
          });
          mappedSections.add(SectionType.OTHER);
        }
        break;
    }
  }
  
  // Check for unmapped sections and add to overflow
  if (!mappedSections.has(SectionType.PROFILE) && resumeData.profile) {
    overflow.profile = resumeData.profile;
  }
  
  if (!mappedSections.has(SectionType.SKILLS) && resumeData.skills && resumeData.skills.length > 0) {
    overflow.skills = resumeData.skills;
  }
  
  if (!mappedSections.has(SectionType.EXPERIENCE) && resumeData.experience && resumeData.experience.length > 0) {
    overflow.experience = resumeData.experience;
  }
  
  if (!mappedSections.has(SectionType.EDUCATION) && resumeData.education && resumeData.education.length > 0) {
    overflow.education = resumeData.education;
  }
  
  if (!mappedSections.has(SectionType.OTHER) && resumeData.extras) {
    overflow.extras = resumeData.extras;
  }
  
  return { slots, overflow };
}

/**
 * Calculate available space for content in a section
 * @param rect Section rectangle
 * @param padding Padding to apply
 * @returns Content rectangle
 */
export function calculateContentRect(rect: Rect, padding: number = 10): Rect {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    w: rect.w - padding * 2,
    h: rect.h - padding * 2,
    page: rect.page
  };
}
