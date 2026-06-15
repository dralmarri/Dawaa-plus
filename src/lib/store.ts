import { Preferences } from '@capacitor/preferences';
import { Medication, BloodPressureReading, Appointment, LabTest, DoseRecord, AppSettings } from '@/types';
import { cloudStore } from '@/lib/cloudStore';

const KEYS = {
  medications: 'dawaa_medications',
  readings: 'dawaa_readings',
  appointments: 'dawaa_appointments',
  labTests: 'dawaa_labTests',
  doseRecords: 'dawaa_doseRecords',
  settings: 'dawaa_settings',
};

// AuthPage UI is in Arabic, so default the app language to Arabic
// to match the main interface (especially after "continue as guest").
const detectDefaultLanguage = (): 'ar' | 'en' => 'ar';

const defaultSettings: AppSettings = {
  language: detectDefaultLanguage(),
  userName: '',
  notifications: true,
  voiceNotifications: false,
  reminderBefore: '5',
  escalationOnMissed: false,
  dailySummary: true,
  dailySummaryTime: '08:00',
  bpReminders: false,
};

// ── Sync cache (in-memory) ─────────────────────────────────────────
const cache: Record<string, unknown> = {};

async function loadAll() {
  for (const key of Object.values(KEYS)) {
    const { value } = await Preferences.get({ key });
    if (value) {
      try { cache[key] = JSON.parse(value); } catch { cache[key] = null; }
    }
  }
}

function getCache<T>(key: string, fallback: T): T {
  return (cache[key] as T) ?? fallback;
}

