export interface User {
  id: string;
  email: string | null;
  name?: string | null;
  image?: string | null;
  credits: number;
  maxCredits: number;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}