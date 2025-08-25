/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";

function useScript(src: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.querySelector(`script[src="${src}"]`)) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true; s.onload = () => setReady(true);
    s.onerror = () => setReady(false);
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [src]);
  return ready;
}

export type PickerResult = { fileId: string; name?: string; mimeType?: string } | null;

export function useGooglePicker() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;      // Google Cloud *project number*
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

  const gapiReady = useScript("https://apis.google.com/js/api.js");
  const gisReady = useScript("https://accounts.google.com/gsi/client");

  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const getDriveToken = useCallback(async (): Promise<string> => {
    // Google Identity Services token client to get Drive read-only token
    // @ts-ignore
    const client = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      prompt: "", // silent if previously granted
      callback: (resp: any) => { tokenRef.current = resp?.access_token || null; },
    });
    // @ts-ignore
    client?.requestAccessToken();

    return await new Promise<string>((resolve, reject) => {
      const t = setInterval(() => {
        if (tokenRef.current) { clearInterval(t); resolve(tokenRef.current); }
      }, 50);
      setTimeout(() => { clearInterval(t); reject(new Error("Drive token timeout")); }, 5000);
    });
  }, [clientId]);

  const openPicker = useCallback(async (): Promise<PickerResult> => {
    if (!gapiReady || !gisReady) throw new Error("Google APIs not loaded yet");
    setLoading(true);
    try {
      const accessToken = tokenRef.current || await getDriveToken();

      // Load Picker module
      // @ts-ignore
      await new Promise<void>((res) => window.gapi.load("picker", () => res()));

      // Configure view for Google Docs only
      // @ts-ignore
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      // Promise to receive the callback's result
      let resolve!: (v: PickerResult) => void;
      const pickedP = new Promise<PickerResult>((r) => (resolve = r));

      // Build and show the Picker popup
      // @ts-ignore
      const picker = new window.google.picker.PickerBuilder()
        .setAppId(appId)                     // **project number**
        .setDeveloperKey(apiKey)             // **API key**
        .setOAuthToken(accessToken)          // **Drive-scoped token**
        .addView(view)
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setOrigin(window.location.protocol + "//" + window.location.host)
        .setCallback((data: any) => {
          // @ts-ignore
          if (data.action === window.google.picker.Action.PICKED) {
            const d = data.docs?.[0];
            resolve(d?.id ? { fileId: d.id, name: d.name, mimeType: d.mimeType } : null);
          } else {
            resolve(null);
          }
        })
        .setSize(1050, 650)
        .build();

      picker.setVisible(true);
      return await pickedP;
    } finally {
      setLoading(false);
    }
  }, [apiKey, appId, gapiReady, gisReady, getDriveToken]);

  return { openPicker, loading };
}
