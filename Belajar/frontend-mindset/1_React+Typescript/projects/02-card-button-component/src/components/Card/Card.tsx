import type { CardProps, CardAction } from "./Card.types";
import Button from "../Button/Button";

const ELEVATION_CLASSES: Record<string, string> = {
  flat:    "card--flat",
  raised:  "card--raised",
  floating: "card--floating",
};

const PADDING_CLASSES: Record<string, string> = {
  none: "card--padding-none",
  sm:   "card--padding-sm",
  md:   "card--padding-md",
  lg:   "card--padding-lg",
};

// Sub-component: Header
function CardHeader({
  title,
  subtitle,
  headerAction,
}: {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}) {
  // Tidak render apa-apa kalau tidak ada header content
  if (!title && !subtitle && !headerAction) return null;

  return (
    <div className="card__header">
      <div className="card__header-text">
        {title && <h3 className="card__title">{title}</h3>}
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
      {headerAction && (
        <div className="card__header-action">{headerAction}</div>
      )}
    </div>
  );
}

// Sub-component: Actions Footer
function CardActions({ actions }: { actions: CardAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="card__actions">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant ?? "secondary"}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Main Card Component
function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  actions = [],
  elevation = "raised",
  padding = "md",
  fullHeight = false,
  onClick,
  hoverable = false,
  className = "",
}: CardProps) {
  const isClickable = Boolean(onClick) || hoverable;

  const classes = [
    "card",
    ELEVATION_CLASSES[elevation],
    PADDING_CLASSES[padding],
    fullHeight  ? "card--full-height" : "",
    isClickable ? "card--clickable"   : "",
    hoverable   ? "card--hoverable"   : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasFooter = footer !== undefined || actions.length > 0;

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header section */}
      <CardHeader
        title={title}
        subtitle={subtitle}
        headerAction={headerAction}
      />

      {/* Body section */}
      <div className="card__body">{children}</div>

      {/* Footer section */}
      {hasFooter && (
        <div className="card__footer">
          {footer}
          {actions.length > 0 && <CardActions actions={actions} />}
        </div>
      )}
    </div>
  );
}

export default Card;