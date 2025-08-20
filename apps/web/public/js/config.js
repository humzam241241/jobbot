// public/js/config.js
(function () {
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
    "";
  const ls = typeof window !== "undefined" ? window.localStorage.getItem("API_BASE") : "";
  const fallback = ""; // same-origin (Next.js app on :3000)
  window.API_BASE = (ls || envUrl || fallback).replace(/\/+$/, "");
})();
