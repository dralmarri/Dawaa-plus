import { LocalNotifications, PermissionStatus, type Schedule } from '@capacitor/local-notifications';
import { store } from './store';
import type { Medication, Appointment } from '@/types';
import { formatTime12 } from "@/lib/time";

let scheduledIds: number[] = [];
let listenersRegistered = false;

export async function requestNotificationPermission(): Promise<boolean> {
  const status: PermissionStatus = await LocalNotifications.requestPermissions();
  return status.display === 'granted';
}

export async function getPermissionStatus(): Promise<string> {
  const status = await LocalNotifications.checkPermissions();
  return status.display;
}

/**
 * Register foreground notification listeners so notifications display even when app is open
 */
async function registerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  // Ensure notification channel exists (Android 8+)
  try {
    await LocalNotifications.createChannel({
      id: 'medication-reminders',
      name: 'Medication Reminders',
      description: 'Reminders for medication doses and health tracking',
      importance: 5, // IMPORTANCE_HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      sound: 'default',
    });
  } catch {
    // ignore — channel may already exist or not supported
  }

  await LocalNotifications.addListener('localNotificationReceived', (_notification) => {
    // foreground notification received
  });

  await LocalNotifications.addListener('localNotificationActionPerformed', (_action) => {
    // notification action performed
  });
}

function parseMinutes(reminderBefore: string): number {
  switch (reminderBefore) {
    case '0': return 0;
    case '5': return 5;
    case '10': return 10;
    case '15': return 15;
    case '30': return 30;
    case '60': return 60;
    case '120': return 120;
    default: return 5;
  }
}

// Appointment reminder offset (minutes before the appointment) from the
// value stored on the appointment. Used in addition to the always-on
// day-before reminder.
function parseApptReminderMinutes(reminderBefore: string): number {
  switch (reminderBefore) {
    case 'At time': return 0;
    case '15 minutes': return 15;
    case '30 minutes': return 30;
    case '60 minutes': return 60;
    case '120 minutes': return 120;
    case '1 day': return 1440;
    default: return 120;
  }
}

function getApptOffsetLabel(minutes: number, isArabic: boolean): string {
  if (minutes <= 0) return isArabic ? 'الآن' : 'now';
  if (minutes < 60) return isArabic ? `خلال ${minutes} دقيقة` : `in ${minutes} minutes`;
  if (minutes === 60) return isArabic ? 'خلال ساعة' : 'in 1 hour';
  if (minutes === 120) return isArabic ? 'خلال ساعتين' : 'in 2 hours';
  const hours = Math.round(minutes / 60);
  return isArabic ? `خلال ${hours} ساعات` : `in ${hours} hours`;
}

// Non-daily medications (weekly / biweekly / monthly / specific days) get a
// clearly distinct reminder so the user knows today is a scheduled periodic
// dose — separate from the regular daily dose reminders.
function getScheduledDoseFreqLabel(frequency: string, isArabic: boolean): string {
  switch (frequency) {
    case 'Every week':
    case 'weekly':
      return isArabic ? 'الجرعة الأسبوعية' : 'weekly dose';
    case 'Every 2 weeks':
    case 'every_two_weeks':
      return isArabic ? 'جرعة كل أسبوعين' : 'biweekly dose';
    case 'Every month':
    case 'monthly':
      return isArabic ? 'الجرعة الشهرية' : 'monthly dose';
    case 'Specific days':
      return isArabic ? 'جرعة اليوم المحدد' : 'scheduled-day dose';
    default:
      return isArabic ? 'الجرعة المجدولة' : 'scheduled dose';
  }
}

function getScheduledDoseText(med: Medication, isArabic: boolean): { title: string; body: string } {
  const freqLabel = getScheduledDoseFreqLabel(med.frequency, isArabic);
  return {
    title: isArabic ? '📌 موعد جرعة مجدولة اليوم' : '📌 Scheduled Dose Today',
    body: isArabic
      ? `اليوم موعد ${freqLabel}: ${med.name} - ${med.dosage} ${med.form}`
      : `Today is your ${freqLabel}: ${med.name} - ${med.dosage} ${med.form}`,
  };
}

