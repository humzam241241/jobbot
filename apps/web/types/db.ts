export interface User {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
  credits: number;
  maxCredits: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ResumeKit {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  originalResume: string;
  jobDescription: string;
  tailoredResume?: string;
  coverLetter?: string;
  atsReport?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDb {
  users: User[];
  resumeKits: ResumeKit[];
}
