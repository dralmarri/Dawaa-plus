import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Pill, Pencil, Trash2, CalendarClock, X } from "lucide-react";
import { parseISO, addDays, addMonths, addWeeks, format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import { store } from "@/lib/store";
import { cancelMedicationNotifications, rescheduleAllNotifications } from "@/lib/notifications";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Medication } from "@/types";

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 px-4 py-3">
    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-semibold text-foreground text-end break-words">{value}</span>
  </div>
);

const MedicationsPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [medications, setMedications] = useState<Medication[]>(store.getMedications());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailMed, setDetailMed] = useState<Medication | null>(null);

  const formMap: Record<string, string> = {
    Pills: t.pills, Capsules: t.capsules, Liquid: t.liquid, Injection: t.injection,
    Drops: t.drops, Cream: t.cream, Inhaler: t.inhaler, Patches: t.patches,
  };
  const freqMap: Record<string, string> = {
    "Once daily": t.onceDaily, "Twice daily": t.twiceDaily, "Three times daily": t.threeTimesDaily,
    "Four times daily": t.fourTimesDaily, "Every X hours": t.everyXHours, "Specific days": t.specificDays,
    "Every week": t.everyWeek, "Every 2 weeks": t.every2Weeks, "Every month": t.everyMonth,
  };
  const mealMap: Record<string, string> = {
    "No preference": t.noPreference, "Before meal": t.beforeMeal, "After meal": t.afterMeal, "With meal": t.withMeal,
  };

  const durationLabel = (days: number): string => {
    if (days % 30 === 0) return `${days / 30} ${t.months}`;
    if (days % 7 === 0) return `${days / 7} ${t.weeks}`;
    return `${days} ${t.days}`;
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const med = store.getMedications().find(m => m.id === deleteId);
    await store.deleteMedication(deleteId);
    if (med) {
      await cancelMedicationNotifications(med.id, med.times || []);
    }
    await rescheduleAllNotifications();
    setMedications(store.getMedications());
    setDeleteId(null);
  };

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={t.medications} showBack onAdd={() => navigate("/medications/add")} />

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
            <div
              key={med.id}
              onClick={() => setDetailMed(med)}
              className="bg-card rounded-3xl border-2 border-primary/30 p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
            >
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
                      <h3 className="font-bold text-foreground text-lg truncate">
                        {med.name}
                        {med.concentration && (
                          <span className="text-primary font-bold"> {med.concentration} {t.concentrationUnit}</span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {med.form} · {med.dosage} · {med.frequency}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.times}: {med.times.join(", ")}
                      </p>
                      {(() => {
                        const dosesPerCycle = med.times.length;
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
                    <div className="flex flex-col gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/medications/add?edit=${med.id}`)}
                        className="rounded-xl bg-primary text-primary-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Pencil className="w-4 h-4" />
                        {isRTL ? "تعديل" : "Edit"}
                      </button>
                      <button
                        onClick={() => setDeleteId(med.id)}
                        className="rounded-xl bg-summary-missed text-summary-missed-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isRTL ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {detailMed && createPortal(
        <div className="fixed inset-0 bg-foreground/50 z-[60] flex items-end overflow-hidden" onClick={() => setDetailMed(null)}>
          <div className="bg-card w-full max-h-[90vh] rounded-t-3xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-3 shrink-0 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">{isRTL ? "تفاصيل الدواء" : "Medication Details"}</h2>
              <button onClick={() => setDetailMed(null)}><X className="w-6 h-6 text-foreground" /></button>
            </div>

            <div className="overflow-y-auto overflow-x-hidden px-5 py-4 flex-1 space-y-4">
              <div className="flex items-center gap-3">
                {detailMed.imageUrl ? (
                  <img src={detailMed.imageUrl} alt={detailMed.name} className="w-20 h-20 rounded-2xl object-cover border border-border flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-9 h-9 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground break-words">
                    {detailMed.name}
                    {detailMed.concentration && (
                      <span className="text-primary"> {detailMed.concentration} {t.concentrationUnit}</span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{formMap[detailMed.form] || detailMed.form}</p>
                </div>
              </div>

              <div className="bg-muted/40 rounded-2xl divide-y divide-border">
                <DetailRow label={t.form} value={formMap[detailMed.form] || detailMed.form} />
                <DetailRow label={t.dosage} value={`${detailMed.dosage} ${formMap[detailMed.form] || detailMed.form}`} />
                {detailMed.concentration && (
                  <DetailRow label={t.concentration} value={`${detailMed.concentration} ${t.concentrationUnit}`} />
                )}
                <DetailRow label={t.frequency} value={freqMap[detailMed.frequency] || detailMed.frequency} />
                <DetailRow label={t.times} value={detailMed.times.join(" · ")} />
                <DetailRow label={t.mealRelation} value={mealMap[detailMed.mealRelation] || detailMed.mealRelation} />
                <DetailRow
                  label={t.usageType}
                  value={detailMed.isChronic
                    ? t.chronic
                    : `${t.temporary}${detailMed.durationDays ? ` — ${durationLabel(detailMed.durationDays)}` : ""}`}
                />
                {detailMed.startDate && (
                  <DetailRow label={t.startDate} value={format(parseISO(detailMed.startDate), "dd MMM yyyy", { locale: isRTL ? ar : undefined })} />
                )}
                <DetailRow label={t.stock} value={`${detailMed.stock} ${formMap[detailMed.form] || detailMed.form}`} />
                {detailMed.expiryDate && (
                  <DetailRow label={isRTL ? "تاريخ انتهاء الصلاحية" : "Expiry Date"} value={format(parseISO(detailMed.expiryDate), "dd MMM yyyy", { locale: isRTL ? ar : undefined })} />
                )}
                {detailMed.notes && <DetailRow label={t.notes} value={detailMed.notes} />}
              </div>
            </div>

            <div className="shrink-0 p-5 pt-3 border-t border-border flex gap-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <button
                onClick={() => { const id = detailMed.id; setDetailMed(null); navigate(`/medications/add?edit=${id}`); }}
                className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2"
              >
                <Pencil className="w-5 h-5" />
                {isRTL ? "تعديل" : "Edit"}
              </button>
              <button
                onClick={() => { const id = detailMed.id; setDetailMed(null); setDeleteId(id); }}
                className="py-4 px-6 rounded-2xl bg-summary-missed text-summary-missed-foreground font-bold text-lg flex items-center justify-center"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف الدواء" : "Delete Medication"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل أنت متأكد من حذف هذا الدواء؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this medication? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRTL ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MedicationsPage;
