export interface Experience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface Education {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  name: string;
  description: string;
  bullets: string[];
  technologies: string[];
}

export interface Profile {
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
}