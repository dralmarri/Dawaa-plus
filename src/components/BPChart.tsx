import { useMemo } from "react";
import { subDays, parseISO, format } from "date-fns";
import type { BloodPressureReading } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  readings: BloodPressureReading[];
}

// Color by systolic category
function colorFor(sys: number, dia: number): string {
  if (sys < 120 && dia < 80) return "#16a34a"; // green normal
  if (sys < 130 && dia < 80) return "#eab308"; // yellow elevated
  return "#dc2626"; // red high
}

const BPChart = ({ readings }: Props) => {
  const { isRTL } = useLanguage();

  const data = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return readings
      .filter((r) => {
        try { return parseISO(r.date) >= cutoff; } catch { return false; }
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [readings]);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center text-muted-foreground text-sm">
        {isRTL ? "لا توجد قراءات في آخر 30 يوماً" : "No readings in the last 30 days"}
      </div>
    );
  }

  const W = 340, H = 200, padL = 32, padR = 12, padT = 12, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxV = Math.max(180, ...data.map((r) => r.systolic + 10));
  const minV = Math.min(50, ...data.map((r) => r.diastolic - 10));
  const range = maxV - minV || 1;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const xOf = (i: number) => padL + i * stepX;
  const yOf = (v: number) => padT + innerH - ((v - minV) / range) * innerH;

  const sysLine = data.map((r, i) => `${xOf(i)},${yOf(r.systolic)}`).join(" ");
  const diaLine = data.map((r, i) => `${xOf(i)},${yOf(r.diastolic)}`).join(" ");

  // Y-axis labels (4 evenly spaced)
  const yTicks = [0, 0.33, 0.66, 1].map((f) => {
    const v = Math.round(maxV - f * range);
    const y = padT + f * innerH;
    return { v, y };
  });

  // X-axis labels: first, middle, last
  const xLabelIdx = data.length === 1 ? [0] : [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground text-base">
          📊 {isRTL ? "آخر 30 يوماً" : "Last 30 Days"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {data.length} {isRTL ? "قراءة" : "readings"}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ direction: "ltr" }}>
        {/* Gridlines & Y labels */}
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="hsl(var(--border))" strokeWidth="1" />
            <text x={padL - 4} y={y + 3} fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="end">
              {v}
            </text>
          </g>
        ))}

        {/* Normal range band (80–120 systolic / 60-80 diastolic visual hint) */}
        <rect
          x={padL}
          y={yOf(120)}
          width={innerW}
          height={Math.max(0, yOf(80) - yOf(120))}
          fill="#16a34a"
          opacity="0.06"
        />

        {/* Lines */}
        <polyline points={sysLine} fill="none" stroke="#dc2626" strokeWidth="1.5" opacity="0.4" />
        <polyline points={diaLine} fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.4" />

        {/* Points (colored by category) */}
        {data.map((r, i) => (
          <g key={r.id}>
            <circle cx={xOf(i)} cy={yOf(r.systolic)} r="3.5" fill={colorFor(r.systolic, r.diastolic)} />
            <circle cx={xOf(i)} cy={yOf(r.diastolic)} r="2.5" fill="#2563eb" opacity="0.7" />
          </g>
        ))}

        {/* X labels */}
        {xLabelIdx.map((i) => (
          <text
            key={i}
            x={xOf(i)}
            y={H - 8}
            fontSize="9"
            fill="hsl(var(--muted-foreground))"
            textAnchor="middle"
          >
            {format(parseISO(data[i].date), "MMM d")}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#16a34a" }} />
          {isRTL ? "طبيعي" : "Normal"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
          {isRTL ? "مرتفع قليلاً" : "Elevated"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#dc2626" }} />
          {isRTL ? "عالي" : "High"}
        </span>
        <span className="flex items-center gap-1.5 ms-auto">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2563eb", opacity: 0.7 }} />
          {isRTL ? "انبساطي" : "Diastolic"}
        </span>
      </div>
    </div>
  );
};

export default BPChart;
