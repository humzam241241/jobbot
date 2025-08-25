'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { 
  Home, 
  FileText, 
  Briefcase, 
  Search, 
  BookOpen, 
  Settings,
  LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    isReady: true
  },
  {
    href: '/jobbot',
    label: 'Resume Generator Kit',
    icon: FileText,
    isReady: true
  },
  {
    href: '/applications',
    label: 'Applications',
    icon: Briefcase,
    isReady: false
  },
  {
    href: '/scraper',
    label: 'Job Scraper',
    icon: Search,
    isReady: false
  },
  {
    href: '/library',
    label: 'Library',
    icon: BookOpen,
    isReady: false
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    isReady: false
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { credits } = useAuth();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex h-16 items-center justify-between px-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Logo size="sm" className="h-8 w-8" />
            </div>

            {/* Navigation */}
            <nav className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.isReady ? item.href : '#'}
                    className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive 
                        ? 'bg-[#00E5A0]/10 text-[#00E5A0]' 
                        : 'text-gray-600 hover:bg-gray-100'
                    } ${!item.isReady && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                    {!item.isReady && (
                      <span className="ml-2 text-xs bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Credits: <span className="font-medium">{credits}/30</span>
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 text-sm text-white bg-[#4F46E5] rounded-md hover:bg-[#4F46E5]/90 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}