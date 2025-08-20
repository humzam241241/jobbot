export interface ResumeHeader {
  name: string;
  phone: string;
  email: string;
  location: string;
  links: { label: string; url: string; }[];
}

export interface SkillCategory {
  name: string;
  skills: string[];
}

export interface ExperienceItem {
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface ProjectItem {
  name: string;
  date: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  school: string;
  dates: string;
  details: string[];
}

export type GenerationStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "processing" | "completed" | "error";
};

export interface GenerationMetrics {
  atsScore: number;
  words: number;
  generationMs: number;
}

export interface GenerationResult {
  zipUrl: string;
  metrics: GenerationMetrics;
}
