import type { FilterType } from "../types/todo.types";

interface FilterBarProps {
  currentFilter: FilterType;
  activeCount: number;
  completedCount: number;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function FilterBar({
  currentFilter,
  activeCount,
  completedCount,
  onFilterChange,
  onClearCompleted,
}: FilterBarProps) {
  return (
    <div
      className="flex items-center justify-between gap-2"
      style={{ color: "var(--color-text-muted)" }}
    >
      {/* Items left */}
      <span
        className="whitespace-nowrap"
        style={{ fontSize: "var(--font-size-xs)" }}
      >
        {activeCount} items left
      </span>

      {/* Filter buttons */}
      <div className="flex gap-1">
        {FILTERS.map((filter) => {
          const isActive = currentFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              style={{
                padding: "0.2rem 0.6rem",
                border: isActive
                  ? "1.5px solid var(--color-primary)"
                  : "1.5px solid transparent",
                borderRadius: "var(--radius-sm)",
                fontWeight: isActive
                  ? "var(--font-weight-semibold)"
                  : "var(--font-weight-normal)",
                color: isActive
                  ? "var(--color-primary)"
                  : "var(--color-text-muted)",
                background: "transparent",
                transition: "all var(--transition-fast)",
                cursor: "pointer",
                fontSize: "var(--font-size-xs)",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Clear completed */}
      {completedCount > 0 && (
        <button
          onClick={onClearCompleted}
          className="whitespace-nowrap underline"
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
            transition: "color var(--transition-fast)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--color-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--color-text-muted)")
          }
        >
          Clear completed
        </button>
      )}
    </div>
  );
}
