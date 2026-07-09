import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Droplet, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { store } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ChipSelector from "@/components/ChipSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BloodSugarReading } from "@/types";

const periodKeys: BloodSugarReading["period"][] = ["Fasting", "Before meal", "After meal", "Bedtime", "Random"];

const BloodSugarPage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [readings, setReadings] = useState<BloodSugarReading[]>(store.getBloodSugarReadings());
  const [showForm, setShowForm] = useState(readings.length === 0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [value, setValue] = useState<number>(110);
  const [period, setPeriod] = useState<BloodSugarReading["period"]>("Fasting");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [notes, setNotes] = useState("");

  const periodLabels = isRTL
    ? ["صائم", "قبل الأكل", "بعد الأكل", "قبل النوم", "عشوائي"]
    : ["Fasting", "Before meal", "After meal", "Bedtime", "Random"];

  const periodLabel = (k: BloodSugarReading["period"]) => periodLabels[periodKeys.indexOf(k)];

  // Smart default for the meal-relative period based on the current hour.
  // The user can still change it — fasting vs. after-meal can't be known
  // from the clock alone, so this is only a sensible starting point.
  const smartDefaultPeriod = (): BloodSugarReading["period"] => {
    const h = new Date().getHours();
    return h >= 4 && h < 10 ? "Fasting" : "Random";
  };

  const openAdd = () => {
    setValue(110);
    setNotes("");
    setPeriod(smartDefaultPeriod());
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTime(format(new Date(), "HH:mm"));
    setShowForm(true);
  };

  const classify = (v: number, p: BloodSugarReading["period"]) => {
    // Simple classification per ADA guidance (mg/dL)
    if (p === "Fasting" || p === "Before meal") {
      if (v < 70) return { label: isRTL ? "منخفض" : "Low", color: "text-warning bg-warning/10" };
      if (v <= 130) return { label: isRTL ? "طبيعي" : "Normal", color: "text-success bg-success/10" };
      return { label: isRTL ? "مرتفع" : "High", color: "text-destructive bg-destructive/10" };
    }
    // After meal / bedtime / random
    if (v < 70) return { label: isRTL ? "منخفض" : "Low", color: "text-warning bg-warning/10" };
    if (v <= 180) return { label: isRTL ? "طبيعي" : "Normal", color: "text-success bg-success/10" };
    return { label: isRTL ? "مرتفع" : "High", color: "text-destructive bg-destructive/10" };
  };

  const handleSave = async () => {
    if (!value || value < 20 || value > 700) {
      toast.error(isRTL ? "أدخل قيمة صحيحة (mg/dL)" : "Enter a valid value (mg/dL)");
      return;
    }
    const reading: BloodSugarReading = {
      id: crypto.randomUUID(),
      value,
      period,
      date,
      time,
      notes: notes || undefined,
    };
    await store.saveBloodSugarReading(reading);
    setReadings(store.getBloodSugarReadings());
    setShowForm(false);
    setValue(110);
    setPeriod(smartDefaultPeriod());
    setNotes("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTime(format(new Date(), "HH:mm"));
    toast.success(isRTL ? "تم حفظ القراءة" : "Reading saved");
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await store.deleteBloodSugarReading(deleteId);
    setReadings(store.getBloodSugarReadings());
    setDeleteId(null);
  };

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={isRTL ? "قياس السكر" : "Blood Sugar"} showBack onAdd={openAdd} />

      {showForm && (
        <div className="mx-4 mt-4 bg-card rounded-3xl border-2 border-primary/30 p-5 space-y-4 shadow-sm">
          <h2 className="font-bold text-foreground">{isRTL ? "قراءة جديدة" : "New Reading"}</h2>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              {isRTL ? "القراءة (mg/dL)" : "Value (mg/dL)"}
            </label>
            <input
              type="number"
              min={20}
              max={700}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">
              {isRTL ? "وقت القياس" : "When measured"}
            </label>
            <ChipSelector
              options={periodLabels}
              value={periodLabel(period)}
              onChange={(v) => setPeriod(periodKeys[periodLabels.indexOf(v)])}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "التاريخ" : "Date"}</label>
              <input type="date" value={date} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "الوقت" : "Time"}</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "ملاحظات" : "Notes"}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder={isRTL ? "اختياري..." : "Optional..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              {isRTL ? "حفظ" : "Save"}
            </button>
            {readings.length > 0 && (
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-border bg-card text-foreground font-bold">
                {isRTL ? "إلغاء" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}

      {readings.length === 0 && !showForm ? (
        <EmptyState
          icon={<Droplet className="w-16 h-16" />}
          title={isRTL ? "لا توجد قراءات" : "No readings yet"}
          subtitle={isRTL ? "سجّل أول قراءة سكر" : "Record your first blood sugar reading"}
          actionLabel={isRTL ? "إضافة قراءة" : "Add reading"}
          onAction={openAdd}
        />
      ) : (
        <div className="px-4 mt-4 space-y-3">
          {readings.map((r) => {
            const cls = classify(r.value, r.period);
            return (
              <div key={r.id} className="bg-card rounded-3xl border-2 border-primary/20 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">{r.value}</span>
                      <span className="text-sm text-muted-foreground">mg/dL</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls.color}`}>{cls.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {periodLabel(r.period)} · {r.date} {r.time}
                    </p>
                    {r.notes && <p className="text-sm text-foreground mt-1">{r.notes}</p>}
                  </div>
                  <button onClick={() => setDeleteId(r.id)}
                    className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0"
                    aria-label="delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && readings.length > 0 && (
        <button
          onClick={openAdd}
          className="fixed bottom-24 ltr:right-4 rtl:left-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
          aria-label="add"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف القراءة" : "Delete Reading"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل أنت متأكد من حذف هذه القراءة؟ لا يمكن التراجع." : "Are you sure you want to delete this reading? This cannot be undone."}
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

export default BloodSugarPage;
