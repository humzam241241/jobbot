// apps/web/components/ui/UsageIndicator.tsx
"use client";

import React, { useState, useEffect } from "react";

interface UsageData {
  count: number;
  limit: number;
  remaining: number;
}

interface UsageIndicatorProps {
  className?: string;
}

/**
 * Component to display user's usage information
 */
export default function UsageIndicator({ className = "" }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage data on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/usage");
        
        if (!response.ok) {
          throw new Error(`Failed to fetch usage: ${response.status}`);
        }
        
        const data = await response.json();
        setUsage(data.usage);
      } catch (err) {
        console.error("Error fetching usage:", err);
        setError("Failed to load usage data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsage();
  }, []);
  
  if (loading) {
    return (
      <div className={`text-sm text-gray-400 ${className}`}>
        Loading usage...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`text-sm text-red-400 ${className}`}>
        {error}
      </div>
    );
  }
  
  if (!usage) {
    return null;
  }
  
  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage.count / usage.limit) * 100));
  
  // Determine color based on usage
  const getColor = () => {
    if (percentUsed >= 90) return "bg-red-500";
    if (percentUsed >= 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-300">
          Usage: {usage.count}/{usage.limit} ({usage.remaining} remaining)
        </span>
        <span className="text-xs font-medium text-gray-300">
          {percentUsed}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className={`${getColor()} h-2 rounded-full`} 
          style={{ width: `${percentUsed}%` }}
        ></div>
      </div>
    </div>
  );
}
