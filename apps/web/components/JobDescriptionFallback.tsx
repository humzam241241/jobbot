import { useState } from 'react';

type Props = {
  onSubmit: (jdText: string) => Promise<void> | void;
  onDismiss?: () => void;
  asModal?: boolean; // if you want to render it modal-style
};

export default function JobDescriptionFallback({ onSubmit, onDismiss, asModal }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleUsePaste = async () => {
    if (text.trim().length < 30) return;
    setBusy(true);
    try { await onSubmit(text); } finally { setBusy(false); }
  };

  const Card = (
    <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3 max-w-2xl">
      <p className="text-sm text-red-800 font-medium">
        This site blocked automated extraction (e.g., LinkedIn).
        Paste the full job description below and we’ll continue normally.
      </p>
      <textarea
        className="w-full min-h-[180px] rounded-md border p-3 text-sm"
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
      <p className="text-xs text-gray-600">
        Tip: Copy from the page’s “Full job description”. Your text will be used to generate your kit.
      </p>
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
