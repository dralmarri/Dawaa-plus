import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, Pencil, Trash2, CalendarClock } from "lucide-react";
import { parseISO, addDays, addMonths, addWeeks, format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { store } from "@/lib/store";
import { cancelMedicationNotifications, rescheduleAllNotifications } from "@/lib/notifications";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Medication } from "@/types";

const MedicationsPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [medications, setMedications] = useState<Medication[]>(store.getMedications());

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(isRTL ? "هل أنت متأكد من حذف هذا الدواء؟" : "Are you sure you want to delete this medication?");
    if (!confirmed) return;
    const med = store.getMedications().find(m => m.id === id);
    await store.deleteMedication(id);
    if (med) {
      await cancelMedicationNotifications(med.id, med.times || []);
    }
    await rescheduleAllNotifications();
    setMedications(store.getMedications());
  };

  return (
    <div className="pb-28">
      <PageHeader title={t.medications} onAdd={() => navigate("/medications/add")} />

      {medications.length === 0 ? (
        <EmptyState
          icon={<Pill className="w-16 h-16" />}
          title={t.noMedications}
          subtitle={t.addFirstMedication}
          actionLabel={t.addMedication}
          onAction={() => navigate("/medications/add")}
        />
      ) : (
        <div className="px-4 space-y-3 mt-4">
          {medications.map((med) => (
            <div key={med.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start gap-3">
                {med.imageUrl ? (
                  <img src={med.imageUrl} alt={med.name} className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-lg truncate">{med.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {med.form} · {med.dosage} · {med.frequency}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.times}: {med.times.join(", ")}
                      </p>
                      {(() => {
                        let dosesPerCycle = med.times.length;
                        let twoMonthSupply: number;
                        switch (med.frequency) {
                          case "Every week": twoMonthSupply = dosesPerCycle * 8; break;
                          case "Every 2 weeks": twoMonthSupply = dosesPerCycle * 4; break;
                          case "Every month": twoMonthSupply = dosesPerCycle * 2; break;
                          default: twoMonthSupply = dosesPerCycle * 60; break;
                        }
                        const percent = twoMonthSupply > 0 ? Math.min(med.stock / twoMonthSupply, 1) : 1;
                        const pct100 = Math.round(percent * 100);
                        const colorClass = percent <= 0.2 ? "text-destructive" : percent <= 0.5 ? "text-warning" : "text-success";
                        const barColor = percent <= 0.2 ? "bg-destructive" : percent <= 0.5 ? "bg-warning" : "bg-success";
                        return (
                          <div className="mt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-muted-foreground">{t.stock}</span>
                              <span className={`text-sm font-bold ${colorClass}`}>{med.stock} ({pct100}%)</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct100}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        if (!med.expiryDate) return null;
                        const exp = parseISO(med.expiryDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const daysLeft = differenceInDays(exp, today);
                        if (daysLeft < 0) {
                          return (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold bg-destructive/15 text-destructive px-2.5 py-1 rounded-full">
                              ⚠️ {isRTL ? `منتهي الصلاحية منذ ${-daysLeft} يوم` : `Expired ${-daysLeft}d ago`}
                            </div>
                          );
                        }
                        if (daysLeft <= 30) {
                          return (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold bg-warning/15 text-warning px-2.5 py-1 rounded-full">
                              ⏳ {isRTL ? `ينتهي خلال ${daysLeft} يوم` : `Expires in ${daysLeft}d`}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {(() => {
                        // Show next dose date for non-daily medications
                        const nonDaily = ['Every week', 'Every 2 weeks', 'Every month'];
                        if (!nonDaily.includes(med.frequency) || !med.startDate) return null;

                        const start = parseISO(med.startDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        let next = new Date(start);
                        next.setHours(0, 0, 0, 0);

                        if (med.frequency === 'Every week') {
                          while (next <= today) next = addWeeks(next, 1);
                        } else if (med.frequency === 'Every 2 weeks') {
                          while (next <= today) next = addWeeks(next, 2);
                        } else if (med.frequency === 'Every month') {
                          while (next <= today) next = addMonths(next, 1);
                        }

                        const daysLeft = differenceInDays(next, today);
                        const dateStr = format(next, 'dd MMM yyyy', { locale: isRTL ? ar : undefined });
                        const daysLabel = isRTL
                          ? (daysLeft === 0 ? "اليوم" : daysLeft === 1 ? "غداً" : `بعد ${daysLeft} يوم`)
                          : (daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} days`);

                        return (
                          <div className="mt-2 flex items-center gap-1.5 text-xs">
                            <CalendarClock className="w-3.5 h-3.5 text-primary" />
                            <span className="text-muted-foreground">{isRTL ? "الجرعة القادمة:" : "Next dose:"}</span>
                            <span className="font-semibold text-primary">{dateStr}</span>
                            <span className={`font-medium ${daysLeft <= 1 ? "text-warning" : "text-muted-foreground"}`}>({daysLabel})</span>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/medications/add?edit=${med.id}`)}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
                        aria-label={isRTL ? "تعديل الدواء" : "Edit medication"}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(med.id)}
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"
                        aria-label={isRTL ? "حذف الدواء" : "Delete medication"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicationsPage;
