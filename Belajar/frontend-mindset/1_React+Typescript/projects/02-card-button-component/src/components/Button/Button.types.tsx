import type { MouseEvent, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  // ── Konten ──────────────────────────────────────────────────
  children: ReactNode;

  // ── Behaviour ───────────────────────────────────────────────
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;

  // ── Tampilan ─────────────────────────────────────────────────
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;

  // ── Accessibility ────────────────────────────────────────────
  ariaLabel?: string;

  // ── Styling tambahan ─────────────────────────────────────────
  className?: string;
}