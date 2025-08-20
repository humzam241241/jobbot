import './globals.css'
import AuthProvider from '@/components/AuthProvider';
import { Analytics } from "@vercel/analytics/react";
import TopNav from '@/components/layout/TopNav';
import SessionWatcher from './(components)/SessionWatcher';

export const metadata = {
  title: "JobBot",
  description: "AI-powered resume tailoring and job application assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head></head>
      <body className="bg-background text-foreground antialiased">
        <AuthProvider>
          <TopNav />
          <SessionWatcher />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

