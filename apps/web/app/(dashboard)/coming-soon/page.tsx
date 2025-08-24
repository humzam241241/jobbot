'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Rocket } from 'lucide-react';

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-[#00E5A0] to-[#4F46E5] opacity-30 animate-pulse" />
              <Rocket className="relative w-16 h-16 text-[#00E5A0] animate-bounce" />
            </div>
          </div>

          {/* Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mt-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Coming Soon
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#00E5A0] to-[#4F46E5] mx-auto mb-6" />
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              We're working hard to bring you something amazing. This feature will be available soon!
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-[#00E5A0] rounded-full animate-pulse" />
                <span>Under Development</span>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-[#00E5A0] to-[#4F46E5] rounded-lg hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </button>
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-[#00E5A0]/20 to-[#4F46E5]/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}