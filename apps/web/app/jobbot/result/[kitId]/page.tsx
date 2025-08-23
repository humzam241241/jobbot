"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface ResumeKit {
  id: string;
  resumeUrl: string;
  coverLetterUrl: string;
  atsReportUrl: string;
  resumeDocxUrl: string;
  coverLetterDocxUrl: string;
  atsReportDocxUrl: string;
  provider: string;
  model?: string;
  createdAt: string;
}

interface UsageInfo {
  count: number;
  limit: number;
  remaining: number;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const kitId = params.kitId as string;
  
  const [kit, setKit] = useState<ResumeKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  
  useEffect(() => {
    // Show success toast when the page loads
    toast.success("Resume Kit ready!");
    
    // Fetch the kit data
    const fetchKit = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/resume-kit/${kitId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch kit: ${response.status}`);
        }
        
        const data = await response.json();
        setKit(data.kit);
        setUsage(data.usage);
      } catch (err) {
        console.error("Error fetching kit:", err);
        setError("Failed to load your resume kit. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    if (kitId) {
      fetchKit();
    }
  }, [kitId]);
  
  const handleRegenerate = async () => {
    try {
      setRegenerating(true);
      toast.loading("Regenerating with tighter content...");
      
      const response = await fetch(`/api/resume-kit/${kitId}/regenerate`, {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.status}`);
      }
      
      const data = await response.json();
      setKit(data.kit);
      setUsage(data.usage);
      
      toast.dismiss();
      toast.success("Resume regenerated successfully!");
    } catch (err) {
      console.error("Error regenerating kit:", err);
      toast.dismiss();
      toast.error("Failed to regenerate. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };
  
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Loading your Resume Kit...</h1>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-red-600">Error</h1>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => router.push("/jobbot")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Generator
        </button>
      </div>
    );
  }
  
  if (!kit) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Resume Kit Not Found</h1>
        <p className="text-gray-600">The requested resume kit could not be found.</p>
        <button
          onClick={() => router.push("/jobbot")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Generator
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Your Resume Kit</h1>
        {usage && (
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Credits: {usage.remaining}/{usage.limit}
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-400">Download your generated files below.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">Resume</h2>
          <div className="space-y-2">
            {kit.resumeUrl && (
              <a
                href={kit.resumeUrl}
                className="block w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📥 Download PDF
              </a>
            )}
            {kit.resumeDocxUrl && (
              <a
                href={kit.resumeDocxUrl}
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📄 Download DOCX
              </a>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <h2 className="text-lg font-semibold mb-3">Cover Letter</h2>
          <div className="space-y-2">
            {kit.coverLetterUrl && (
              <a
                href={kit.coverLetterUrl}
                className="block w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📥 Download PDF
              </a>
            )}
            {kit.coverLetterDocxUrl && (
              <a
                href={kit.coverLetterDocxUrl}
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📄 Download DOCX
              </a>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100 md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">ATS Report</h2>
          <div className="space-y-2">
            {kit.atsReportUrl && (
              <a
                href={kit.atsReportUrl}
                className="block w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📥 Download PDF
              </a>
            )}
            {kit.atsReportDocxUrl && (
              <a
                href={kit.atsReportDocxUrl}
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition-colors"
                download
              >
                📄 Download DOCX
              </a>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <button
          onClick={() => router.push("/jobbot")}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
        >
          Create Another
        </button>
        
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className={`px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors ${
            regenerating ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {regenerating ? "Regenerating..." : "Regenerate (Tighter)"}
        </button>
      </div>
    </div>
  );
}
