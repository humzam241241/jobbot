"use client";
import * as React from "react";

export function useToast() {
  const [msg, setMsg] = React.useState<{type: "success" | "error", text: string} | null>(null);
  
  // Auto-dismiss after 5 seconds
  React.useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);
  
  const Toast = () => msg ? (
    <div className={`fixed bottom-4 right-4 rounded-lg px-4 py-3 shadow text-white z-50 ${
      msg.type === "success" ? "bg-green-600" : "bg-red-600"
    }`}>
      <div className="flex items-center justify-between">
        <span>{msg.text}</span>
        <button 
          onClick={() => setMsg(null)}
          className="ml-3 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  ) : null;
  
  return { setMsg, Toast };
}
