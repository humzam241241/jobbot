/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";

function useScript(src: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    console.log(`Loading script: ${src}`);
    if (document.querySelector(`script[src="${src}"]`)) { 
      console.log(`Script already loaded: ${src}`);
      setReady(true); 
      return; 
    }
    const s = document.createElement("script");
    s.src = src; 
    s.async = true; 
    s.onload = () => {
      console.log(`Script loaded: ${src}`);
      setReady(true);
    };
    s.onerror = (error) => {
      console.error(`Script load error: ${src}`, error);
      setReady(false);
    };
    document.head.appendChild(s);
    return () => { 
      console.log(`Removing script: ${src}`);
      document.head.removeChild(s);
    };
  }, [src]);
  return ready;
}

export type PickerResult = { fileId: string; name?: string; mimeType?: string } | null;

export function useGooglePicker() {
  console.log('useGooglePicker hook initializing');

  // Hardcoded values to ensure they're available
  const apiKey = "AIzaSyDINt8kTkq7X-gYVODdDb-aLPZ4brp2O6I";
  const clientId = "244828860370-g3ugmlq9hm1qbsnr2s4bsdf74v71t57k.apps.googleusercontent.com";
  const appId = "244828860370";

  const gapiReady = useScript("https://apis.google.com/js/api.js");
  const gisReady = useScript("https://accounts.google.com/gsi/client");

  const [loading, setLoading] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('Scripts status:', { gapiReady, gisReady });
  }, [gapiReady, gisReady]);

  const getDriveToken = useCallback(async (): Promise<string> => {
    console.log('Getting Drive token...');
    
    if (!window.google?.accounts?.oauth2) {
      console.error('Google OAuth2 not available');
      throw new Error('Google OAuth2 not available');
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      prompt: "", // silent if previously granted
      callback: (resp: any) => { 
        console.log('Token callback:', resp);
        tokenRef.current = resp?.access_token || null; 
      },
    });

    console.log('Requesting access token...');
    client.requestAccessToken();

    return await new Promise<string>((resolve, reject) => {
      const t = setInterval(() => {
        if (tokenRef.current) { 
          console.log('Got token');
          clearInterval(t); 
          resolve(tokenRef.current); 
        }
      }, 50);
      setTimeout(() => { 
        clearInterval(t); 
        console.error('Token request timeout');
        reject(new Error("Drive token timeout")); 
      }, 5000);
    });
  }, [clientId]);

  const openPicker = useCallback(async (): Promise<PickerResult> => {
    console.log('Opening picker...', { gapiReady, gisReady });
    
    if (!gapiReady || !gisReady) {
      console.error('APIs not ready:', { gapiReady, gisReady });
      throw new Error("Google APIs not loaded yet");
    }

    if (!window.gapi) {
      console.error('GAPI not available');
      throw new Error('Google API not available');
    }

    setLoading(true);
    try {
      const accessToken = tokenRef.current || await getDriveToken();
      console.log('Got access token, loading picker...');

      await new Promise<void>((res) => {
        window.gapi.load("picker", {
          callback: () => {
            console.log('Picker loaded');
            res();
          }
        });
      });

      if (!window.google?.picker) {
        console.error('Picker API not available');
        throw new Error('Google Picker not available');
      }

      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMode(window.google.picker.DocsViewMode.LIST);

      let resolve!: (v: PickerResult) => void;
      const pickedP = new Promise<PickerResult>((r) => (resolve = r));

      console.log('Creating picker with:', { apiKey, appId });
      const picker = new window.google.picker.PickerBuilder()
        .setAppId(appId)
        .setDeveloperKey(apiKey)
        .setOAuthToken(accessToken)
        .addView(view)
        .setOrigin(window.location.protocol + "//" + window.location.host)
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setCallback((data: any) => {
          console.log('Picker callback:', data);
          if (data.action === window.google.picker.Action.PICKED) {
            const d = data.docs?.[0];
            resolve(d?.id ? { fileId: d.id, name: d.name, mimeType: d.mimeType } : null);
          } else {
            resolve(null);
          }
        })
        .setSize(1050, 650)
        .build();

      console.log('Showing picker...');
      picker.setVisible(true);
      return await pickedP;
    } catch (error) {
      console.error('Picker error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiKey, appId, gapiReady, gisReady, getDriveToken]);

  return { openPicker, loading };
}