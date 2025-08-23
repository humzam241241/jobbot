import './globals.css'
import AuthProvider from '@/components/AuthProvider';
import { Analytics } from "@vercel/analytics/react";
import TopNav from '@/components/layout/TopNav';
import SessionWatcher from './(components)/SessionWatcher';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: "JobBot",
  description: "AI-powered resume tailoring and job application assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head></head>
      <body className="bg-background text-foreground antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <TopNav />
            <SessionWatcher />
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

