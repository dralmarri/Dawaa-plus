import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, Heart, CalendarDays, FlaskConical, Plus, Check, X, AlertTriangle, Clock, MapPin } from "lucide-react";
import { store } from "@/lib/store";
import { generateTodayDoses, markDoseTaken, markDoseMissed, undoDose } from "@/lib/dose-tracker";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { DoseRecord } from "@/types";

const HomePage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [todayDoses, setTodayDoses] = useState<DoseRecord[]>([]);

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
    { label: isRTL ? "أقرب صيدلية" : "Nearest Pharmacy", icon: MapPin, path: "/nearby?type=pharmacy", color: "text-primary" },
    { label: isRTL ? "مستشفى ومركز صحي" : "Hospital & Clinic", icon: MapPin, path: "/nearby?type=hospital", color: "text-heart" },
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

  return (
    <div className="pb-28 px-4">
      <div className="pt-6 pb-4">
        <h1 className="text-3xl font-bold text-foreground">
          {t.appName} <span className="text-2xl">💊</span>
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-3">{t.todaySummary}</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-summary-schedule">{scheduled}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.schedule}</div>
          </div>
          <div className="bg-summary-taken rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-summary-taken-foreground">{taken}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.taken}</div>
          </div>
          <div className="bg-summary-missed rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-summary-missed-foreground">{missed}</div>
            <div className="text-sm text-muted-foreground mt-1">{t.missed}</div>
          </div>
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
      </div>

      {/* Today's Doses - Grouped by time */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-3">{t.upcomingDoses}</h2>
        {groupedDoses.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border">
            <p className="text-center text-muted-foreground p-6">{t.noDosesToday}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedDoses.map(({ time, doses }, groupIndex) => {
              const groupColors = [
                { border: "border-primary/30", headerBg: "bg-primary/10", headerText: "text-primary", icon: "text-primary" },
                { border: "border-warning/30", headerBg: "bg-warning/10", headerText: "text-warning", icon: "text-warning" },
                { border: "border-heart/30", headerBg: "bg-heart/10", headerText: "text-heart", icon: "text-heart" },
                { border: "border-summary-taken-foreground/30", headerBg: "bg-summary-taken", headerText: "text-summary-taken-foreground", icon: "text-summary-taken-foreground" },
                { border: "border-accent-foreground/20", headerBg: "bg-accent", headerText: "text-accent-foreground", icon: "text-accent-foreground" },
              ];
              const color = groupColors[groupIndex % groupColors.length];
              return (
              <div key={time} className={`bg-card rounded-2xl border ${color.border} overflow-hidden`}>
                {/* Time header */}
                <div className={`flex items-center gap-2 px-4 py-2.5 ${color.headerBg}`}>
                  <Clock className={`w-4 h-4 ${color.icon}`} />
                  <span className={`text-sm font-bold ${color.headerText}`}>{time}</span>
                  {doses.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ({doses.length} {isRTL ? "أدوية" : "meds"})
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {doses.map((dose) => {
                    const med = store.getMedications().find(m => m.id === dose.medicationId);
                    return (
                      <div key={dose.id} className="flex items-center justify-between p-4 pt-3">
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/medications/add?edit=${dose.medicationId}`)}
                        >
                          {med?.imageUrl ? (
                            <img src={med.imageUrl} alt={dose.medicationName} className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Pill className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{dose.medicationName}</p>
                            <p className="text-sm text-muted-foreground">
                              {med && `${med.dosage} ${med.form}`}
                            </p>
                          </div>
                        </div>

                        {dose.status === "pending" ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={(e) => handleTaken(dose.id, e)}
                              className="w-9 h-9 rounded-full bg-summary-taken flex items-center justify-center hover:opacity-80 transition-opacity"
                              aria-label={isRTL ? "تم أخذها" : "Mark taken"}
                            >
                              <Check className="w-5 h-5 text-summary-taken-foreground" />
                            </button>
                            <button
                              onClick={(e) => handleMissed(dose.id, e)}
                              className="w-9 h-9 rounded-full bg-summary-missed flex items-center justify-center hover:opacity-80 transition-opacity"
                              aria-label={isRTL ? "فائتة" : "Mark missed"}
                            >
                              <X className="w-5 h-5 text-summary-missed-foreground" />
                            </button>
                          </div>
                        ) : dose.status === "missed" ? (
                          <button
                            onClick={(e) => handleTaken(dose.id, e)}
                            className="text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 bg-summary-missed text-summary-missed-foreground hover:bg-summary-taken hover:text-summary-taken-foreground transition-colors"
                            title={isRTL ? "اضغط لتسجيلها كمأخوذة" : "Click to mark as taken"}
                          >
                            {isRTL ? "✗ فائتة" : "✗ Missed"}
                          </button>
                        ) : (
                          <span className="text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 bg-summary-taken text-summary-taken-foreground">
                            {isRTL ? "✓ تم" : "✓ Taken"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

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

export default HomePage;
