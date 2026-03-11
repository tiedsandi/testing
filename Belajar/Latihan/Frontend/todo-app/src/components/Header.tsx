import { useState, useEffect } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function Header() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full max-w-xl px-6 py-3 flex items-center justify-between">
      {/* Greeting */}
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-sub)",
        }}
      >
        Hello,{" "}
        <span
          style={{
            fontWeight: "var(--font-weight-bold)",
            color: "var(--color-text-base)",
          }}
        >
          Habib
        </span>{" "}
        <span className="greeting-accent">{getGreeting()} !</span>
      </p>

      {/* Live clock */}
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-sub)",
        }}
      >
        <span
          style={{
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-base)",
          }}
        >
          Time:{" "}
        </span>
        <span
          style={{
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-primary)",
          }}
        >
          {formatTime(now)}
        </span>
      </p>
    </div>
  );
}
