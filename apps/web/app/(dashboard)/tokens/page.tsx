"use client";

import { useState, useEffect } from "react";
import { useLocalStorage } from "react-use";
import { Gauge, RefreshCw, PlusCircle, AlertCircle } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";

interface TokenStats {
  total: number;
  used: number;
  leftover: number;
}

// Constants for token system
const TOKENS_PER_GENERATION = 10000;
const MAX_GENERATIONS = 30;

interface TokenHistory {
  date: string;
  used: number;
  model: string;
}

export default function TokensPage() {
  const [tokenStats, setTokenStats] = useLocalStorage<TokenStats>("tokenStats", {
    total: TOKENS_PER_GENERATION * MAX_GENERATIONS,
    used: 0,
    leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS
  });
  
  const [history, setHistory] = useState<TokenHistory[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Generate mock history data based on generations
  useEffect(() => {
    const mockHistory: TokenHistory[] = [];
    const models = ["gpt-4o", "claude-3-opus", "gemini-2.5-pro"];
    const now = new Date();
    
    // Generate history for past generations (up to MAX_GENERATIONS)
    const usedGenerations = Math.min(
      Math.floor((tokenStats?.used || 0) / TOKENS_PER_GENERATION) + 1, 
      MAX_GENERATIONS
    );
    
    for (let i = usedGenerations; i > 0; i--) {
      // Space out the generations over the past month
      const daysAgo = Math.floor((i / usedGenerations) * 30);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      mockHistory.push({
        date: date.toISOString().split('T')[0],
        used: TOKENS_PER_GENERATION, // Each entry is exactly one generation
        model: models[Math.floor(Math.random() * models.length)]
      });
    }
    
    setHistory(mockHistory);
  }, [tokenStats?.used]);
  
  // Simulate refresh - reset to exactly 30 generations
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      // Reset to exactly 30 generations
      setTokenStats({
        total: TOKENS_PER_GENERATION * MAX_GENERATIONS,
        used: 0,
        leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS
      });
    }, 1500);
  };
  
  // Add exactly one more generation (simulated)
  const handleAddTokens = () => {
    setTokenStats(prev => {
      if (!prev) return { 
        total: TOKENS_PER_GENERATION * MAX_GENERATIONS, 
        used: 0, 
        leftover: TOKENS_PER_GENERATION * MAX_GENERATIONS 
      };
      
      const newTotal = prev.total + TOKENS_PER_GENERATION;
      return {
        total: newTotal,
        used: prev.used,
        leftover: newTotal - prev.used
      };
    });
  };
  
  // Calculate usage percentage
  const usagePercentage = tokenStats ? Math.round((tokenStats.used / tokenStats.total) * 100) : 0;
  
  // Group history by date for the chart
  const groupedByDate = history.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = 0;
    }
    acc[entry.date] += entry.used;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate model usage
  const modelUsage = history.reduce((acc, entry) => {
    if (!acc[entry.model]) {
      acc[entry.model] = 0;
    }
    acc[entry.model] += entry.used;
    return acc;
  }, {} as Record<string, number>);
  
  const totalUsage = Object.values(modelUsage).reduce((sum, val) => sum + val, 0);
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Token Management</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm border border-neutral-700"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button 
            onClick={handleAddTokens}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm border border-indigo-500/20"
          >
            <PlusCircle className="h-4 w-4" />
            Add 1 Generation
          </button>
        </div>
      </div>
      
      {/* Token Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectionCard>
          <div className="p-4 flex flex-col items-center">
            <h3 className="text-lg font-medium text-blue-400">Total Generations</h3>
            <div className="text-3xl font-bold mt-2">{Math.ceil((tokenStats?.total || 0) / TOKENS_PER_GENERATION)}</div>
            <p className="text-sm text-neutral-400 mt-1">Your generation allocation</p>
          </div>
        </SectionCard>
        
        <SectionCard>
          <div className="p-4 flex flex-col items-center">
            <h3 className="text-lg font-medium text-amber-400">Used Generations</h3>
            <div className="text-3xl font-bold mt-2">{Math.floor((tokenStats?.used || 0) / TOKENS_PER_GENERATION)}</div>
            <p className="text-sm text-neutral-400 mt-1">{usagePercentage}% of allocation</p>
          </div>
        </SectionCard>
        
        <SectionCard>
          <div className="p-4 flex flex-col items-center">
            <h3 className="text-lg font-medium text-emerald-400">Remaining Generations</h3>
            <div className="text-3xl font-bold mt-2">{Math.floor((tokenStats?.leftover || 0) / TOKENS_PER_GENERATION)}</div>
            <p className="text-sm text-neutral-400 mt-1">{100 - usagePercentage}% remaining</p>
          </div>
        </SectionCard>
      </div>
      
      {/* Usage Progress Bar */}
      <SectionCard>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Generations Usage</h3>
          <div className="w-full bg-neutral-800 rounded-full h-4 mb-2">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-amber-500 h-4 rounded-full"
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-neutral-400">
            <span>0 generations</span>
            <span>{MAX_GENERATIONS} generations</span>
          </div>
          
          {/* Warning when low on generations */}
          {tokenStats && Math.floor((tokenStats.leftover || 0) / TOKENS_PER_GENERATION) < 5 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-900/20 border border-amber-500/20 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-amber-300">
                You have fewer than 5 generations remaining. Consider adding more soon.
              </span>
            </div>
          )}
        </div>
      </SectionCard>
      
      {/* Usage By Model */}
      <SectionCard>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Usage By Model</h3>
          <div className="space-y-4">
            {Object.entries(modelUsage).map(([model, used]) => {
              const percentage = Math.round((used / totalUsage) * 100);
              let colorClass = "bg-blue-500";
              if (model === "claude-3-opus") colorClass = "bg-amber-500";
              if (model === "gemini-2.5-pro") colorClass = "bg-emerald-500";
              
              return (
                <div key={model}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{model}</span>
                    <span>{percentage}% ({Math.round(used / TOKENS_PER_GENERATION)} generations)</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2">
                    <div 
                      className={`${colorClass} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>
      
      {/* Token Usage History */}
      <SectionCard>
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Recent Token Usage</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-left py-2 px-4">Model</th>
                  <th className="text-right py-2 px-4">Usage</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((entry, index) => (
                  <tr key={index} className="border-b border-neutral-700/50 hover:bg-neutral-800/50">
                    <td className="py-2 px-4">{entry.date}</td>
                    <td className="py-2 px-4">{entry.model}</td>
                    <td className="py-2 px-4 text-right">1 generation</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
