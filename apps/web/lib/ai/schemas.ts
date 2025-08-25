import { z } from "zod";

export const TailoringPlanSchema = z.object({
  targetRole: z.string().min(2),
  matchedKeywords: z.array(z.string()).default([]),
  addBullets: z.array(z.object({
    section: z.enum(['experience','projects','skills']),
    target: z.string(),            // role/project/section target
    bullets: z.array(z.string()).min(1)
  })).default([]),
  removeBullets: z.array(z.object({
    target: z.string(),
    reasons: z.array(z.string()).default([])
  })).default([]),
  summaryRewrite: z.string().min(20),
  skillsAdd: z.array(z.string()).default([]),
  skillsRemove: z.array(z.string()).default([]),
  orderingHints: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
});

export type TailoringPlan = z.infer<typeof TailoringPlanSchema>;
