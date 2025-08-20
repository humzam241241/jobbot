'use client';

import { useState, useEffect } from 'react';
import { TrackToggle } from '@/components/ui/TrackToggle';

interface GeneratedFile {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

export default function FileManager() {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchFiles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/file-manager');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch files');
      }
      setFiles(data.files);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  async function handleDelete(filePath: string) {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }
    try {
      const res = await fetch('/api/file-manager', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }
      // Refresh file list
      await fetchFiles();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading files...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-background/40">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Created At</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Track</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {files.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
                No generated files found.
              </td>
            </tr>
          ) : (
            files.map((file) => (
              <tr key={file.path}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href={file.path} download className="text-primary hover:underline">{file.name}</a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(file.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <TrackToggle 
                    sourceType="file" 
                    sourceId={file.path} 
                    title={file.name}
                    company={file.name.split('-')[0] || "Unknown"}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDelete(file.path)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
