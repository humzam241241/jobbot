"use client";

interface Profile {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  }>;
  education: Array<{
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
}

export interface ErrorResponse {
  ok: false;
  code: string;
  message: string;
  hint?: string;
  provider?: string;
  model?: string;
  rawPreview?: string;
  traceId: string;
  baselineResumePdfBase64?: string;
  links?: {
    resumePdf?: string;
    resumeDocx?: string;
  };
  profile?: Partial<Profile>;
}

export interface SuccessResponse {
  ok: true;
  traceId: string;
  profile: Partial<Profile>;
  links: {
    resumePdf: string;
    resumeDocx: string;
    coverLetterPdf?: string;
    coverLetterDocx?: string;
    atsReportPdf?: string;
  };
  score?: number;
  usage: {
    count: number;
    remaining: number;
  };
}

export type ResumeKitResponse = SuccessResponse | ErrorResponse;

export type GeneratePayload = {
  file: File; // user resume (pdf or docx)
  jd: string; // job description text (or extracted)
  jdUrl?: string; // optional job URL
  model?: string; // optional model selection
  profile?: Profile; // optional pre-extracted profile
};

export class ResumeKitError extends Error {
  status: number;
  code: string;
  hint?: string;
  provider?: string;
  model?: string;
  rawPreview?: string;
  traceId?: string;
  baselineResumePdfBase64?: string;
  links?: {
    resumePdf?: string;
    resumeDocx?: string;
  };
  profile?: Partial<Profile>;

  constructor(message: string, errorResponse: Partial<ErrorResponse> & { status: number }) {
    super(message);
    this.name = "ResumeKitError";
    this.status = errorResponse.status;
    this.code = errorResponse.code || "UNKNOWN_ERROR";
    this.hint = errorResponse.hint;
    this.provider = errorResponse.provider;
    this.model = errorResponse.model;
    this.rawPreview = errorResponse.rawPreview;
    this.traceId = errorResponse.traceId;
    this.baselineResumePdfBase64 = errorResponse.baselineResumePdfBase64;
    this.links = errorResponse.links;
    this.profile = errorResponse.profile;
  }
}

export async function generateResumeKit({ file, jd, jdUrl, model, profile }: GeneratePayload): Promise<ResumeKitResponse> {
  const form = new FormData();
  form.append("resume", file);
  form.append("jdText", jd);
  if (jdUrl) form.append("jdUrl", jdUrl);
  if (model) form.append("model", model);
  if (profile) form.append("profile", JSON.stringify(profile));

  const res = await fetch("/api/resume/generate", {
    method: "POST",
    body: form,
  });
  
  const data = await res.json();
  
  if (!res.ok || !data.ok) {
    throw new ResumeKitError(
      data.message || `Generate failed: ${res.status}`,
      {
        ...data,
        status: res.status
      }
    );
  }
  
  return data as SuccessResponse;
}