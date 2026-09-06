import { useId } from "react";

type BrandLogoProps = {
  className?: string;
  mode?: "wordmark" | "mark";
};

export function BrandLogo({ className = "", mode = "wordmark" }: BrandLogoProps) {
  // Several marks can share a page, so the gradient id has to be unique per instance.
  const gradientId = `saarai-mark-${useId().replace(/:/g, "")}`;

  if (mode === "mark") {
    return (
      <svg
        viewBox="0 0 32 32"
        className={["h-8 w-8", className].join(" ")}
        role="img"
        aria-label="SaarAI"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--cyan))" />
            <stop offset="0.6" stopColor="rgb(var(--violet))" />
            <stop offset="1" stopColor="rgb(var(--gold))" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        <path
          d="M21 11.5c-1.2-1.3-3-2-4.9-2C13 9.5 11 11 11 13.2c0 4.6 10 2.4 10 7.2 0 2.3-2.2 3.6-4.9 3.6-2.2 0-4.2-.9-5.4-2.3"
          fill="none"
          stroke="rgb(var(--surface))"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <img
      src="/saarai-logo.png"
      alt="SaarAI"
      className={["h-16 w-auto object-contain", className].join(" ")}
      loading="eager"
    />
  );
}

export default BrandLogo;
