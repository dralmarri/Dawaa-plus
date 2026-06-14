import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, Heart, CalendarDays, FlaskConical, Plus, Check, X, AlertTriangle, Clock, FileText, Bell, Sunrise, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
import { store } from "@/lib/store";
import { generateTodayDoses, markDoseTaken, markDoseMissed, undoDose } from "@/lib/dose-tracker";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { DoseRecord } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper: classify a HH:mm time into morning/noon/evening with icon + label
function getTimeOfDay(time: string, isRTL: boolean) {
  const h = parseInt(time.split(":")[0] || "0", 10);
  if (h < 12) return { icon: Sunrise, label: isRTL ? "صباحاً" : "Morning", tint: "text-warning", bg: "bg-warning/10", border: "border-warning/30" };
  if (h < 17) return { icon: Sun, label: isRTL ? "ظهراً" : "Noon", tint: "text-summary-missed-foreground", bg: "bg-summary-missed", border: "border-summary-missed-foreground/30" };
  return { icon: Moon, label: isRTL ? "مساءً" : "Evening", tint: "text-primary", bg: "bg-primary/10", border: "border-primary/30" };
}

// Helper: time until next pending dose (in minutes)
function minutesUntil(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h || 0, m || 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

const HomePage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [todayDoses, setTodayDoses] = useState<DoseRecord[]>([]);
  const [dialogFilter, setDialogFilter] = useState<"scheduled" | "taken" | "missed" | null>(null);

  useEffect(() => {
    const doses = generateTodayDoses();
    setTodayDoses(doses);

    // Refresh every minute to auto-mark missed
    const interval = setInterval(() => {
      setTodayDoses(generateTodayDoses());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const today = format(new Date(), "yyyy-MM-dd");
  const scheduled = todayDoses.length;
  const taken = todayDoses.filter((d) => d.status === "taken").length;
  const missed = todayDoses.filter((d) => d.status === "missed").length;

  const handleTaken = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const { lowStockMed } = await markDoseTaken(id);
    setTodayDoses(generateTodayDoses());
    toast.success(isRTL ? "تم تسجيل الجرعة ✓" : "Dose recorded ✓", {
      action: {
        label: isRTL ? "تراجع" : "Undo",
        onClick: async () => {
          await undoDose(id);
          setTodayDoses(generateTodayDoses());
          toast(isRTL ? "تم التراجع — الجرعة لم تؤخذ" : "Reverted — dose not taken");
        },
      },
      duration: 6000,
    });
    if (lowStockMed) {
      toast.warning(
        isRTL
          ? `⚠️ مخزون ${lowStockMed.name} منخفض! متبقي ${lowStockMed.stock} فقط (${lowStockMed.percent}%)`
          : `⚠️ ${lowStockMed.name} stock is low! Only ${lowStockMed.stock} left (${lowStockMed.percent}%)`,
        { duration: 6000 }
      );
    }
  };

  const handleUndo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await undoDose(id);
    setTodayDoses(generateTodayDoses());
    toast(isRTL ? "تم التراجع — الجرعة لم تؤخذ" : "Reverted — dose not taken");
  };

  const handleMissed = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await markDoseMissed(id);
    setTodayDoses(generateTodayDoses());
  };

  const quickLinks = [
    { label: t.medications, icon: Pill, path: "/medications", color: "text-primary" },
    { label: t.bloodPressure, icon: Heart, path: "/blood-pressure", color: "text-heart" },
    { label: t.appointments, icon: CalendarDays, path: "/appointments", color: "text-warning" },
    { label: t.labTests, icon: FlaskConical, path: "/lab-tests", color: "text-primary" },
  ];

  // Group doses by scheduled time
  const groupedDoses = useMemo(() => {
    // Filter out taken doses, only show pending and missed
    const notTaken = todayDoses.filter(d => d.status !== 'taken');
    const sorted = [...notTaken].sort((a, b) => {
      const statusOrder = { pending: 0, missed: 1, taken: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    const groups: { time: string; doses: DoseRecord[] }[] = [];
    sorted.forEach(dose => {
      const last = groups[groups.length - 1];
      if (last && last.time === dose.scheduledTime) {
        last.doses.push(dose);
      } else {
        groups.push({ time: dose.scheduledTime, doses: [dose] });
      }
    });
    return groups;
  }, [todayDoses]);

  const settings = store.getSettings();
  const displayName = settings.userName || (isRTL ? "صديقنا" : "friend");
  const progressPct = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;

  // Next pending dose for the hero card
  const nextDose = useMemo(() => {
    const pending = todayDoses
      .filter(d => d.status === "pending")
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    return pending[0];
  }, [todayDoses]);

  const nextDoseMed = nextDose ? store.getMedications().find(m => m.id === nextDose.medicationId) : undefined;
  const minsLeft = nextDose ? minutesUntil(nextDose.scheduledTime) : 0;

  return (
    <div className="pb-28 px-4">
      {/* Hero greeting card */}
      <div className="mt-6 rounded-3xl p-8 text-primary-foreground shadow-lg relative overflow-hidden"
           style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(152 52% 18%) 100%)" }}>
        <div className="flex items-center justify-between gap-3">
          <img
            src="/app-icon.png"
            alt=""
            className="w-14 h-14 rounded-2xl object-cover shadow-md border border-white/20 shrink-0"
          />
          <div className="min-w-0 flex-1 text-end">
            <p className="text-sm opacity-80">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
            <h1 className="text-3xl font-bold mt-2 truncate">
              {isRTL ? `أهلاً، ${displayName}` : `Hello, ${displayName}`}
            </h1>
          </div>
        </div>
      </div>

      {/* Next dose hero */}
      {nextDose && (
        <div className="mt-4 rounded-3xl border-2 border-primary/30 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-primary uppercase tracking-wide">
              {isRTL ? "الجرعة القادمة" : "Next dose"}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              {nextDose.scheduledTime}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {nextDoseMed?.imageUrl ? (
              <img src={nextDoseMed.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-border" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Pill className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{nextDose.medicationName}</p>
              <p className="text-sm text-muted-foreground">
                {nextDoseMed ? `${nextDoseMed.dosage} ${nextDoseMed.form}` : ""}
              </p>
              {minsLeft > 0 && minsLeft < 24 * 60 && (
                <p className="text-xs text-primary font-medium mt-0.5">
                  {isRTL
                    ? `بعد ${minsLeft >= 60 ? `${Math.floor(minsLeft / 60)} س ${minsLeft % 60} د` : `${minsLeft} دقيقة`}`
                    : `in ${minsLeft >= 60 ? `${Math.floor(minsLeft / 60)}h ${minsLeft % 60}m` : `${minsLeft}m`}`}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={(e) => handleTaken(nextDose.id, e)}
              className="rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              <Check className="w-4 h-4" />
              {isRTL ? "تم أخذها" : "Mark taken"}
            </button>
            <button
              onClick={(e) => handleMissed(nextDose.id, e)}
              className="rounded-xl border border-border bg-card py-2.5 font-semibold text-sm text-muted-foreground hover:border-summary-missed-foreground hover:text-summary-missed-foreground transition-colors"
            >
              {isRTL ? "تأجيل" : "Skip"}
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 mt-6">
        <h2 className="text-lg font-bold text-foreground mb-3">{t.todaySummary}</h2>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setDialogFilter("scheduled")} className="bg-secondary rounded-2xl p-4 text-center hover:opacity-90 transition-opacity">
            <div className="text-3xl font-bold text-summary-schedule">{scheduled}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.schedule}</div>
          </button>
          <button onClick={() => setDialogFilter("taken")} className="bg-summary-taken rounded-2xl p-4 text-center hover:opacity-90 transition-opacity">
            <div className="text-3xl font-bold text-summary-taken-foreground">{taken}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.taken}</div>
          </button>
          <button onClick={() => setDialogFilter("missed")} className="bg-summary-missed rounded-2xl p-4 text-center hover:opacity-90 transition-opacity">
            <div className="text-3xl font-bold text-summary-missed-foreground">{missed}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.missed}</div>
          </button>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {(() => {
        const meds = store.getMedications();
        const lowStockMeds = meds.filter(m => {
          const initial = m.initialStock || m.stock;
          return initial > 0 && (m.stock / initial) <= 0.2;
        });
        if (lowStockMeds.length === 0) return null;
        return (
          <div className="mb-6 space-y-2">
            {lowStockMeds.map(m => (
              <div key={m.id} className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  {isRTL
                    ? `مخزون "${m.name}" منخفض — متبقي ${m.stock} فقط`
                    : `"${m.name}" stock is low — only ${m.stock} left`}
                </p>
              </div>
            ))}
          </div>
        );
      })()}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickLinks.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="bg-card rounded-2xl p-5 flex flex-col items-center gap-2 border border-border hover:border-primary/30 transition-colors"
          >
            <link.icon className={`w-7 h-7 ${link.color}`} />
            <span className="text-sm font-semibold text-foreground">{link.label}</span>
          </button>
        ))}
        <button
          onClick={() => navigate("/reports")}
          className="col-span-2 bg-card rounded-2xl p-5 flex flex-row items-center justify-center gap-3 border border-border hover:border-primary/30 transition-colors"
        >
          <FileText className="w-7 h-7 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {isRTL ? "التقارير الصحية" : "Health Reports"}
          </span>
        </button>
      </div>

      <DosesDialog
        open={dialogFilter !== null}
        onOpenChange={(o) => !o && setDialogFilter(null)}
        filter={dialogFilter}
        doses={todayDoses}
        isRTL={isRTL}
        t={t}
        onTaken={handleTaken}
        onMissed={handleMissed}
        onUndo={handleUndo}
      />




      <FloatingAddButton navigate={navigate} isRTL={isRTL} t={t} />
    </div>
  );
};

const FloatingAddButton = ({ navigate, isRTL, t }: { navigate: any; isRTL: boolean; t: any }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const items = [
    { label: t.addMedication, icon: Pill, path: "/medications/add", color: "bg-primary" },
    { label: t.bloodPressure, icon: Heart, path: "/blood-pressure", color: "bg-heart" },
    { label: t.appointments, icon: CalendarDays, path: "/appointments", color: "bg-warning" },
    { label: t.labTests, icon: FlaskConical, path: "/lab-tests", color: "bg-primary" },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-20 ltr:right-4 rtl:left-4 z-40">
      {open && (
        <div className="absolute bottom-16 ltr:right-0 rtl:left-0 flex flex-col gap-3 mb-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {items.map((item) => (
            <button
              key={item.path}
              onClick={() => { setOpen(false); navigate(item.path); }}
              className="flex items-center gap-3 ltr:flex-row rtl:flex-row-reverse"
            >
              <span className="text-sm font-semibold text-foreground bg-card border border-border rounded-xl px-3 py-2 shadow-md whitespace-nowrap">
                {item.label}
              </span>
              <span className={`w-11 h-11 rounded-full ${item.color} text-white flex items-center justify-center shadow-lg`}>
                <item.icon className="w-5 h-5" />
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform duration-200 ${open ? "rotate-45" : ""}`}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};

const DosesDialog = ({
  open,
  onOpenChange,
  filter,
  doses,
  isRTL,
  t,
  onTaken,
  onMissed,
  onUndo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filter: "scheduled" | "taken" | "missed" | null;
  doses: DoseRecord[];
  isRTL: boolean;
  t: any;
  onTaken: (id: string, e: React.MouseEvent) => void;
  onMissed: (id: string, e: React.MouseEvent) => void;
  onUndo: (id: string, e: React.MouseEvent) => void;
}) => {
  const filtered = useMemo(() => {
    if (!filter) return [];
    const list = filter === "scheduled" ? doses : doses.filter((d) => d.status === filter);
    return [...list].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [filter, doses]);

  const title =
    filter === "scheduled"
      ? t.schedule
      : filter === "taken"
      ? t.taken
      : filter === "missed"
      ? t.missed
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            {isRTL ? "لا توجد جرعات" : "No doses"}
          </p>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {filtered.map((dose) => {
              const med = store.getMedications().find((m) => m.id === dose.medicationId);
              const isPending = dose.status === "pending";
              const isMissed = dose.status === "missed";
              const borderClass = isPending
                ? "border-2 border-primary/30"
                : isMissed
                ? "border border-summary-missed"
                : "border border-summary-taken";
              const headerLabel = isPending
                ? isRTL ? "جرعة مجدولة" : "Scheduled dose"
                : isMissed
                ? isRTL ? "جرعة فائتة" : "Missed dose"
                : isRTL ? "تم أخذها" : "Taken";
              return (
                <div key={dose.id} className={`rounded-3xl bg-card p-4 shadow-sm ${borderClass}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">
                      {headerLabel}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {dose.scheduledTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {med?.imageUrl ? (
                      <img src={med.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-border" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Pill className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{dose.medicationName}</p>
                      <p className="text-sm text-muted-foreground">
                        {med ? `${med.dosage} ${med.form}` : ""}
                      </p>
                    </div>
                  </div>
                  {isPending ? (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={(e) => onTaken(dose.id, e)}
                        className="rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Check className="w-4 h-4" />
                        {isRTL ? "تم أخذها" : "Mark taken"}
                      </button>
                      <button
                        onClick={(e) => onMissed(dose.id, e)}
                        className="rounded-xl border border-border bg-card py-2.5 font-semibold text-sm text-muted-foreground hover:border-summary-missed-foreground hover:text-summary-missed-foreground transition-colors"
                      >
                        {isRTL ? "تأجيل" : "Skip"}
                      </button>
                    </div>
                  ) : isMissed ? (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={(e) => onTaken(dose.id, e)}
                        className="rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Check className="w-4 h-4" />
                        {isRTL ? "تم أخذها" : "Mark as taken"}
                      </button>
                      <button
                        onClick={(e) => onUndo(dose.id, e)}
                        className="rounded-xl border border-border bg-card py-2.5 font-semibold text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {isRTL ? "تراجع" : "Undo"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        {isRTL ? "تم أخذها" : "Taken"}
                      </div>
                      <button
                        onClick={(e) => onUndo(dose.id, e)}
                        className="rounded-xl border border-border bg-card py-2.5 font-semibold text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {isRTL ? "تراجع" : "Undo"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HomePage;

