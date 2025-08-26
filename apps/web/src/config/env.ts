import 'server-only';
import { z } from 'zod';

const redact = (v?: string | null) => (v && v.length > 4 ? `****${v.slice(-4)}` : '(empty)');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Server-only
  NEXTAUTH_SECRET: z.string().min(10),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Client-safe (prefixed)
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_APP_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
  throw new Error(`Invalid environment configuration: ${issues}`);
}

const env = parsed.data;

export const serverEnv = {
  NODE_ENV: env.NODE_ENV,
  NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: env.NEXTAUTH_URL,
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  DATABASE_URL: env.DATABASE_URL,
  REDIS_URL: env.REDIS_URL,
  OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
  OPENAI_API_KEY: env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
  SENTRY_DSN: env.SENTRY_DSN,
  SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
};

export const clientEnv = {
  NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_GOOGLE_API_KEY: env.NEXT_PUBLIC_GOOGLE_API_KEY,
  NEXT_PUBLIC_GOOGLE_APP_ID: env.NEXT_PUBLIC_GOOGLE_APP_ID,
};

export { redact };


