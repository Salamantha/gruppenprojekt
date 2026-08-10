interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export default function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="w-full max-w-xl">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>
          Rezept {current} von {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
