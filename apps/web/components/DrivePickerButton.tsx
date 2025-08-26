"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { loadGapi, loadPicker } from "@/lib/google/loader";

export default function DrivePickerButton() {
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);

  const openPicker = async () => {
    try {
      setBusy(true);

      const accessToken = (session as any)?.accessToken as string | undefined;
      if (!accessToken) {
        alert("Not authenticated with Google. Please sign in again.");
        return;
      }

      await loadGapi();
      await loadPicker();

      // @ts-ignore
      const { google } = window;
      if (!google?.picker) throw new Error("Google Picker not available");

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs?.[0];
            console.log("Picked file:", file);
          }
        })
        .setTitle("Select a file from Google Drive")
        .build();

      picker.setVisible(true);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to open Google Drive Picker.");
    } finally {
      setBusy(false);
    }
  };

  const disabled = status !== "authenticated" || busy;

  return (
    <button onClick={openPicker} disabled={disabled} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
      {busy ? "Opening…" : "Browse Google Drive"}
    </button>
  );
}


