// src/components/FilterBar/FilterBar.tsx
import type { FilterType } from "../../types/todo.types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  currentFilter: FilterType;
  activeCount: number;
  completedCount: number;
  onFilterChange: (filter: FilterType) => void;
  onClearCompleted: () => void;
}

// Label untuk tiap filter agar tidak ada magic string di JSX
const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "completed", label: "Selesai" },
];

function FilterBar({
  currentFilter,
  activeCount,
  completedCount,
  onFilterChange,
  onClearCompleted,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      {/* Info: berapa sisa yang aktif */}
      <span className={styles.count} aria-live="polite">
        {activeCount} {activeCount === 1 ? "item" : "item"} tersisa
      </span>

      {/* Filter buttons */}
      <div className={styles.filters} role="group" aria-label="Filter todo">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`${styles.filterButton} ${
              currentFilter === value ? styles.active : ""
            }`}
            aria-pressed={currentFilter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tombol clear — hanya tampil kalau ada yang completed */}
      {completedCount > 0 ? (
        <button
          onClick={onClearCompleted}
          className={styles.clearButton}
          aria-label={`Hapus ${completedCount} todo yang selesai`}
        >
          Hapus Selesai ({completedCount})
        </button>
      ) : (
        /* Placeholder kosong supaya layout tidak bergeser */
        <span />
      )}
    </div>
  );
}

export default FilterBar;
