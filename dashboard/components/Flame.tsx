// "On fire" badge — small flame SVG with a soft warm glow.
export default function Flame({
  size = 12,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size + 6, height: size + 6 }}
      aria-label="on fire"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 14 14"
        fill="none"
        style={{ filter: "drop-shadow(0 0 4px rgba(255, 138, 60, 0.55))" }}
      >
        <defs>
          <linearGradient id="flameG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE07A" />
            <stop offset="55%" stopColor="#FF9A3C" />
            <stop offset="100%" stopColor="#F2542D" />
          </linearGradient>
        </defs>
        <path
          d="M7 1.2c.7 1.6 2.2 2.4 2.2 4.4 0 1-.5 1.7-1.1 2.1.3-.2.4-.6.4-1 0-.9-.7-1.5-1.4-2.2C6 6 4.5 6.7 4.5 8.7c0 2.1 1.8 4 3.6 4s3.4-1.6 3.4-3.6c0-3.6-3.5-4.7-4.5-7.9Z"
          fill="url(#flameG)"
        />
      </svg>
    </span>
  );
}
