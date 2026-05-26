// Circular avatar for a Depop store. Falls back to a colored monogram
// when no avatar_url is set. The ring uses the store's tint color so
// it stays visually consistent with the rest of the dashboard.

export default function Avatar({
  url,
  username,
  color,
  size = 36,
}: {
  url: string | null;
  username: string;
  color: string;
  size?: number;
}) {
  const letter = (username[0] ?? "?").toUpperCase();
  const ringWidth = 1.5;

  return (
    <div
      className="rounded-full inline-flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: url ? "transparent" : color,
        boxShadow: `0 0 0 ${ringWidth}px ${color}, 0 0 8px ${color}33`,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={username}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className="font-bold text-white"
          style={{
            fontSize: Math.round(size * 0.42),
            textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
        >
          {letter}
        </span>
      )}
    </div>
  );
}
