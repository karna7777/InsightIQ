/**
 * A calm 2D data-flow graph — nodes joined by analytic curves with dashes
 * travelling along them. Pure SVG + CSS (the `.flow-line` keyframe), so it
 * costs nothing to render and stops under prefers-reduced-motion. Decorative
 * backdrop; `aria-hidden`. Fills its positioned parent.
 */
export function DataFlowBg({ className = "" }: { className?: string }) {
  // node coordinates in the 480×420 viewBox
  const nodes: [number, number, number][] = [
    [54, 210, 5],
    [176, 104, 4],
    [176, 316, 4],
    [300, 210, 7],
    [430, 118, 4],
    [430, 302, 4],
    [300, 60, 3],
    [300, 360, 3],
  ];
  const paths = [
    "M54,210 C110,210 120,120 176,104",
    "M54,210 C110,210 120,300 176,316",
    "M176,104 C240,104 250,180 300,210",
    "M176,316 C240,316 250,240 300,210",
    "M300,210 C360,210 380,140 430,118",
    "M300,210 C360,210 380,280 430,302",
    "M176,104 C250,80 270,60 300,60",
    "M176,316 C250,340 270,360 300,360",
  ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 480 420"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      fill="none"
    >
      {/* faint base wires */}
      {paths.map((d, i) => (
        <path key={`b${i}`} d={d} stroke="var(--border-strong)" strokeWidth="1.25" opacity="0.7" />
      ))}
      {/* travelling data */}
      {paths.map((d, i) => (
        <path
          key={`f${i}`}
          d={d}
          stroke="var(--primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
          className={i % 3 === 0 ? "flow-line flow-line--slow" : i % 3 === 1 ? "flow-line" : "flow-line flow-line--fast"}
          style={{ animationDelay: `${(i % 4) * -1.6}s` }}
        />
      ))}
      {/* nodes */}
      {nodes.map(([x, y, r], i) => (
        <g key={`n${i}`}>
          <circle cx={x} cy={y} r={r + 3} fill="var(--primary)" opacity="0.08" />
          <circle
            cx={x}
            cy={y}
            r={r}
            fill="var(--card)"
            stroke={i === 3 ? "var(--primary)" : "var(--viz-3)"}
            strokeWidth="1.5"
          />
          {i === 3 && <circle cx={x} cy={y} r={r - 3} fill="var(--primary)" opacity="0.9" />}
        </g>
      ))}
    </svg>
  );
}
