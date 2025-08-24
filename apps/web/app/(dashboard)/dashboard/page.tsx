'use client';

import { useRouter } from 'next/navigation';
import { 
  FileText, 
  BookOpen, 
  Briefcase,
  ArrowRight,
  Search
} from 'lucide-react';

interface QuickLinkProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isReady?: boolean;
}

function QuickLink({ href, title, description, icon, isReady = true }: QuickLinkProps) {
  const router = useRouter();

  const handleClick = () => {
    if (isReady) {
      router.push(href);
    } else {
      router.push('/coming-soon');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl cursor-pointer
        ${isReady ? 'hover:scale-105' : 'opacity-75'}
        before:absolute before:inset-0 before:rounded-xl before:transition-opacity before:duration-300
        before:opacity-0 group-hover:before:opacity-100 before:bg-gradient-to-r before:from-[#00E5A0]/20 before:to-[#00E5A0]/5`}
    >
      <div className="relative z-10">
        <div className="flex items-center">
          <div className="p-2 bg-[#00E5A0]/10 rounded-lg">
            {icon}
          </div>
          {!isReady && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Coming Soon
            </span>
          )}
        </div>
        <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {description}
        </p>
        <div className="mt-4 flex items-center text-[#00E5A0]">
          <span className="text-sm font-medium">Learn more</span>
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Welcome to JobBot
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <QuickLink
          href="/jobbot"
          title="Resume Generator"
          description="Create tailored resumes with AI assistance"
          icon={<FileText className="h-6 w-6 text-[#00E5A0]" />}
          isReady={true}
        />
        
        <QuickLink
          href="/applications"
          title="Applications"
          description="Track your job applications and status"
          icon={<Briefcase className="h-6 w-6 text-[#00E5A0]" />}
          isReady={false}
        />
        
        <QuickLink
          href="/scraper"
          title="Job Scraper"
          description="Find relevant job postings automatically"
          icon={<Search className="h-6 w-6 text-[#00E5A0]" />}
          isReady={false}
        />
        
        <QuickLink
          href="/library"
          title="Library"
          description="Access your saved resumes and templates"
          icon={<BookOpen className="h-6 w-6 text-[#00E5A0]" />}
          isReady={false}
        />
      </div>
    </div>
  );
}