import { useState, useMemo } from "react";
import { CalendarDays, X, Pencil, Clock, MapPin, StickyNote, User } from "lucide-react";
import { store } from "@/lib/store";
import { format, differenceInCalendarDays, isPast } from "date-fns";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import ChipSelector from "@/components/ChipSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Appointment } from "@/types";

const AppointmentsPage = () => {
  const { t, isRTL } = useLanguage();
  const [appointments, setAppointments] = useState(store.getAppointments());
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("upcoming");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const specialtyMap: Record<string, string> = {
    "General Practitioner": t.generalPractitioner, "Dentist": t.dentist,
    "Cardiologist": t.cardiologist, "Dermatologist": t.dermatologist,
    "Ophthalmologist": t.ophthalmologist, "Orthopedist": t.orthopedist,
    "Neurologist": t.neurologist, "Other": t.other,
  };
  const specialtyKeys = Object.keys(specialtyMap);
  const specialtyLabels = Object.values(specialtyMap);

  const reminderMap: Record<string, string> = {
    "At time": t.atTime, "15 minutes": t.min15, "30 minutes": t.min30,
    "60 minutes": t.min60, "120 minutes": t.min120,
  };
  const reminderKeys = Object.keys(reminderMap);
  const reminderLabels = Object.values(reminderMap);

  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [reminder, setReminder] = useState("30 minutes");
  const [notes, setNotes] = useState("");

  const tabLabels = { all: t.all, upcoming: t.upcoming, completed: t.completed };

  const sorted = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return [...appointments]
      .filter((a) => {
        if (tab === "upcoming") return !a.completed && a.date >= todayStr;
        if (tab === "completed") return a.completed;
        return true;
      })
      .sort((a, b) => {
        const ak = `${a.date} ${a.time}`;
        const bk = `${b.date} ${b.time}`;
        return tab === "completed" ? bk.localeCompare(ak) : ak.localeCompare(bk);
      });
  }, [appointments, tab]);

  const getCountdown = (apt: Appointment) => {
    const [h, m] = apt.time.split(":").map(Number);
    const dt = new Date(apt.date);
    if (!isNaN(h)) dt.setHours(h, m || 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = differenceInCalendarDays(dt, today);
    if (apt.completed) return null;
    if (isPast(dt) && days < 0) return { label: isRTL ? "فات الموعد" : "Past due", tone: "bg-destructive/10 text-destructive" };
    if (days === 0) return { label: isRTL ? "اليوم" : "Today", tone: "bg-primary/15 text-primary" };
    if (days === 1) return { label: isRTL ? "غداً" : "Tomorrow", tone: "bg-primary/10 text-primary" };
    if (days <= 7) return { label: isRTL ? `بعد ${days} أيام` : `In ${days} days`, tone: "bg-accent text-accent-foreground" };
    return { label: isRTL ? `بعد ${days} يوم` : `In ${days} days`, tone: "bg-muted text-muted-foreground" };
  };

  const openEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    setDoctorName(apt.doctorName || "");
    setSpecialty(apt.specialty);
    setDate(apt.date);
    setTime(apt.time);
    setLocation(apt.location);
    setReminder(apt.reminderBefore);
    setNotes(apt.notes);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setDoctorName("");
    setSpecialty("General Practitioner");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTime("09:00");
    setLocation("");
    setReminder("30 minutes");
    setNotes("");
    setShowForm(true);
  };

  const handleSave = () => {
    const apt: Appointment = {
      id: editingId || crypto.randomUUID(), doctorName: doctorName.trim() || undefined,
      specialty, date, time, location,
      reminderBefore: reminder, notes, completed: editingId ? (appointments.find(a => a.id === editingId)?.completed || false) : false,
    };
    store.saveAppointment(apt);
    setAppointments(store.getAppointments());
    setShowForm(false);
    setEditingId(null);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    store.deleteAppointment(deleteId);
    setAppointments(store.getAppointments());
    setDeleteId(null);
  };

  const toggleComplete = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      apt.completed = !apt.completed;
      store.saveAppointment(apt);
      setAppointments(store.getAppointments());
    }
  };

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={t.appointments} showBack onAdd={openAdd} />

      <div className="px-4 flex gap-2 mb-4">
        {(["upcoming", "all", "completed"] as const).map((tKey) => (
          <button key={tKey} onClick={() => setTab(tKey)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              tab === tKey ? "bg-chip-active text-chip-active-foreground border-chip-active" : "bg-chip text-chip-foreground border-border"
            }`}>
            {tabLabels[tKey]}
          </button>
        ))}
      </div>

      {sorted.length === 0 && !showForm ? (
        <EmptyState icon={<CalendarDays className="w-16 h-16" />} title={t.noAppointments} subtitle={t.addFirstAppointment}
          actionLabel={t.addAppointment} onAction={openAdd} />
      ) : (
        <div className="px-4 space-y-3">
          {sorted.map((apt) => {
            const countdown = getCountdown(apt);
            return (
              <div key={apt.id} className="bg-card rounded-3xl border-2 border-primary/30 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{specialtyMap[apt.specialty] || apt.specialty}</h3>
                      {countdown && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${countdown.tone}`}>
                          {countdown.label}
                        </span>
                      )}
                    </div>
                    {apt.doctorName && (
                      <p className="text-sm text-foreground mt-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {isRTL ? `د. ${apt.doctorName}` : `Dr. ${apt.doctorName}`}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(apt.date), "MMM d, yyyy")} · {apt.time}
                    </p>
                    {apt.location && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {apt.location}
                      </p>
                    )}
                    {apt.notes && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="break-words">{apt.notes}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-stretch shrink-0">
                    <button onClick={() => openEdit(apt)}
                      className="rounded-xl bg-primary text-primary-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <Pencil className="w-4 h-4" />
                      {isRTL ? "تعديل" : "Edit"}
                    </button>
                    <button onClick={() => toggleComplete(apt.id)}
                      className={`rounded-xl py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity ${apt.completed ? "bg-summary-taken text-summary-taken-foreground" : "bg-accent text-accent-foreground"}`}>
                      {apt.completed ? `✓ ${t.done}` : t.markDone}
                    </button>
                    <button onClick={() => setDeleteId(apt.id)}
                      className="rounded-xl bg-summary-missed text-summary-missed-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                      <X className="w-4 h-4" />
                      {isRTL ? "حذف" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-foreground/50 z-[60] flex items-end overflow-hidden">
          <div className="bg-card w-full max-h-[88vh] rounded-t-3xl flex flex-col">
            <div className="flex items-center justify-between p-5 pb-3 shrink-0">
              <h2 className="text-xl font-bold text-foreground">{editingId ? t.editAppointment : t.addAppointment}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-6 h-6 text-foreground" /></button>
            </div>
            <div className="space-y-4 overflow-y-auto overflow-x-hidden px-5 flex-1">
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{isRTL ? "اسم الطبيب" : "Doctor Name"}</label>
                <input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder={isRTL ? "اختياري" : "Optional"}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.specialty}</label>
                <ChipSelector options={specialtyLabels} value={specialtyMap[specialty]}
                  onChange={(v) => setSpecialty(specialtyKeys[specialtyLabels.indexOf(v)])} />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.appointmentDate} *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.appointmentTime} *</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.location}</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t.location}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.reminderBeforeAppointment}</label>
                <ChipSelector options={reminderLabels} value={reminderMap[reminder]}
                  onChange={(v) => setReminder(reminderKeys[reminderLabels.indexOf(v)])} />
              </div>
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.notes}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notes + "..."} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>
            <div className="shrink-0 p-5 pt-3 border-t border-border pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <button onClick={handleSave} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg">{t.save}</button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف الموعد" : "Delete Appointment"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل أنت متأكد من حذف هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this appointment? This action cannot be undone."}
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

export default AppointmentsPage;