async function setCache<T>(key: string, value: T) {
  cache[key] = value;
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function initStore() {
  await loadAll();
}

/** Returns true if there is any guest data stored locally. */
export function hasLocalData(): boolean {
  const meds = getCache<unknown[]>(KEYS.medications, []);
  const readings = getCache<unknown[]>(KEYS.readings, []);
  const appts = getCache<unknown[]>(KEYS.appointments, []);
  const labs = getCache<unknown[]>(KEYS.labTests, []);
  const doses = getCache<unknown[]>(KEYS.doseRecords, []);
  return (meds.length + readings.length + appts.length + labs.length + doses.length) > 0;
}

/** Wipe all local cached data (used when user declines to import guest data). */
export async function clearLocalData() {
  for (const key of Object.values(KEYS)) {
    cache[key] = undefined;
    await Preferences.remove({ key });
  }
}

// ── Cloud sync helper ──────────────────────────────────────────────
let currentUid: string | null = null;

export function setStoreUid(uid: string | null) {
  currentUid = uid;
}

export function getStoreUid() {
  return currentUid;
}

// ── Store API ──────────────────────────────────────────────────────
export const store = {
  getMedications: (): Medication[] =>
    getCache(KEYS.medications, []),

  saveMedication: async (med: Medication) => {
    const all = store.getMedications();
    const idx = all.findIndex(m => m.id === med.id);
    if (idx >= 0) all[idx] = med; else all.push(med);
    await setCache(KEYS.medications, all);
    if (currentUid) await cloudStore.saveMedication(currentUid, med);
  },

  deleteMedication: async (id: string) => {
    await setCache(KEYS.medications, store.getMedications().filter(m => m.id !== id));
    if (currentUid) await cloudStore.deleteMedication(currentUid, id);
  },

  getReadings: (): BloodPressureReading[] =>
    getCache(KEYS.readings, []),

  saveReading: async (r: BloodPressureReading) => {
    const all = store.getReadings();
    all.unshift(r);
    await setCache(KEYS.readings, all);
    if (currentUid) await cloudStore.saveReading(currentUid, r);
  },

  deleteReading: async (id: string) => {
    await setCache(KEYS.readings, store.getReadings().filter(r => r.id !== id));
    if (currentUid) await cloudStore.deleteReading(currentUid, id);
  },

  getAppointments: (): Appointment[] =>
    getCache(KEYS.appointments, []),

  saveAppointment: async (a: Appointment) => {
    const all = store.getAppointments();
    const idx = all.findIndex(x => x.id === a.id);
    if (idx >= 0) all[idx] = a; else all.push(a);
    await setCache(KEYS.appointments, all);
    if (currentUid) await cloudStore.saveAppointment(currentUid, a);
  },

  deleteAppointment: async (id: string) => {
    await setCache(KEYS.appointments, store.getAppointments().filter(a => a.id !== id));
    if (currentUid) await cloudStore.deleteAppointment(currentUid, id);
  },

  getLabTests: (): LabTest[] =>
    getCache(KEYS.labTests, []),

  saveLabTest: async (t: LabTest) => {
    const all = store.getLabTests();
    all.push(t);
    await setCache(KEYS.labTests, all);
    if (currentUid) await cloudStore.saveLabTest(currentUid, t);
  },

  deleteLabTest: async (id: string) => {
    await setCache(KEYS.labTests, store.getLabTests().filter(t => t.id !== id));
    if (currentUid) await cloudStore.deleteLabTest(currentUid, id);
  },

  getDoseRecords: (): DoseRecord[] =>
    getCache(KEYS.doseRecords, []),

  saveDoseRecord: async (d: DoseRecord) => {
    const all = store.getDoseRecords();
    const idx = all.findIndex(x => x.id === d.id);
    if (idx >= 0) all[idx] = d; else all.push(d);
    await setCache(KEYS.doseRecords, all);
    if (currentUid) await cloudStore.saveDoseRecord(currentUid, d);
  },

  /** Bulk replace all dose records (used for deduplication cleanup) */
  _setDoseRecords: async (records: DoseRecord[]) => {
    await setCache(KEYS.doseRecords, records);
  },

  /** Delete all dose records for a specific medication on a specific date */
  deleteDosesForMedDate: async (medicationId: string, date: string) => {
    const all = store.getDoseRecords();
    const cleaned = all.filter(d => !(d.medicationId === medicationId && d.date === date));
    await setCache(KEYS.doseRecords, cleaned);
    if (currentUid) await cloudStore.deleteDoseRecordsForMedDate(currentUid, medicationId, date);
  },

  getSettings: (): AppSettings =>
    getCache(KEYS.settings, defaultSettings),

  saveSettings: async (s: AppSettings) => {
    await setCache(KEYS.settings, s);
    if (currentUid) await cloudStore.saveSettings(currentUid, s);
  },
};

// ── Load cloud data into local cache ──────────────────────────────
export async function syncFromCloud(uid: string) {
  try {
    const [medications, readings, appointments, labTests, doseRecords, settings] = await Promise.all([
      cloudStore.getMedications(uid),
      cloudStore.getReadings(uid),
      cloudStore.getAppointments(uid),
      cloudStore.getLabTests(uid),
      cloudStore.getDoseRecords(uid),
      cloudStore.getSettings(uid),
    ]);

    if (medications.length) await setCache(KEYS.medications, medications);
    if (readings.length) await setCache(KEYS.readings, readings.sort((a, b) => b.date.localeCompare(a.date)));
    if (appointments.length) await setCache(KEYS.appointments, appointments);
    if (labTests.length) await setCache(KEYS.labTests, labTests.sort((a, b) => b.date.localeCompare(a.date)));
    if (doseRecords.length) await setCache(KEYS.doseRecords, doseRecords);
    if (settings) {
      // Preserve the language the user had selected before sign-in/up
      // so the UI doesn't unexpectedly switch after login.
      const localSettings = getCache<AppSettings>(KEYS.settings, defaultSettings);
      const merged: AppSettings = { ...settings, language: localSettings.language };
      await setCache(KEYS.settings, merged);
      if (settings.language !== localSettings.language) {
        await cloudStore.saveSettings(uid, merged);
      }
    }
  } catch (err) {
    console.error("Cloud sync error:", err);
  }
}

// ── Migrate local data to cloud ──────────────────────────────────
export async function getMigratedFlag(uid: string): Promise<string | null> {
  const key = `dawaa_migrated_${uid}`;
  const { value } = await Preferences.get({ key });
  if (value) return value;
  // Backward compat: fall back to localStorage, then migrate it forward
  try {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      await Preferences.set({ key, value: legacy });
      return legacy;
    }
  } catch {}
  return null;
}

export async function setMigratedFlag(uid: string, value: string): Promise<void> {
  const key = `dawaa_migrated_${uid}`;
  await Preferences.set({ key, value });
  try { localStorage.setItem(key, value); } catch {}
}

export async function migrateLocalToCloud(uid: string): Promise<number> {
  if (await getMigratedFlag(uid)) return 0;



  let count = 0;
  try {
    const meds = store.getMedications();
    const readings = store.getReadings();
    const appointments = store.getAppointments();
    const labTests = store.getLabTests();
    const doseRecords = store.getDoseRecords();

    for (const m of meds) { await cloudStore.saveMedication(uid, m); count++; }
    for (const r of readings) { await cloudStore.saveReading(uid, r); count++; }
    for (const a of appointments) { await cloudStore.saveAppointment(uid, a); count++; }
    for (const t of labTests) { await cloudStore.saveLabTest(uid, t); count++; }
    for (const d of doseRecords) { await cloudStore.saveDoseRecord(uid, d); count++; }

    const settings = store.getSettings();
    if (settings.userName) {
      await cloudStore.saveSettings(uid, settings);
      count++;
    }

    await setMigratedFlag(uid, "true");
  } catch (err) {
    console.error("Migration error:", err);
  }
  return count;
}
