import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './db';
import { createLogger } from './logger';

const logger = createLogger('auth');

// Check if database is enabled
const isDbEnabled = process.env.SKIP_DB !== '1';

export const authOptions: NextAuthOptions = {
  adapter: isDbEnabled ? PrismaAdapter(prisma) : undefined,
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!isDbEnabled) {
          logger.warn('Database disabled, using mock auth');
          return {
            id: '1',
            email: credentials?.email || 'test@example.com',
            name: 'Test User'
          };
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error('No user found with this email');
        }

        // In production, use proper password comparison
        if (credentials.password !== user.password) {
          throw new Error('Invalid password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  
  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      logger.info('Sign in attempt', {
        user: { id: user.id, email: user.email },
        provider: account?.provider
      });
      return true;
    },

    async redirect({ url, baseUrl }) {
      logger.info('Redirect callback', { url, baseUrl });
      
      // Always redirect to dashboard after successful sign in
      return '/dashboard';
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  
  events: {
    async signIn(message) {
      logger.info('User signed in', {
        userId: message.user.id,
        email: message.user.email,
        provider: message.account?.provider
      });
    },
    async signOut(message) {
      logger.info('User signed out', {
        userId: message.token.sub
      });
    }
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  
  logger: {
    error(code, metadata) {
      logger.error(code, metadata);
    },
    warn(code) {
      logger.warn(code);
    },
    debug(code, metadata) {
      logger.debug(code, metadata);
    }
  }
};