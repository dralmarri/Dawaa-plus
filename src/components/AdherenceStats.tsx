import { useMemo } from "react";
import { subDays, format, parseISO } from "date-fns";
import { TrendingUp } from "lucide-react";
import { store } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";

type Period = "week" | "month";

interface Props {
  period: Period;
  onTogglePeriod: () => void;
}

const AdherenceStats = ({ period, onTogglePeriod }: Props) => {
  const { isRTL } = useLanguage();
  const records = store.getDoseRecords();

  const stats = useMemo(() => {
    const days = period === "week" ? 7 : 30;
    const cutoff = subDays(new Date(), days - 1);
    cutoff.setHours(0, 0, 0, 0);

    // Only count past-or-current doses (exclude future pending)
    const now = new Date();
    const inRange = records.filter((r) => {
      try {
        const d = parseISO(r.date);
        return d >= cutoff && d <= now;
      } catch { return false; }
    });

    const taken = inRange.filter((r) => r.status === "taken").length;
    const missed = inRange.filter((r) => r.status === "missed").length;
    const total = taken + missed;
    const pct = total === 0 ? 0 : Math.round((taken / total) * 100);

    // Per-day bars
    const byDay: Array<{ date: string; taken: number; missed: number; label: string }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const ds = format(d, "yyyy-MM-dd");
      const dayRecs = inRange.filter((r) => r.date === ds);
      byDay.push({
        date: ds,
        taken: dayRecs.filter((r) => r.status === "taken").length,
        missed: dayRecs.filter((r) => r.status === "missed").length,
        label: format(d, period === "week" ? "EEE" : "d"),
      });
    }

    return { taken, missed, total, pct, byDay };
  }, [records, period]);

  const scoreColor =
    stats.pct >= 85 ? "text-success" :
    stats.pct >= 60 ? "text-warning" :
    "text-destructive";

  const scoreBg =
    stats.pct >= 85 ? "bg-success" :
    stats.pct >= 60 ? "bg-warning" :
    "bg-destructive";

  const maxBarH = Math.max(1, ...stats.byDay.map((d) => d.taken + d.missed));

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-base">
            {isRTL ? "الالتزام بالعلاج" : "Adherence"}
          </h3>
        </div>
        <button
          onClick={onTogglePeriod}
          className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full"
        >
          {period === "week"
            ? (isRTL ? "أسبوعي" : "Weekly")
            : (isRTL ? "شهري" : "Monthly")}
        </button>
      </div>

      {stats.total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {isRTL ? "لا توجد جرعات مسجلة بعد" : "No doses recorded yet"}
        </p>
      ) : (
        <>
          <div className="flex items-end gap-3 mb-4">
            <div className={`text-5xl font-bold ${scoreColor}`}>{stats.pct}%</div>
            <div className="text-xs text-muted-foreground mb-2">
              {isRTL
                ? period === "week" ? "هذا الأسبوع" : "هذا الشهر"
                : period === "week" ? "this week" : "this month"}
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="font-bold text-foreground">{stats.taken}</span>
              <span className="text-muted-foreground">{isRTL ? "تم" : "taken"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span className="font-bold text-foreground">{stats.missed}</span>
              <span className="text-muted-foreground">{isRTL ? "فائتة" : "missed"}</span>
            </span>
          </div>

          {/* Daily bars */}
          <div className="flex items-end justify-between gap-1 h-24" style={{ direction: "ltr" }}>
            {stats.byDay.map((d) => {
              const total = d.taken + d.missed;
              const hPct = total === 0 ? 0 : (total / maxBarH) * 100;
              const takenPct = total === 0 ? 0 : (d.taken / total) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="w-full flex flex-col-reverse rounded-md overflow-hidden bg-muted/50" style={{ height: `${Math.max(hPct, 4)}%` }}>
                    <div className="bg-success" style={{ height: `${takenPct}%` }} />
                    <div className="bg-destructive" style={{ height: `${100 - takenPct}%` }} />
                  </div>
                  {period === "week" || stats.byDay.indexOf(d) % 5 === 0 ? (
                    <span className="text-[10px] text-muted-foreground truncate">{d.label}</span>
                  ) : (
                    <span className="text-[10px] text-transparent">.</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdherenceStats;
