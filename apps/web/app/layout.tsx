import { Providers } from '@/components/providers';
import './globals.css';

export const metadata = {
  title: 'JobBot - AI Resume Assistant',
  description: 'Your AI-powered resume and job application assistant',
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