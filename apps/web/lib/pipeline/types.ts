import { z } from "zod";

export const ContentItemSchema = z.object({
  type: z.enum(["paragraph", "bullet", "subheading"]),
  text: z.string().min(1)
});

export const SectionSchema = z.object({
  id: z.string(),
  heading: z.string().min(1),
  order: z.number().int(),
  content: z.array(ContentItemSchema)
});

export const StyleSchema = z.object({
  fontFamily: z.string().optional(),
  baseFontSize: z.number().optional(),
  headingScale: z.number().optional(),
  bulletStyle: z.enum(["disc", "square", "dash"]).optional(),
});

export const MetaSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(z.string()).optional(),
});

export const ResumeJSONSchema = z.object({
  meta: MetaSchema.optional(),
  style: StyleSchema.optional(),
  sections: z.array(SectionSchema).min(1)
});

export type ResumeJSON = z.infer<typeof ResumeJSONSchema>;

export const CoverLetterSchema = z.object({
  greeting: z.string(),
  intro: z.string(),
  body: z.array(z.string()).min(1),
  closing: z.string(),
  signature: z.string()
});

export const TailoredOutputSchema = z.object({
  resume: ResumeJSONSchema,
  coverLetter: CoverLetterSchema
});

export type TailoredOutput = z.infer<typeof TailoredOutputSchema>;

export function makeId(prefix = "sec") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
