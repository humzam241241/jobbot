// Re-export authOptions from the NextAuth route for convenience
// This allows imports like: import { authOptions } from '@/lib/auth'
export { authOptions } from '@/app/api/auth/[...nextauth]/route';