const DAILY_FREQS = new Set([
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every X hours',
  'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_x_hours', 'daily',
]);

function getDosePeriod(timeStr: string): 'fajr' | 'morning' | 'evening' {
  const [hour] = timeStr.split(':').map(Number);
  if (hour >= 4 && hour < 6) return 'fajr';
  if (hour >= 6 && hour < 12) return 'morning';
  return 'evening';
}

function getGroupedDoseText(period: 'fajr' | 'morning' | 'evening', isArabic: boolean) {
  if (isArabic) {
    if (period === 'fajr') return { title: 'حان الآن موعد جرعة الفجر', body: 'تذكير: حان وقت أخذ جرعة الفجر' };
    if (period === 'morning') return { title: 'حان الآن موعد جرعة الصباح', body: 'تذكير: حان وقت أخذ جرعة الصباح' };
    return { title: 'حان الآن موعد جرعة المساء', body: 'تذكير: حان وقت أخذ جرعة المساء' };
  }

  if (period === 'fajr') return { title: 'Fajr Dose Time', body: 'Reminder: It is time to take your Fajr dose' };
  if (period === 'morning') return { title: 'Morning Dose Time', body: 'Reminder: It is time to take your morning dose' };
  return { title: 'Evening Dose Time', body: 'Reminder: It is time to take your evening dose' };
}

function isTemporaryMedicationExpired(med: Medication, date: Date): boolean {
  if (med.isChronic || !med.durationDays || !med.createdAt) return false;
  const created = new Date(med.createdAt);
  created.setHours(0, 0, 0, 0);
  const end = new Date(created);
  end.setDate(end.getDate() + med.durationDays);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target > end;
}

function isMedicationScheduledOnDate(med: Medication, date: Date): boolean {
  if (isTemporaryMedicationExpired(med, date)) return false;
  if (DAILY_FREQS.has(med.frequency)) return true;
  if (!med.startDate) return false;

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const start = new Date(med.startDate);
  start.setHours(0, 0, 0, 0);
  if (target < start) return false;

  const diffDays = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  switch (med.frequency) {
    case 'Every week':
    case 'weekly':
      return diffDays % 7 === 0;
    case 'Every 2 weeks':
    case 'every_two_weeks':
      return diffDays % 14 === 0;
    case 'Every month':
    case 'monthly':
      return target.getDate() === start.getDate();
    default:
      return true;
  }
}

