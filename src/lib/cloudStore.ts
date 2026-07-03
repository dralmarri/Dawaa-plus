import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Medication, BloodPressureReading, Appointment, LabTest, DoseRecord, AppSettings } from "@/types";

// The generated Supabase types predate some columns added later via
// migrations, so extend the row type with the newer settings fields.
type SettingsRow = Tables<"user_settings"> & {
  date_of_birth?: string | null;
  blood_type?: string | null;
  allergies?: string | null;
  chronic_diseases?: string | null;
  custom_diseases?: string | null;
  bp_reminders?: boolean | null;
  bp_custom_times?: string | null;
  blood_sugar_reminders?: boolean | null;
  blood_sugar_custom_times?: string | null;
};

// ── Helper: convert camelCase ↔ snake_case ──────────────────────

function toMedRow(uid: string, m: Medication) {
  return {
    id: m.id, user_id: uid, name: m.name, form: m.form, dosage: m.dosage,
    concentration: m.concentration || null, frequency: m.frequency,
    times: JSON.stringify(m.times), start_date: m.startDate || null,
    is_chronic: m.isChronic, duration_days: m.durationDays || null,
    meal_relation: m.mealRelation, notes: m.notes, stock: m.stock,
    initial_stock: m.initialStock || null, image_url: m.imageUrl || null,
    expiry_date: m.expiryDate || null,
    created_at: m.createdAt,
  };
}

function safeParse<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== "string") return val as T;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function fromMedRow(r: Tables<"medications">): Medication {
  return {
    id: r.id, name: r.name, form: r.form, dosage: Number(r.dosage),
    concentration: r.concentration || undefined, frequency: r.frequency,
    times: safeParse<string[]>(r.times, []),
    startDate: r.start_date || undefined, isChronic: r.is_chronic,
    durationDays: r.duration_days || undefined, mealRelation: r.meal_relation,
    notes: r.notes || "", stock: Number(r.stock),
    initialStock: r.initial_stock ? Number(r.initial_stock) : undefined,
    imageUrl: r.image_url || undefined,
    expiryDate: r.expiry_date || undefined,
    createdAt: r.created_at,
  };
}

function toReadingRow(uid: string, r: BloodPressureReading) {
  return {
    id: r.id, user_id: uid, systolic: r.systolic, diastolic: r.diastolic,
    heart_rate: r.heartRate, period: r.period, date: r.date, time: r.time,
    notes: r.notes || '',
  };
}

function fromReadingRow(r: Tables<"blood_pressure_readings">): BloodPressureReading {
  return {
    id: r.id, systolic: r.systolic, diastolic: r.diastolic,
    heartRate: r.heart_rate, period: r.period, date: r.date, time: r.time,
    notes: r.notes || '',
  };
}

function toApptRow(uid: string, a: Appointment) {
  return {
    id: a.id, user_id: uid, doctor_name: a.doctorName || null,
    specialty: a.specialty, date: a.date, time: a.time,
    location: a.location, reminder_before: a.reminderBefore,
    notes: a.notes, completed: a.completed,
  };
}

function fromApptRow(r: Tables<"appointments">): Appointment {
  return {
    id: r.id, doctorName: r.doctor_name || undefined, specialty: r.specialty,
    date: r.date, time: r.time, location: r.location || "",
    reminderBefore: r.reminder_before || "15", notes: r.notes || "",
    completed: r.completed,
  };
}

function toLabRow(uid: string, t: LabTest) {
  return {
    id: t.id, user_id: uid, name: t.name, notes: t.notes,
    file_url: t.fileUrl || null, date: t.date,
  };
}

function fromLabRow(r: Tables<"lab_tests">): LabTest {
  return {
    id: r.id, name: r.name, notes: r.notes || "",
    fileUrl: r.file_url || undefined, date: r.date,
  };
}

function toDoseRow(uid: string, d: DoseRecord) {
  return {
    id: d.id, user_id: uid, medication_id: d.medicationId,
    medication_name: d.medicationName, scheduled_time: d.scheduledTime,
    taken_at: d.takenAt || null, status: d.status, date: d.date,
  };
}

function fromDoseRow(r: Tables<"dose_records">): DoseRecord {
  return {
    id: r.id, medicationId: r.medication_id, medicationName: r.medication_name,
    scheduledTime: r.scheduled_time, takenAt: r.taken_at || undefined,
    status: r.status, date: r.date,
  };
}

// ── Cloud Store API ────────────────────────────────────────────────

