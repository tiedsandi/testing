import type { ReactNode, MouseEvent } from "react";

export type CardElevation = "flat" | "raised" | "floating";

// Sub-type untuk action button di dalam card
export interface CardAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export interface CardProps {
  // ── Konten ──────────────────────────────────────────────────
  children: ReactNode;

  // ── Header (opsional semua) ──────────────────────────────────
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode; // slot untuk tombol di area header

  // ── Footer ───────────────────────────────────────────────────
  footer?: ReactNode;
  actions?: CardAction[]; // array action buttons di footer

  // ── Tampilan ─────────────────────────────────────────────────
  elevation?: CardElevation;
  padding?: "none" | "sm" | "md" | "lg";
  fullHeight?: boolean;

  // ── Interaksi ────────────────────────────────────────────────
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  hoverable?: boolean;

  // ── Styling ───────────────────────────────────────────────────
  className?: string;
  style?: React.CSSProperties;
}