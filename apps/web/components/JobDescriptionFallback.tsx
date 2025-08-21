"use client";

import { useState } from 'react';

type Props = {
  onSubmit?: (jdText: string) => Promise<void> | void;
  onDismiss?: () => void;
  asModal?: boolean; // if you want to render it modal-style
  initialText?: string; // Allow passing initial text
};

export default function JobDescriptionFallback({ onSubmit, onDismiss, asModal, initialText = '' }: Props) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);

  const handleUsePaste = async () => {
    if (!onSubmit || text.trim().length < 30) return;
    setBusy(true);
    try { await onSubmit(text); } finally { setBusy(false); }
  };

  const Card = (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3 max-w-2xl">
      <p className="text-sm text-blue-800 font-medium">
        For best results, paste the full job description in the box above.
      </p>
      
      {onSubmit && (
        <>
          <textarea
            className="w-full min-h-[120px] rounded-md border p-3 text-sm"
            placeholder="Paste the full job description text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleUsePaste}
              disabled={busy || text.trim().length < 30}
              className="rounded-md px-4 py-2 bg-blue-600 text-white disabled:opacity-50"
            >
              {busy ? 'Using pasted text…' : 'Use Pasted Description'}
            </button>
            {onDismiss && (
              <button className="text-sm underline" onClick={onDismiss}>
                Try a different URL
              </button>
            )}
          </div>
        </>
      )}
      
      <div className="flex items-start gap-2">
        <div className="text-blue-500 mt-0.5">💡</div>
        <p className="text-xs text-gray-600">
          Tip: Copy the complete job description from the original posting. Including all requirements and qualifications will help tailor your resume more effectively.
        </p>
      </div>
    </div>
  );

  if (!asModal) return Card;

  // Simple modal wrapper
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {Card}
    </div>
  );
}