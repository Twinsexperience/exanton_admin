import React from "react";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export const DonutChart: React.FC<{
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: number | string;
}> = ({ segments, centerLabel, centerValue }) => {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="donut-wrap">
      <div className="donut-svg-box">
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle
            cx="72"
            cy="72"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="16"
          />
          {total > 0 &&
            segments.map((seg) => {
              if (seg.value <= 0) return null;
              const dashLen = (seg.value / total) * circumference;
              const dashOffset = -cumulativeOffset;
              cumulativeOffset += dashLen;
              return (
                <circle
                  key={seg.label}
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={`${dashLen} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  transform="rotate(-90 72 72)"
                />
              );
            })}
        </svg>
        <div className="donut-center">
          <strong className="mono">{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="donut-legend">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <div key={seg.label} className="legend-row">
              <div className="legend-left">
                <span
                  className="legend-dot"
                  style={{ backgroundColor: seg.color }}
                />
                <span>{seg.label}</span>
              </div>
              <div className="legend-right mono">
                <strong>{seg.value}</strong>
                <span className="muted">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const BarMetricsChart: React.FC<{
  items: { label: string; value: number; color: string }[];
}> = ({ items }) => {
  const maxVal = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="bar-chart">
      {items.map((item) => {
        const widthPct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <div key={item.label} className="bar-item">
            <div className="bar-meta">
              <span>{item.label}</span>
              <strong className="mono">{item.value}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${widthPct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