export const cloudStore = {
  // Medications
  getMedications: async (uid: string): Promise<Medication[]> => {
    const { data } = await supabase.from("medications").select("*").eq("user_id", uid);
    return (data || []).map(fromMedRow);
  },
  saveMedication: async (uid: string, med: Medication) => {
    await supabase.from("medications").upsert(toMedRow(uid, med));
  },
  deleteMedication: async (_uid: string, id: string) => {
    await supabase.from("medications").delete().eq("id", id);
  },

  // Blood Pressure
  getReadings: async (uid: string): Promise<BloodPressureReading[]> => {
    const { data } = await supabase.from("blood_pressure_readings").select("*").eq("user_id", uid);
    return (data || []).map(fromReadingRow);
  },
  saveReading: async (uid: string, r: BloodPressureReading) => {
    await supabase.from("blood_pressure_readings").upsert(toReadingRow(uid, r));
  },
  deleteReading: async (_uid: string, id: string) => {
    await supabase.from("blood_pressure_readings").delete().eq("id", id);
  },

  // Appointments
  getAppointments: async (uid: string): Promise<Appointment[]> => {
    const { data } = await supabase.from("appointments").select("*").eq("user_id", uid);
    return (data || []).map(fromApptRow);
  },
  saveAppointment: async (uid: string, a: Appointment) => {
    await supabase.from("appointments").upsert(toApptRow(uid, a));
  },
  deleteAppointment: async (_uid: string, id: string) => {
    await supabase.from("appointments").delete().eq("id", id);
  },

  // Lab Tests
  getLabTests: async (uid: string): Promise<LabTest[]> => {
    const { data } = await supabase.from("lab_tests").select("*").eq("user_id", uid);
    return (data || []).map(fromLabRow);
  },
  saveLabTest: async (uid: string, t: LabTest) => {
    await supabase.from("lab_tests").upsert(toLabRow(uid, t));
  },
  deleteLabTest: async (_uid: string, id: string) => {
    await supabase.from("lab_tests").delete().eq("id", id);
  },

  // Dose Records
  getDoseRecords: async (uid: string): Promise<DoseRecord[]> => {
    const { data } = await supabase.from("dose_records").select("*").eq("user_id", uid);
    return (data || []).map(fromDoseRow);
  },
  saveDoseRecord: async (uid: string, d: DoseRecord) => {
    await supabase.from("dose_records").upsert(toDoseRow(uid, d));
  },
  deleteDoseRecordsForMedDate: async (uid: string, medicationId: string, date: string) => {
    await supabase.from("dose_records").delete().eq("user_id", uid).eq("medication_id", medicationId).eq("date", date);
  },

  deleteAllDoseRecords: async (uid: string) => {
    await supabase.from("dose_records").delete().eq("user_id", uid);
  },

  // Settings
  getSettings: async (uid: string): Promise<AppSettings | null> => {
    const { data } = await supabase.from("user_settings").select("*").eq("user_id", uid).single();
    if (!data) return null;
    const d = data as SettingsRow;
    return {
      language: d.language as "en" | "ar",
      userName: d.user_name || "",
      dateOfBirth: d.date_of_birth || undefined,
      bloodType: d.blood_type || undefined,
      allergies: d.allergies || undefined,
      chronicDiseases: safeParse<string[]>(d.chronic_diseases, []) || undefined,
      customDiseases: d.custom_diseases || undefined,
      notifications: d.notifications,
      voiceNotifications: d.voice_notifications,
      reminderBefore: d.reminder_before,
      escalationOnMissed: d.escalation_on_missed,
      emergencyContact: safeParse<AppSettings["emergencyContact"]>(d.emergency_contact, undefined),
      dailySummary: d.daily_summary,
      dailySummaryTime: d.daily_summary_time,
      bpReminders: d.bp_reminders ?? false,
      bpCustomTimes: safeParse<string[]>(d.bp_custom_times, []) || undefined,
      bloodSugarReminders: d.blood_sugar_reminders ?? false,
      bloodSugarCustomTimes: safeParse<string[]>(d.blood_sugar_custom_times, []) || undefined,
    };
  },
  saveSettings: async (uid: string, s: AppSettings) => {
    await supabase.from("user_settings").upsert(
      {
        user_id: uid,
        language: s.language,
        user_name: s.userName,
        date_of_birth: s.dateOfBirth || null,
        blood_type: s.bloodType || null,
        allergies: s.allergies || null,
        chronic_diseases: s.chronicDiseases ? JSON.stringify(s.chronicDiseases) : null,
        custom_diseases: s.customDiseases || null,
        notifications: s.notifications,
        voice_notifications: s.voiceNotifications,
        reminder_before: s.reminderBefore,
        escalation_on_missed: s.escalationOnMissed,
        emergency_contact: s.emergencyContact || null,
        daily_summary: s.dailySummary,
        daily_summary_time: s.dailySummaryTime,
        bp_reminders: s.bpReminders,
        bp_custom_times: s.bpCustomTimes ? JSON.stringify(s.bpCustomTimes) : null,
        blood_sugar_reminders: s.bloodSugarReminders ?? false,
        blood_sugar_custom_times: s.bloodSugarCustomTimes ? JSON.stringify(s.bloodSugarCustomTimes) : null,
      },
      { onConflict: "user_id" }
    );
  },

  // Lab Results (kept as JSON blob)
  getLabResults: async (_uid: string): Promise<Record<string, unknown>> => {
    // Store lab results as a special entry in user_settings or use localStorage
    // For simplicity, lab results remain in localStorage
    return {};
  },
  saveLabResults: async (_uid: string, _results: Record<string, unknown>) => {
    // Lab results remain in localStorage for now
  },
};
