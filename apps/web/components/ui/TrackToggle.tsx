"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface TrackToggleProps {
  sourceType: string;
  sourceId: string;
  title?: string;
  company?: string;
  className?: string;
}

export function TrackToggle({ sourceType, sourceId, title, company, className = "" }: TrackToggleProps) {
  const { data: session } = useSession();
  const [isTracked, setIsTracked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    
    // Check if this item is already tracked
    async function checkTracking() {
      try {
        const res = await fetch(`/api/applications/check?sourceType=${sourceType}&sourceId=${sourceId}`);
        if (res.ok) {
          const data = await res.json();
          setIsTracked(data.isTracked);
        }
      } catch (error) {
        console.error("Error checking tracking status:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkTracking();
  }, [sourceType, sourceId, session?.user]);

  const toggleTracking = async () => {
    if (!session?.user) return;
    
    setIsLoading(true);
    try {
      const endpoint = isTracked ? '/api/applications/untrack' : '/api/applications/track';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, sourceId, title, company }),
      });
      
      if (res.ok) {
        setIsTracked(!isTracked);
      } else {
        console.error("Failed to toggle tracking");
      }
    } catch (error) {
      console.error("Error toggling tracking:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className={`flex items-center ${className}`}>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isTracked}
            onChange={toggleTracking}
            disabled={isLoading}
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            isTracked ? 'bg-primary' : 'bg-muted'
          }`}></div>
          <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
            isTracked ? 'transform translate-x-5' : ''
          }`}></div>
        </div>
        <span className="ml-2 text-xs text-muted-foreground">
          {isTracked ? 'Tracked' : 'Track in Applications'}
        </span>
      </label>
    </div>
  );
}
