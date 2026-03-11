interface TodoStatsProps {
  total: number;
  completed: number;
}

function TodoStats({ total, completed }: TodoStatsProps) {
  if (total === 0) return null;

  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1 mt-1">
      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "var(--color-bg-item)" }}
        role="progressbar"
        aria-valuenow={completionPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completionPercent}% selesai`}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-in-out"
          style={{
            width: `${completionPercent}%`,
            background:
              completionPercent === 100 ? "#22c55e" : "var(--color-primary)",
          }}
        />
      </div>

      {/* Summary text */}
      <p
        className="text-center"
        style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
        }}
      >
        {completed} dari {total} selesai
        {completionPercent === 100 && " · Semua beres! 🎉"}
      </p>
    </div>
  );
}

export default TodoStats;
