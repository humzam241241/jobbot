import { Providers } from '@/components/providers';
import './globals.css';

export const metadata = {
  title: 'JobBot - AI Resume Assistant',
  description: 'Your AI-powered resume and job application assistant',
  // Use existing project logo as the favicon to avoid 404s in dev
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}