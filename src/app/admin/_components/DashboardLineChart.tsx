"use client";

import { useRef, useEffect, useState } from "react";

export type ChartSeries = {
  name: string;
  color: string;
  values: number[];
};

export function DashboardLineChart({
  series,
  labels,
  height = 160,
}: {
  series: ChartSeries[];
  labels: string[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = Math.max(width - PAD.left - PAD.right, 0);
  const innerH = height - PAD.top - PAD.bottom;
  const n = labels.length;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 1);

  const xPos = (i: number) =>
    PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yPos = (v: number) =>
    PAD.top + innerH - (v / max) * innerH;

  const getPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`)
      .join(" ");

  const gridCount = 4;
  const gridValues = Array.from({ length: gridCount }, (_, i) =>
    Math.round((max / gridCount) * (i + 1))
  );

  if (width === 0) {
    return <div ref={containerRef} style={{ height }} className="w-full" />;
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height}>
        {/* 수평 그리드 */}
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} y1={yPos(v)}
              x2={width - PAD.right} y2={yPos(v)}
              stroke="#f4f4f5" strokeWidth="1"
            />
            <text
              x={PAD.left - 6} y={yPos(v) + 4}
              textAnchor="end" fontSize="10" fill="#d4d4d8"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X축 레이블 */}
        {labels.map((label, i) => (
          <text
            key={i}
            x={xPos(i)} y={height - 6}
            textAnchor="middle" fontSize="10" fill="#a1a1aa"
          >
            {label}
          </text>
        ))}

        {/* 라인 */}
        {series.map((s) => (
          <path
            key={s.name}
            d={getPath(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* 데이터 포인트 */}
        {series.map((s) =>
          s.values.map((v, i) => (
            <circle
              key={`${s.name}-${i}`}
              cx={xPos(i)} cy={yPos(v)}
              r="3"
              fill={s.color}
              stroke="white"
              strokeWidth="1.5"
            />
          ))
        )}
      </svg>
    </div>
  );
}
