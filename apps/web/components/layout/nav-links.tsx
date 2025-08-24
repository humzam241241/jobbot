'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FileText,
  Briefcase,
  BookOpen,
  Settings,
  LogOut,
  Search
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  isReady?: boolean;
  comingSoonHref?: string;
}

const navLinks: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    isReady: true
  },
  {
    href: '/jobbot',
    label: 'Resume Generator',
    icon: FileText,
    isReady: true
  },
  {
    href: '/applications',
    label: 'Applications',
    icon: Briefcase,
    isReady: false,
    comingSoonHref: '/coming-soon'
  },
  {
    href: '/scraper',
    label: 'Job Scraper',
    icon: Search,
    isReady: false,
    comingSoonHref: '/coming-soon'
  },
  {
    href: '/library',
    label: 'Library',
    icon: BookOpen,
    isReady: false,
    comingSoonHref: '/coming-soon'
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    isReady: false,
    comingSoonHref: '/coming-soon'
  }
];

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center space-x-4">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <button
            key={link.href}
            onClick={() => {
              if (link.isReady) {
                router.push(link.href);
              } else {
                router.push(link.comingSoonHref || '/coming-soon');
              }
            }}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all
              ${isActive 
                ? 'text-[#00E5A0] bg-[#00E5A0]/10' 
                : 'text-gray-600 dark:text-gray-300 hover:text-[#00E5A0] hover:bg-[#00E5A0]/5'}
              ${!link.isReady && 'opacity-75'}
            `}
          >
            <Icon className="h-5 w-5 mr-2" />
            <span>{link.label}</span>
            {!link.isReady && (
              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                Soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}