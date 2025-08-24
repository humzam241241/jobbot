export type ResumeKitStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ResumeKit {
  id: string;
  userId: string;
  status: ResumeKitStatus;
  originalResume: string;
  jobDescription: string;
  tailoredResume?: string;
  coverLetter?: string;
  atsReport?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
