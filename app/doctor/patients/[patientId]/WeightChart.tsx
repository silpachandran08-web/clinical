interface WeightPoint {
  date: Date;
  weightKg: number;
}

/** Dependency-free inline SVG line chart — no charting library, just a handful of computed points. */
export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length < 2) return null;

  const width = 320;
  const height = 110;
  const padX = 14;
  const padY = 18;

  const weights = points.map((p) => p.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * (width - padX * 2),
    y: padY + (1 - (p.weightKg - min) / range) * (height - padY * 2),
    weightKg: p.weightKg,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  const latest = points[points.length - 1].weightKg;
  const previous = points.length > 1 ? points[points.length - 2].weightKg : null;
  const change = previous !== null ? latest - previous : null;

  return (
    <div className="weight-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="weight-chart-svg">
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill="currentColor" />
            <text x={c.x} y={c.y - 8} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.65">
              {c.weightKg}
            </text>
          </g>
        ))}
      </svg>
      <div className="weight-chart-stats">
        <div>
          <div className="weight-chart-stat-value">{latest} kg</div>
          <div className="weight-chart-stat-label">Latest</div>
        </div>
        {change !== null && (
          <div>
            <div
              className="weight-chart-stat-value"
              style={{ color: change === 0 ? undefined : change > 0 ? "var(--warning)" : "var(--success)" }}
            >
              {change > 0 ? "+" : ""}
              {change.toFixed(1)} kg
            </div>
            <div className="weight-chart-stat-label">Since last visit</div>
          </div>
        )}
      </div>
    </div>
  );
}
