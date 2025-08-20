type StatProps = {
  title?: string;
  label?: string; // backward-compat
  value: string | number | React.ReactNode;
  caption?: string;
  hint?: string; // backward-compat
  progress?: number; // 0..100
  onIncrement?: () => void;
  onDecrement?: () => void;
};

export function StatCard({ title, label, value, caption, hint, progress, onIncrement, onDecrement }: StatProps) {
  const heading = title ?? label ?? '';
  const sub = caption ?? hint;
  const isEditable = onIncrement && onDecrement;

  return (
    <div className="rounded-2xl border border-slate-800 bg-white/[0.03] dark:bg-black/30 backdrop-blur shadow-sm p-4 md:p-6 flex flex-col">
      <div className="text-sm text-slate-400">{heading}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {isEditable && (
          <div className="flex gap-1">
            <button onClick={onDecrement} className="rounded-full h-6 w-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400">-</button>
            <button onClick={onIncrement} className="rounded-full h-6 w-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400">+</button>
          </div>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
      {typeof progress === 'number' && (
        <div className="mt-4 flex-grow flex items-end">
          <div className="h-2 w-full rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-indigo-500"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


