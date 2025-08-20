"use client";
import { useEffect, useState } from "react";

export default function BackendStatusBadge() {
  const [state, setState] = useState<{label:string; color:string}>({ label:"Checking...", color:"#777" });
  const [mode, setMode] = useState<string>("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/backend-status", { cache:"no-store" });
        const m = await r.json();
        setMode(m?.mode || "");
      } catch {}
      try {
        const head = await fetch("/api/resume-kit", { method:"HEAD", cache:"no-store" });
        if (!cancel) setState(head.ok ? { label:"Up", color:"#1e7a3b" } : { label:"Down", color:"#7a2b2b" });
      } catch {
        if (!cancel) setState({ label:"Down", color:"#7a2b2b" });
      }
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <span style={{ padding:"4px 10px", borderRadius: 999, background: "#111", border:`1px solid ${state.color}`, color:"#fff", fontSize:12 }}>
      Backend Status: <b style={{ color: state.color, marginLeft: 6 }}>{state.label}</b>
      {mode && <span style={{ marginLeft:10, opacity:0.8 }}>({mode})</span>}
    </span>
  );
}
