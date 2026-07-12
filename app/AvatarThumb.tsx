function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Circular profile photo with an initials fallback — usable from server or client components. */
export function AvatarThumb({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const commonStyle = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
  };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        style={{ ...commonStyle, objectFit: "cover" as const, border: "1px solid var(--border-soft)" }}
      />
    );
  }

  return (
    <div
      style={{
        ...commonStyle,
        background: "var(--surface-2)",
        border: "1px solid var(--border-soft)",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.round(size * 0.4)),
        fontWeight: 600,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
