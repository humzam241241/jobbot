"use client";
import { useState } from "react";
import { useGooglePicker } from "@/lib/google/useGooglePicker";
import { Cloud } from "lucide-react";
import { toast } from "react-hot-toast";

export function BrowseDriveButton({ kitId, onPicked }: { kitId: string; onPicked?: () => void }) {
  const { openPicker, loading } = useGooglePicker();
  const [err, setErr] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const pick = await openPicker();
      if (!pick?.fileId) return;
      
      toast.loading('Processing document...');
      
      const res = await fetch(`/api/kits/${kitId}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gdoc", fileId: pick.fileId }),
      });
      
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Drive export failed");
      
      toast.dismiss();
      toast.success('Document selected successfully!');
      onPicked?.();
    } catch (e: any) {
      toast.dismiss();
      const msg = e.message || "Failed to process document";
      setErr(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-blue-400"
      >
        <Cloud className="w-5 h-5 mr-2" />
        {loading ? "Connecting..." : "Browse Google Drive"}
      </button>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}
