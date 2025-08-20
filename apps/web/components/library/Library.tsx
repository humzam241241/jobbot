'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // Track which item is being added
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (items.length === 0) {
    return <div>No resume kits found in your library.</div>;
  }

  return (
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
              <input 
                type="checkbox" 
                id={`add-app-${item.kitId}`} 
                className="rounded"
                onChange={() => handleAddApplication(item)}
                disabled={adding === item.kitId}
              />
              <label htmlFor={`add-app-${item.kitId}`} className="text-sm">
                {adding === item.kitId ? 'Adding...' : 'Add to Applications'}
              </label>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
