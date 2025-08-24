'use client';

import { signOut } from 'next-auth/react';
import { Logo } from '@/components/ui/Logo';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  FileText, 
  Briefcase, 
  Search, 
  BookOpen, 
  Settings 
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  isReady?: boolean;
}

const navItems: NavItem[] = [
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
  const router = useRouter();

  const handleNavigation = (href: string, isReady: boolean) => {
    if (isReady) {
      router.push(href);
    } else {
      router.push('/coming-soon');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left section with logo */}
            <div className="flex-shrink-0 flex items-center">
              <Logo size="sm" className="h-10 w-10" /> {/* Increased from h-8 w-8 to h-10 w-10 */}
            </div>

            {/* Center section with navigation */}
            <nav className="flex-1 flex justify-center space-x-2 px-4"> {/* Increased space-x-1 to space-x-2 */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href, item.isReady)}
                    className={`flex items-center px-3 py-2 rounded-md transition-all text-sm
                      ${isActive 
                        ? 'bg-[#00E5A0]/10 text-[#00E5A0]' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                      ${!item.isReady && 'opacity-75'}
                    `}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                    {!item.isReady && (
                      <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right section with credits and sign out */}
            <div className="flex-shrink-0 flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Credits: <span className="font-medium">30/30</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-3 py-1.5 text-sm font-medium text-white bg-[#4F46E5] rounded-md hover:bg-[#4F46E5]/90 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="py-6">
        {children}
      </main>
    </div>
  );
}