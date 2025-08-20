"use client";
import { useEffect, useState } from "react";

export function usePoll<T>(url: string | null, intervalMs: number = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setData(null);
      setErr(null);
      return;
    }

    let isCancelled = false;
    
    async function fetchData() {
      if (isCancelled) return;
      
      setLoading(true);
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        
        if (!isCancelled) {
          setData(result);
          setErr(null);
        }
      } catch (error: any) {
        if (!isCancelled) {
          setErr(error.message || "Failed to fetch data");
          setData(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchData();

    // Set up polling
    const interval = setInterval(fetchData, intervalMs);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [url, intervalMs]);

  return { data, err, loading };
}