function getNextMedicationDate(med: Medication, from: Date): Date | null {
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 370; i++) {
    if (isMedicationScheduledOnDate(med, cursor)) return new Date(cursor);
    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

function compareTime(a: string, b: string): number {
  const [aH = 0, aM = 0] = a.split(':').map(Number);
  const [bH = 0, bM = 0] = b.split(':').map(Number);
  return (aH * 60 + aM) - (bH * 60 + bM);
}

/**
 * Generate a stable numeric ID from medication ID + time string
 */
function stableId(medId: string, timeStr: string): number {
  let hash = 0;
  const str = medId + timeStr;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100000 + 1; // Keep in a safe range, avoid 0
}

export async function scheduleMedicationNotifications() {
  // Cancel ALL previously scheduled notifications (including stale ones from previous app versions)
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
    }
  } catch {
    // ignore cancel errors
  }
  scheduledIds = [];

  const status = await LocalNotifications.checkPermissions();
  if (status.display !== 'granted') return;

  const settings = store.getSettings();
  if (!settings.notifications) return;

  const medications = store.getMedications();
  const reminderMinutes = parseMinutes(settings.reminderBefore);
  const now = new Date();
  const isArabic = settings.language === 'ar';

  // Build a set of "med|time" doses already taken today — we should NOT
  // re-schedule a reminder for these today (avoids notification still
  // firing after the user marked the dose as taken).
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const takenToday = new Set<string>();
  try {
    const records = store.getDoseRecords() || [];
    records.forEach((r) => {
      if (r.date === todayStr && r.status === 'taken') {
        takenToday.add(`${r.medicationId}|${r.scheduledTime}`);
      }
    });
  } catch {
    // ignore — if dose records unavailable, fall back to cron schedule
  }

  const notifications: Array<{
    id: number;
    title: string;
    body: string;
    schedule: Schedule;
    sound: string;
    smallIcon: string;
  }> = [];

  const dailyMeds = medications.filter(m => DAILY_FREQS.has(m.frequency));
  const nonDailyMeds = medications.filter(m => !DAILY_FREQS.has(m.frequency));

  // Group daily meds into only three dose reminders: Fajr, morning, evening
  const groups = new Map<'fajr' | 'morning' | 'evening', Array<{ med: Medication; timeStr: string }>>();
  dailyMeds.forEach(med => {
    med.times.forEach(timeStr => {
      const period = getDosePeriod(timeStr);
      if (!groups.has(period)) groups.set(period, []);
      groups.get(period)!.push({ med, timeStr });
    });
  });


  const scheduleEntry = (
    id: number,
    timeStr: string,
    title: string,
    body: string,
    allTaken: boolean,
  ) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;
    const totalMinutes = hours * 60 + minutes - reminderMinutes;
    const notifyHour = ((Math.floor(totalMinutes / 60) % 24) + 24) % 24;
    const notifyMinute = ((totalMinutes % 60) + 60) % 60;
    scheduledIds.push(id);

    let schedule: Schedule;
    if (allTaken) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(notifyHour, notifyMinute, 0, 0);
      schedule = { at: tomorrow, repeats: true, every: 'day', allowWhileIdle: true };
    } else {
      schedule = { on: { hour: notifyHour, minute: notifyMinute }, allowWhileIdle: true };
    }
    notifications.push({
      id, title, body, schedule,
      sound: 'default',
      smallIcon: 'ic_stat_dawaa',
    });
  };

  // Daily grouped notifications (maximum three medication reminders total)
  groups.forEach((items, period) => {
    const timeStr = items.map(item => item.timeStr).sort(compareTime)[0];
    const allTaken = items.every(item => takenToday.has(`${item.med.id}|${item.timeStr}`));
    const { title, body } = getGroupedDoseText(period, isArabic);
    const id = stableId('daily-group', period);
    scheduleEntry(id, timeStr, title, body, allTaken);
  });

  // Non-daily meds (weekly / biweekly / monthly) — per-med notification only on their correct date
  nonDailyMeds.forEach(med => {
    const nextDate = getNextMedicationDate(med, now);
    if (!nextDate) return;

    med.times.forEach(timeStr => {
      const isToday = nextDate.toDateString() === now.toDateString();
      const allTaken = isToday && takenToday.has(`${med.id}|${timeStr}`);
      const { title, body } = getScheduledDoseText(med, isArabic);
      const id = stableId(med.id, timeStr);
      if (isToday) {
        scheduleEntry(id, timeStr, title, body, allTaken);
      } else {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;
        const at = new Date(nextDate);
        const totalMinutes = hours * 60 + minutes - reminderMinutes;
        at.setHours(Math.floor(totalMinutes / 60), ((totalMinutes % 60) + 60) % 60, 0, 0);
        if (at.getTime() <= now.getTime()) return;
        scheduledIds.push(id);
        notifications.push({
          id,
          title,
          body,
          schedule: { at, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_stat_dawaa',
        });
      }
    });
  });

  // === Blood Pressure Reminders — opt-in. User-editable list (defaults seeded: 10 AM + 9 PM) ===
  if (settings.bpReminders) {
    const bpTimes = (settings.bpCustomTimes && settings.bpCustomTimes.length > 0)
      ? settings.bpCustomTimes
      : ['10:00', '21:00'];

    bpTimes.forEach((t) => {
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return;
      const id = stableId('bp-time', t);
      scheduledIds.push(id);
      const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      notifications.push({
        id,
        title: isArabic ? '🩺 تذكير قياس الضغط' : '🩺 Blood Pressure Reminder',
        body: isArabic
          ? `حان وقت قياس ضغط الدم (${timeLabel})`
          : `Time to measure your blood pressure (${timeLabel})`,
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_dawaa',
      });
    });
  }

  // === Blood Sugar Reminders — opt-in. User-editable list (defaults seeded: 8 AM + 9 PM) ===
  if (settings.bloodSugarReminders) {
    const bsTimes = (settings.bloodSugarCustomTimes && settings.bloodSugarCustomTimes.length > 0)
      ? settings.bloodSugarCustomTimes
      : ['08:00', '21:00'];

    bsTimes.forEach((t) => {
      const [h, m] = t.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return;
      const id = stableId('bs-time', t);
      scheduledIds.push(id);
      const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      notifications.push({
        id,
        title: isArabic ? '🩸 تذكير قياس السكر' : '🩸 Blood Sugar Reminder',
        body: isArabic
          ? `حان وقت قياس مستوى السكر (${timeLabel})`
          : `Time to measure your blood sugar (${timeLabel})`,
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_dawaa',
      });
    });
  }

  // === Low Stock Alert (≤20% of 2-month supply) — daily at 9 AM ===
  const lowStockMeds = medications.filter(med => {
    const timesPerDay = med.times.length || 1;
    let twoMonthSupply: number;
    switch (med.frequency) {
      case 'weekly': twoMonthSupply = timesPerDay * 8; break;
      case 'every_two_weeks': twoMonthSupply = timesPerDay * 4; break;
      case 'monthly': twoMonthSupply = timesPerDay * 2; break;
      default: twoMonthSupply = timesPerDay * 60; break;
    }
    return med.stock > 0 && (med.stock / twoMonthSupply) <= 0.2;
  });

  if (lowStockMeds.length > 0) {
    const stockId = 9999;
    scheduledIds.push(stockId);
    const names = lowStockMeds.map(m => m.name).join(isArabic ? '، ' : ', ');

    notifications.push({
      id: stockId,
      title: isArabic ? '⚠️ تنبيه المخزون' : '⚠️ Stock Alert',
      body: isArabic
        ? `مخزون منخفض (أقل من 20%): ${names}`
        : `Low stock (below 20%): ${names}`,
      schedule: { on: { hour: 9, minute: 0 }, allowWhileIdle: true },
      sound: 'default',
      smallIcon: 'ic_stat_dawaa',
    });
  }

  // === Expiry Date Alert (≤30 days remaining) — daily at 9:05 AM ===
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  const expiringMeds = medications.filter(med => {
    if (!med.expiryDate) return false;
    const exp = new Date(med.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const days = Math.floor((exp.getTime() - today0.getTime()) / 86400000);
    return days >= 0 && days <= 30;
  });
  const expiredMeds = medications.filter(med => {
    if (!med.expiryDate) return false;
    const exp = new Date(med.expiryDate);
    exp.setHours(0, 0, 0, 0);
    return exp.getTime() < today0.getTime();
  });

  if (expiringMeds.length > 0 || expiredMeds.length > 0) {
    const expId = 9998;
    scheduledIds.push(expId);
    const all = [...expiredMeds, ...expiringMeds].map(m => m.name).join(isArabic ? '، ' : ', ');
    notifications.push({
      id: expId,
      title: isArabic ? '⏳ تنبيه انتهاء صلاحية' : '⏳ Expiry Alert',
      body: isArabic
        ? `أدوية قاربت على الانتهاء أو منتهية: ${all}`
        : `Medications expiring soon or expired: ${all}`,
      schedule: { on: { hour: 9, minute: 5 }, allowWhileIdle: true },
      sound: 'default',
      smallIcon: 'ic_stat_dawaa',
    });
  }

  // === Appointment Reminders (1 day before + 2 hours before) ===
  const appointments: Appointment[] = store.getAppointments() || [];
  const upcomingAppts = appointments.filter(a => !a.completed);

  upcomingAppts.forEach((appt) => {
    const [aH, aM] = appt.time.split(':').map(Number);
    if (isNaN(aH) || isNaN(aM)) return;

    const apptDate = new Date(appt.date);
    apptDate.setHours(aH, aM, 0, 0);

    // 1 day before
    const dayBefore = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
    if (dayBefore.getTime() > now.getTime()) {
      const dayId = stableId(appt.id, 'day-before');
      scheduledIds.push(dayId);
      const doctorInfo = appt.doctorName ? (isArabic ? ` - د. ${appt.doctorName}` : ` - Dr. ${appt.doctorName}`) : '';
      notifications.push({
        id: dayId,
        title: isArabic ? '📅 تذكير بموعد طبي غداً' : '📅 Appointment Tomorrow',
        body: isArabic
          ? `لديك موعد ${appt.specialty}${doctorInfo} غداً الساعة ${formatTime12(appt.time, isArabic)}`
          : `You have a ${appt.specialty}${doctorInfo} appointment tomorrow at ${formatTime12(appt.time, isArabic)}`,
        schedule: { at: dayBefore, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_dawaa',
      });
    }

    // User-chosen reminder (e.g. at time / 15 / 30 / 60 / 120 minutes before).
    // Skipped when the choice is "1 day" since the day-before reminder above
    // already covers it.
    const chosenMinutes = parseApptReminderMinutes(appt.reminderBefore || '120 minutes');
    if (chosenMinutes !== 1440) {
      const chosenBefore = new Date(apptDate.getTime() - chosenMinutes * 60 * 1000);
      if (chosenBefore.getTime() > now.getTime()) {
        const chosenId = stableId(appt.id, 'chosen-before');
        scheduledIds.push(chosenId);
        const doctorInfo = appt.doctorName ? (isArabic ? ` - د. ${appt.doctorName}` : ` - Dr. ${appt.doctorName}`) : '';
        const offsetLabel = getApptOffsetLabel(chosenMinutes, isArabic);
        notifications.push({
          id: chosenId,
          title: isArabic ? `📅 موعدك ${offsetLabel}` : `📅 Appointment ${offsetLabel}`,
          body: isArabic
            ? `موعد ${appt.specialty}${doctorInfo} الساعة ${formatTime12(appt.time, isArabic)}`
            : `${appt.specialty}${doctorInfo} appointment at ${formatTime12(appt.time, isArabic)}`,
          schedule: { at: chosenBefore, allowWhileIdle: true },
          sound: 'default',
          smallIcon: 'ic_stat_dawaa',
        });
      }
    }
  });

  // Daily summary notification removed per user request

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }

  return scheduledIds.length;
}

export async function startNotificationLoop() {
  await registerListeners();
  await scheduleMedicationNotifications();
}

/**
 * Cancel today's notification for a specific medication+time.
 * The daily repeating notification will be re-scheduled for tomorrow automatically
 * via the next call to scheduleMedicationNotifications (e.g. on app reload).
 */
export async function cancelDoseNotification(medicationId: string, timeStr: string) {
  try {
    await scheduleMedicationNotifications();
  } catch {
    // ignore
  }
}

/**
 * Cancel ALL notifications for a medication (across all its time slots).
 * Call this when a medication is deleted so stale OS-scheduled reminders disappear.
 */
export async function cancelMedicationNotifications(medicationId: string, times: string[]) {
  try {
    const ids = times.map(t => ({ id: stableId(medicationId, t) }));
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids });
    }
    const idSet = new Set(ids.map(i => i.id));
    scheduledIds = scheduledIds.filter(x => !idSet.has(x));
  } catch {
    // ignore
  }
}

/**
 * Re-schedule a single dose notification (used when undoing a taken dose).
 */
export async function rescheduleAllNotifications() {
  await scheduleMedicationNotifications();
}
