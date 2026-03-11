import type { ButtonProps } from "./Button.types";

// Mapping size ke class CSS (atau bisa pakai Tailwind)
const SIZE_CLASSES: Record<string, string> = {
  sm: "btn--sm",
  md: "btn--md",
  lg: "btn--lg",
};

const VARIANT_CLASSES: Record<string, string> = {
  primary:   "btn--primary",
  secondary: "btn--secondary",
  danger:    "btn--danger",
  ghost:     "btn--ghost",
};

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  ariaLabel,
  className = "",
}: ButtonProps) {
  // Gabungkan semua class
  const classes = [
    "btn",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "btn--full-width" : "",
    loading   ? "btn--loading"    : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (disabled || loading) return; // Jangan trigger kalau disabled/loading
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      onClick={handleClick}
    >
      {loading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          <span className="btn__loading-text">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;