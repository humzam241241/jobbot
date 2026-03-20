import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);

// Define custom types for NextAuth
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
    provider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    provider?: string;
  }
}

const useDatabase = (process.env.SKIP_DB !== '1') && Boolean(process.env.DATABASE_URL);

const baseProviders = [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
        access_type: "offline",
        prompt: "consent",
        response_type: "code"
      }
    }
  })
] as any[];

if (useDatabase) {
  baseProviders.push(
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          const passwordHash = (user as any)?.password || (user as any)?.passwordHash;
          if (!user || !passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, passwordHash);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: (user as any).id,
            email: (user as any).email,
            name: (user as any).name,
            role: (user as any).role || 'user',
          } as any;
        } catch (error) {
          console.error("Credentials auth error:", error);
          return null;
        }
      }
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: useDatabase ? PrismaAdapter(prisma) : undefined,
  useSecureCookies: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_SESSION_TOKEN ??
        ((process.env.NEXTAUTH_URL || '').startsWith('https://')
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token'),
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: (process.env.NEXTAUTH_URL || '').startsWith('https://'),
      },
    },
  },
  providers: baseProviders,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt" as const,
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 24 * 60 * 60
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account) {
        (token as any).accessToken = account.access_token;
        (token as any).refreshToken = account.refresh_token ?? (token as any).refreshToken;
        (token as any).expiresAt = Math.floor(Date.now() / 1000) + (account.expires_in ?? 3600);
      }

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = adminEmails.includes(user.email || '') ? 'admin' : 'user';
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = (token as any).expiresAt as number | undefined;
      if ((token as any).accessToken && expiresAt && now < expiresAt - 60) {
        return token;
      }

      const refreshToken = (token as any).refreshToken as string | undefined;
      if (refreshToken) {
        try {
          const body = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || '',
            client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          });
          const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const data: any = await res.json();
          if (!res.ok) throw data;
          (token as any).accessToken = data.access_token ?? (token as any).accessToken;
          (token as any).expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600);
          (token as any).refreshToken = data.refresh_token ?? (token as any).refreshToken;
        } catch (e) {
          (token as any).error = 'RefreshAccessTokenError';
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.provider = token.provider;
      }
      (session as any).accessToken = (token as any).accessToken as string | undefined;
      (session as any).tokenError = (token as any).error;
      return session;
    },
    async signIn({ user, account, profile, email }) {
      try {
        if (account?.provider === "google" && user?.email) {
          return true;
        }
        if (account?.provider === "credentials") {
          return true;
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {}
      return baseUrl;
    }
  },
  events: {
    async signIn(message) {
      try {
        console.log('[auth:event] signIn', {
          provider: (message as any)?.account?.provider,
          userEmail: (message as any)?.user?.email,
        });
      } catch {}
    },
    async error(error) {
      try {
        console.error('[auth:event] error', {
          name: (error as any)?.name,
          message: (error as any)?.message,
          cause: (error as any)?.cause,
        });
      } catch {}
    },
  },
  pages: {
    signIn: '/login'
  },
  debug: true,
};
