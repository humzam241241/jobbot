'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { toast } from 'react-hot-toast';

interface NavLink {
  href: string;
  label: string;
  isReady?: boolean;
}

const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', isReady: true },
  { href: '/jobbot', label: 'JobBot', isReady: true },
  { href: '/applications', label: 'Applications', isReady: false },
  { href: '/library', label: 'Library', isReady: false },
  { href: '/settings', label: 'Settings', isReady: false },
];

interface NavbarProps {
  credits?: number;
  maxCredits?: number;
}

export function Navbar({ credits = 0, maxCredits = 10 }: NavbarProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut({ redirect: true, callbackUrl: '/login' });
    } catch (error) {
      toast.error('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <nav className="bg-white shadow-lg dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard">
                <Logo size="md" variant="dark" showText={false} />
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.isReady ? link.href : '#'}
                  onClick={(e) => {
                    if (!link.isReady) {
                      e.preventDefault();
                      toast.info('Coming soon!');
                    }
                  }}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
                    pathname === link.href
                      ? 'border-blue-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white'
                  } ${!link.isReady ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {link.label}
                  {!link.isReady && ' (Soon)'}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Credits Counter */}
            <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
              Credits: <span className="text-blue-600 dark:text-blue-400">{credits}/{maxCredits}</span>
            </div>
            
            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
