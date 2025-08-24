import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'JobBot - AI Resume Assistant',
  description: 'Tailor your resume to job descriptions with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}