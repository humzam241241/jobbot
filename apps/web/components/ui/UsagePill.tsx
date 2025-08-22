"use client";

import React, { useState, useEffect } from "react";
import { createDevLogger } from "@/lib/utils/devLogger";

const logger = createDevLogger("ui:usagePill");

interface UsageData {
  count: number;
  limit: number;
  remaining: number;
  provider?: string;
  tokenUsage?: {
    resume?: {
      inputTokens?: number;
      outputTokens?: number;
      estimatedTokens?: number;
    };
    coverLetter?: {
      inputTokens?: number;
      outputTokens?: number;
      estimatedTokens?: number;
    };
  };
}

interface UsagePillProps {
  initialUsage?: UsageData;
  className?: string;
}

export default function UsagePill({ initialUsage, className = "" }: UsagePillProps) {
  const [usage, setUsage] = useState<UsageData | null>(initialUsage || null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch usage data if not provided
  useEffect(() => {
    if (!initialUsage) {
      const fetchUsage = async () => {
        try {
          const response = await fetch("/api/usage");
          if (response.ok) {
            const data = await response.json();
            setUsage(data);
          }
        } catch (error) {
          logger.error("Failed to fetch usage data", error);
        }
      };
      fetchUsage();
    }
  }, [initialUsage]);

  if (!usage) {
    return null;
  }

  // Calculate percentage used
  const percentUsed = Math.min(100, Math.round((usage.count / usage.limit) * 100));
  
  // Determine color based on usage
  const getColor = () => {
    if (percentUsed < 50) return "bg-emerald-600";
    if (percentUsed < 80) return "bg-amber-500";
    return "bg-red-500";
  };

  // Format token count with commas and abbreviate large numbers
  const formatTokens = (tokens?: number): string => {
    if (tokens === undefined) return "N/A";
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  // Calculate total tokens used
  const totalInputTokens = 
    (usage.tokenUsage?.resume?.inputTokens || 0) + 
    (usage.tokenUsage?.coverLetter?.inputTokens || 0);
    
  const totalOutputTokens = 
    (usage.tokenUsage?.resume?.outputTokens || 0) + 
    (usage.tokenUsage?.coverLetter?.outputTokens || 0);
    
  const totalEstimatedTokens = 
    (usage.tokenUsage?.resume?.estimatedTokens || 0) + 
    (usage.tokenUsage?.coverLetter?.estimatedTokens || 0);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1 rounded-full text-xs font-medium text-white flex items-center space-x-1 ${getColor()}`}
      >
        <span>Usage: {usage.count}/{usage.limit}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 p-3 text-sm text-gray-200">
          <h4 className="font-medium mb-2">Usage Details</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Generations</span>
              <span>{usage.count} of {usage.limit}</span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${getColor()}`}
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
            
            {usage.provider && (
              <div className="flex justify-between">
                <span>Provider</span>
                <span className="font-medium">{usage.provider}</span>
              </div>
            )}
            
            {(totalInputTokens > 0 || totalOutputTokens > 0 || totalEstimatedTokens > 0) && (
              <>
                <div className="border-t border-gray-700 my-2"></div>
                <h5 className="font-medium">Token Usage</h5>
                
                {totalInputTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Input</span>
                    <span>{formatTokens(totalInputTokens)}</span>
                  </div>
                )}
                
                {totalOutputTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Output</span>
                    <span>{formatTokens(totalOutputTokens)}</span>
                  </div>
                )}
                
                {totalEstimatedTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>{formatTokens(totalEstimatedTokens)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
