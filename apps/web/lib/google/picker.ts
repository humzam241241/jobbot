/*
  Lightweight Google Picker loader and opener for client-side usage.
  - Loads gapi script once
  - Ensures picker module is available
  - Opens a Docs-only picker with provided OAuth access token
*/

const GAPI_SRC = "https://apis.google.com/js/api.js";

let gapiLoadPromise: Promise<void> | null = null;
let pickerReady = false;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((existing as any)._loaded) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const s = document.createElement("script");
    (s as any)._loaded = false;
    s.src = src;
    s.async = true;
    s.onload = () => {
      (s as any)._loaded = true;
      resolve();
    };
    s.onerror = (err) => reject(err);
    document.head.appendChild(s);
  });
}

async function loadGapi(): Promise<void> {
  if (typeof window === "undefined") return;
  if (gapiLoadPromise) return gapiLoadPromise;
  gapiLoadPromise = (async () => {
    await injectScript(GAPI_SRC);
    // Ensure picker module is loaded
    await new Promise<void>((resolve) => {
      // gapi might not be immediately available; poll briefly
      const tryLoad = () => {
        // @ts-ignore
        if (window.gapi && window.gapi.load) {
          // @ts-ignore
          window.gapi.load("picker", { callback: () => { pickerReady = true; resolve(); } });
        } else {
          setTimeout(tryLoad, 50);
        }
      };
      tryLoad();
    });
  })();
  return gapiLoadPromise;
}

export type PickerOptions = {
  accessToken: string; // OAuth token with Drive scope
  developerKey: string; // Google API key
  appId: string; // Numeric Google Cloud project number
  onPicked: (file: { id: string; name: string; mimeType?: string; resourceKey?: string }) => void;
};

export async function openGoogleDrivePicker(options: PickerOptions): Promise<void> {
  await loadGapi();
  if (!pickerReady) throw new Error("Google Picker failed to initialize");

  const { accessToken, developerKey, appId, onPicked } = options;

  // @ts-ignore
  const google: any = window.google;
  if (!google?.picker) throw new Error("google.picker not available");

  // Two explicit tabs: Google Docs and Word (.docx). Also support shared drives.
  const googleDocsView = new google.picker.DocsView(google.picker.ViewId.DOCUMENTS)
    .setIncludeFolders(false)
    .setSelectFolderEnabled(false)
    .setMimeTypes("application/vnd.google-apps.document");

  const wordDocxView = new google.picker.DocsView(google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false)
    .setMimeTypes("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  let builder = new google.picker.PickerBuilder()
    .enableFeature(google.picker.Feature.NAV_HIDDEN)
    .enableFeature(google.picker.Feature.SUPPORT_TEAM_DRIVES)
    .setOrigin(`${window.location.protocol}//${window.location.host}`)
    .setOAuthToken(accessToken)
    .setDeveloperKey(developerKey)
    .addView(googleDocsView)
    .addView(wordDocxView)
    .setCallback((data: any) => {
      if (data?.action === google.picker.Action.PICKED && Array.isArray(data.docs) && data.docs[0]) {
        const f = data.docs[0];
        onPicked({ id: f.id, name: f.name, mimeType: f.mimeType, resourceKey: (f as any).resourceKey });
      }
    });

  if (appId && String(appId).trim().length > 0) {
    builder = builder.setAppId(appId);
  }

  const picker = builder.build();

  picker.setVisible(true);
}


