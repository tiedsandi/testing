// src/components/TodoStats/TodoStats.tsx

interface TodoStatsProps {
  total: number;
  completed: number;
}

function TodoStats({ total, completed }: TodoStatsProps) {
  if (total === 0) return null; // Jangan tampilkan kalau tidak ada todo

  const completionPercent =
    total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginTop: "0.5rem",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "#eee",
          borderRadius: "2px",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={completionPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completionPercent}% selesai`}
      >
        <div
          style={{
            height: "100%",
            width: `${completionPercent}%`,
            background: completionPercent === 100 ? "#48bb78" : "#6c63ff",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Summary text */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.78rem",
          color: "#aaa",
        }}
      >
        {completed} dari {total} selesai
        {completionPercent === 100 && " · Semua beres! 🎉"}
      </p>
    </div>
  );
}

export default TodoStats;
