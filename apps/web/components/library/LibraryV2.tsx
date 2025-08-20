'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { NAV_ITEMS } from '../layout/nav-links';
import { pathOf } from '@/lib/routes';

interface LibraryItem {
  kitId: string;
  createdAt: string;
  jobTitle: string;
  companyName: string;
  jobUrl: string;
  ats: {
    score: number;
  };
  files: {
    resume: string;
    coverLetter: string;
  };
}

export default function LibraryV2() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // Track which item is being added
  const [showFileManager, setShowFileManager] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchLibraryItems() {
      try {
        const res = await fetch('/api/library');
        const data = await res.json();
        if (data.ok) {
          setItems(data.items);
        } else {
          setError(data.error || 'Failed to fetch library items');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchLibraryItems();
  }, []);
  
  const handleAddApplication = async (item: LibraryItem) => {
    setAdding(item.kitId);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: item.jobTitle,
          companyName: item.companyName,
          jobUrl: item.jobUrl,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        // Optionally, provide feedback to the user
        alert('Application added successfully!');
        router.push('/applications'); // Redirect to applications page
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('An unexpected error occurred while adding the application.');
    } finally {
      setAdding(null);
    }
  };
  
  // Find File Manager link
  const fileManagerLink = NAV_ITEMS.find(item => item.showInLibrary)?.href || pathOf("fileManager");

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toggle between Library and File Manager */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Generated Content</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFileManager(false)}
            className={`px-3 py-1 text-sm rounded-md ${
              !showFileManager 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Resume Kits
          </button>
          <button
            onClick={() => setShowFileManager(true)}
            className={`px-3 py-1 text-sm rounded-md flex items-center gap-1 ${
              showFileManager 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>File Manager</span>
          </button>
        </div>
      </div>
      
      {/* Show either Library or File Manager */}
      {showFileManager ? (
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-gray-300 mb-4">
            Access all your generated files in the File Manager.
          </p>
          <Link 
            href={fileManagerLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Open File Manager
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No resume kits found in your library.</p>
          <p className="mt-2 text-sm">
            Generate your first resume kit in the JobBot section.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.kitId} className="p-4 border border-neutral-700 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{item.jobTitle}</h3>
                  <p className="text-sm text-neutral-400">{item.companyName}</p>
                  <p className="text-xs text-neutral-500">
                    Generated on: {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{item.ats.score}</p>
                  <p className="text-xs text-neutral-500">ATS Score</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-4">
                  {item.files?.resume && (
                    <Link href={`/generated/${item.kitId}/${item.files.resume}`} className="text-sm text-emerald-400 hover:underline" download>
                      Download Resume
                    </Link>
                  )}
                  {item.files?.coverLetter && (
                    <Link href={`/generated/${item.kitId}/${item.files.coverLetter}`} className="text-sm text-emerald-400 hover:underline" download>
                      Download Cover Letter
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddApplication(item)}
                    disabled={adding === item.kitId}
                    className="text-sm px-3 py-1 bg-emerald-700/30 text-emerald-400 border border-emerald-700 rounded-md hover:bg-emerald-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {adding === item.kitId ? 'Adding...' : 'Add to Applications'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
