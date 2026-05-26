"use client";

// Tiny SVG sparkline. Renders a smooth path through the values and a
// filled area underneath. Color comes from the consuming row (so it
// matches the per-store tint).

export default function Sparkline({
  values,
  color = "#ffffff",
  height = 36,
  width = 120,
  className,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const max = Math.max(1, ...values);
  const stepX = width / (values.length - 1);
  const pad = 2;
  const usableH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = pad + usableH - (v / max) * usableH;
    return [x, y] as const;
  });

  // Smooth path with Catmull-Rom-ish midpoint smoothing.
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const cpx = (px + x) / 2;
    d += ` Q ${cpx},${py} ${x},${y}`;
  }

  const areaD = `${d} L ${width},${height} L 0,${height} Z`;
  const id = `spark-fill-${Math.abs(hashStr(values.join(",")))}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
