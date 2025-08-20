export const runtime = 'nodejs';

export async function GET() {
  const data = {
    FEATURE_INTERVIEW_PREP: process.env.FEATURE_INTERVIEW_PREP === 'true',
    FEATURE_NETWORKING: process.env.FEATURE_NETWORKING === 'true',
    FEATURE_AUTO_APPLY: process.env.FEATURE_AUTO_APPLY === 'true',
  };
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
