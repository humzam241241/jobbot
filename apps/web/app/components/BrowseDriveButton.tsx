"use client";
import { useState } from "react";
import { useGooglePicker } from "@/app/lib/google/useGooglePicker";

export function BrowseDriveButton({ kitId, afterPicked }: { kitId: string; afterPicked?: () => void }) {
  const { openPicker, loading } = useGooglePicker();
  const [err, setErr] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // avoid form submit loops
    setErr(null);
    try {
      const pick = await openPicker();
      if (!pick?.fileId) return;

      // Send selected fileId to backend to export GDoc -> input.docx
      const res = await fetch(`/api/kits/${kitId}/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gdoc", fileId: pick.fileId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Drive export failed");
      afterPicked?.();
    } catch (e: any) {
      setErr(e.message || "Could not open Google Drive Picker");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button 
        type="button" 
        onClick={handleClick} 
        disabled={loading}
        className="flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Connecting…" : "Browse Google Drive"}
      </button>
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}
