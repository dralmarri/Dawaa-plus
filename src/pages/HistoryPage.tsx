import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, X, Clock, ArrowLeft, Pill, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { store } from "@/lib/store";
import { generateTodayDoses, markDoseTaken, markDoseMissed } from "@/lib/dose-tracker";
import EmptyState from "@/components/EmptyState";
import AdherenceStats from "@/components/AdherenceStats";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { toast } from "sonner";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const [records, setRecords] = useState(() => {
    generateTodayDoses();
    return store.getDoseRecords();
  });
  const [filter, setFilter] = useState<"all" | "taken" | "missed">("all");
  const [adherencePeriod, setAdherencePeriod] = useState<"week" | "month">("week");
  const [resetConfirm, setResetConfirm] = useState(false);

  const refresh = () => setRecords([...store.getDoseRecords()]);

  const handleReset = async () => {
    await store.resetDoseRecords();
    refresh();
    setResetConfirm(false);
    toast.success(t.resetDoseCounterSuccess);
  };


  // Group records by date
  const grouped = useMemo(() => {
    const filtered = filter === "all" ? records : records.filter(r => r.status === filter);
    const groups: Record<string, typeof records> = {};
    
    filtered.forEach(r => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });

    // Sort dates descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, recs]) => ({
        date,
        records: recs.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
      }));
  }, [records, filter]);

  const totalTaken = records.filter(r => r.status === "taken").length;
  const totalMissed = records.filter(r => r.status === "missed").length;
  const totalPending = records.filter(r => r.status === "pending").length;

  const filterLabels = {
    all: isRTL ? "الكل" : "All",
    taken: isRTL ? "تم أخذها" : "Taken",
    missed: isRTL ? "فائتة" : "Missed",
  };

  const formatDate = (dateStr: string) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    if (dateStr === today) return isRTL ? "اليوم" : "Today";
    if (dateStr === yesterday) return isRTL ? "أمس" : "Yesterday";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="pb-28">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="text-foreground" aria-label="back">
          <ArrowLeft className={`w-6 h-6 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-3xl font-bold text-foreground">{t.doseHistory}</h1>
        <img
          src="/app-icon.png"
          alt=""
          className="w-9 h-9 rounded-xl object-cover shadow-sm border border-border"
        />
      </div>

      {/* Adherence stats */}
      <div className="px-4 mb-4">
        <AdherenceStats
          period={adherencePeriod}
          onTogglePeriod={() => setAdherencePeriod((p) => (p === "week" ? "month" : "week"))}
        />
      </div>

      {/* Summary bar */}
      {records.length > 0 && (
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-summary-taken rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-summary-taken-foreground">{totalTaken}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.taken}</div>
            </div>
            <div className="bg-summary-missed rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-summary-missed-foreground">{totalMissed}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.missed}</div>
            </div>
            <div className="bg-secondary rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-summary-schedule">{totalPending}</div>
              <div className="text-sm text-muted-foreground mt-1">{isRTL ? "معلقة" : "Pending"}</div>
            </div>
          </div>
          <button
            onClick={() => setResetConfirm(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive text-destructive py-3 font-semibold text-sm hover:bg-destructive/10 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t.resetDoseCounter}
          </button>
        </div>
      )}

      {/* Filter chips */}
      {records.length > 0 && (
        <div className="px-4 flex gap-2 mb-4">
          {(["all", "taken", "missed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-chip-active text-chip-active-foreground border-chip-active"
                  : "bg-chip text-chip-foreground border-border"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-16 h-16" />}
          title={t.noHistory}
          subtitle={isRTL ? "سيظهر سجل الجرعات هنا عند إضافة أدوية" : "Dose history will appear here when you add medications"}
        />
      ) : grouped.length === 0 ? (
        <div className="px-4">
          <p className="text-center text-muted-foreground py-8">
            {isRTL ? "لا توجد نتائج لهذا الفلتر" : "No results for this filter"}
          </p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {grouped.map(({ date, records: dayRecords }) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-muted-foreground mb-2">{formatDate(date)}</h3>
              <div className="bg-card rounded-3xl border-2 border-primary/30 shadow-sm divide-y divide-border">
                {dayRecords.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-7 h-7 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-foreground truncate">{rec.medicationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {rec.scheduledTime}
                          {rec.takenAt && ` → ${rec.takenAt}`}
                        </p>
                      </div>
                    </div>
                    {rec.status === "missed" ? (
                      <button
                        onClick={async () => {
                          await markDoseTaken(rec.id);
                          refresh();
                          toast.success(isRTL ? "تم تسجيل الجرعة ✓" : "Dose recorded ✓");
                        }}
                        className="rounded-xl bg-summary-missed text-summary-missed-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                        title={isRTL ? "اضغط لتسجيلها كمأخوذة" : "Click to mark as taken"}
                      >
                        <X className="w-4 h-4" />
                        {isRTL ? "فائتة" : "Missed"}
                      </button>
                    ) : rec.status === "taken" ? (
                      <button
                        onClick={async () => {
                          await markDoseMissed(rec.id);
                          refresh();
                          toast(isRTL ? "تم التغيير إلى فائتة" : "Marked as missed");
                        }}
                        className="rounded-xl bg-primary text-primary-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                        title={isRTL ? "اضغط لتغييرها إلى فائتة" : "Click to mark as missed"}
                      >
                        <Check className="w-4 h-4" />
                        {isRTL ? "تم أخذها" : "Taken"}
                      </button>

                    ) : (
                      <span className="rounded-xl bg-secondary text-summary-schedule py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {isRTL ? "معلقة" : "Pending"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
