"use client";

import { useState, useRef, useEffect } from "react";

type TrendTab = {
  key: string;
  label: string;
  color: string;
  total: number;
  unit?: string;
  values: number[];
};

function LineChart({
  values,
  labels,
  color,
  height = 160,
}: {
  values: number[];
  labels: string[];
  color: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  const PAD = { top: 24, right: 16, bottom: 28, left: 36 };
  const innerW = Math.max(width - PAD.left - PAD.right, 0);
  const innerH = height - PAD.top - PAD.bottom;
  const n = labels.length;
  const max = Math.max(...values, 1);

  const xPos = (i: number) =>
    PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yPos = (v: number) =>
    PAD.top + innerH - (v / max) * innerH;

  const pathD = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`)
    .join(" ");
  const areaD =
    pathD +
    ` L ${xPos(n - 1).toFixed(1)} ${(PAD.top + innerH).toFixed(1)}` +
    ` L ${xPos(0).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`;

  const gradientId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  const gridValues = Array.from({ length: 4 }, (_, i) =>
    Math.round((max / 4) * (i + 1))
  );

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left - PAD.left;
    const idx = Math.max(0, Math.min(n - 1, Math.round((relX / innerW) * (n - 1))));
    setHoveredIdx(idx);
  }

  if (width === 0) {
    return <div ref={containerRef} style={{ height }} className="w-full" />;
  }

  const hx = hoveredIdx !== null ? xPos(hoveredIdx) : null;
  const hy = hoveredIdx !== null ? yPos(values[hoveredIdx]) : null;
  const hv = hoveredIdx !== null ? values[hoveredIdx] : null;
  const hl = hoveredIdx !== null ? labels[hoveredIdx] : null;

  // 툴팁 X 위치 (SVG 좌표 → container %)
  const tooltipLeft = hx !== null ? (hx / width) * 100 : 0;
  const tooltipY = hy !== null ? hy : 0;

  return (
    <div ref={containerRef} className="w-full relative">
      {/* 툴팁 */}
      {hoveredIdx !== null && hv !== null && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: `${tooltipLeft}%`,
            top: `${Math.max(tooltipY - 40, 0)}px`,
            transform: tooltipLeft > 70 ? "translateX(-100%)" : tooltipLeft < 10 ? "translateX(0)" : "translateX(-50%)",
          }}
        >
          <div className="bg-zinc-900 text-white rounded-lg px-3 py-1.5 text-xs whitespace-nowrap shadow-lg">
            <span className="text-zinc-400 mr-1.5">{hl}</span>
            <span className="font-semibold">{hv.toLocaleString()}</span>
          </div>
        </div>
      )}

      <svg
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
        className="cursor-crosshair"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 수평 그리드 */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={yPos(v)}
              x2={width - PAD.right} y2={yPos(v)}
              stroke="#e4e4e7" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end" fontSize="10" fill="#71717a">
              {v}
            </text>
          </g>
        ))}

        {/* X축 레이블 */}
        {labels.map((label, i) => (
          <text key={i} x={xPos(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#71717a">
            {label}
          </text>
        ))}

        {/* Area */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* 호버 수직선 */}
        {hx !== null && (
          <line
            x1={hx} y1={PAD.top}
            x2={hx} y2={PAD.top + innerH}
            stroke="#d4d4d8" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {/* 데이터 포인트 */}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={xPos(i)} cy={yPos(v)}
            r={hoveredIdx === i ? 5 : 3.5}
            fill={color}
            stroke="white"
            strokeWidth="2"
            style={{ transition: "r 0.1s" }}
          />
        ))}
      </svg>
    </div>
  );
}

export function DashboardTrendChart({
  tabs,
  labels,
}: {
  tabs: TrendTab[];
  labels: string[];
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      {/* 탭 */}
      <div className="flex border-b border-zinc-100">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 px-4 py-3 transition-colors relative ${
                isActive ? "bg-white" : "hover:bg-zinc-50/80"
              }`}
            >
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: tab.color }}
                />
              )}
              <span className={`text-xs font-medium ${isActive ? "text-zinc-700" : "text-zinc-500"}`}>
                {tab.label}
              </span>
              <span
                className="text-lg font-bold tabular-nums"
                style={{ color: isActive ? tab.color : "#a1a1aa" }}
              >
                {tab.total.toLocaleString()}
                {tab.unit && <span className="text-xs font-normal ml-0.5">{tab.unit}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* 차트 */}
      <div className="px-5 pt-4 pb-3">
        {current && (
          <LineChart
            values={current.values}
            labels={labels}
            color={current.color}
            height={200}
          />
        )}
      </div>
    </div>
  );
}
