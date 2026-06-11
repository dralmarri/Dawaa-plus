import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';
import { store } from './store';
import type { Medication, Appointment } from '@/types';

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

  // Show a toast when a notification fires while the app is in the foreground
  await LocalNotifications.addListener('localNotificationReceived', (notification) => {
    console.log('[Notifications] Received in foreground:', notification.title);
    try {
      const s = store.getSettings();
      if (s.notifications && s.voiceNotifications) {
        const isArabic = s.language === 'ar';
        const text = `${notification.title ?? ''}. ${notification.body ?? ''}`.trim();
        if (text) speak(text, { lang: isArabic ? 'ar' : 'en' });
      }
    } catch (e) {
      console.warn('[Notifications] voice alert failed:', e);
    }
  });

  await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    console.log('[Notifications] Action performed:', action.notification.title);
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

function getNotificationBody(meds: Medication[], isArabic: boolean): { title: string; body: string } {
  if (meds.length === 1) {
    const med = meds[0];
    return {
      title: isArabic ? '⏰ موعد الدواء' : '⏰ Medication Reminder',
      body: isArabic
        ? `الآن موعد جرعة ${med.name} - ${med.dosage} ${med.form}`
        : `Time to take ${med.name} - ${med.dosage} ${med.form}`,
    };
  }
  const names = meds.map(m => m.name);
  return {
    title: isArabic ? '⏰ موعد الأدوية' : '⏰ Medications Reminder',
    body: isArabic
      ? `موعد الأدوية: ${names.join('، ')}`
      : `Time to take: ${names.join(', ')}`,
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
  } catch (e) {
    console.warn('[Notifications] Failed to cancel pending notifications', e);
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
    const records = store.getDoseRecords?.() || [];
    records.forEach((r: any) => {
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
    schedule: any;
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

    let schedule: any;
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
      smallIcon: 'ic_stat_icon_config_sample',
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
      const { title, body } = getNotificationBody([med], isArabic);
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
          smallIcon: 'ic_stat_icon_config_sample',
        });
      }
    });
  });

  // === Blood Pressure Reminders (10 AM and 9 PM daily) ===
  const bpTimes = [{ hour: 10, min: 0, id: 9990 }, { hour: 21, min: 0, id: 9991 }];
  bpTimes.forEach(({ hour, min, id }) => {
    scheduledIds.push(id);
    notifications.push({
      id,
      title: isArabic ? '🩺 تذكير قياس الضغط' : '🩺 Blood Pressure Reminder',
      body: isArabic
        ? `حان وقت قياس ضغط الدم (${hour === 10 ? 'الصباح' : 'المساء'})`
        : `Time to measure your blood pressure (${hour === 10 ? 'Morning' : 'Evening'})`,
      schedule: { on: { hour, minute: min }, allowWhileIdle: true },
      sound: 'default',
      smallIcon: 'ic_stat_icon_config_sample',
    });
  });

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
      smallIcon: 'ic_stat_icon_config_sample',
    });
  }

  // === Appointment Reminders (1 day before + 2 hours before) ===
  const appointments: Appointment[] = store.getAppointments?.() || [];
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
          ? `لديك موعد ${appt.specialty}${doctorInfo} غداً الساعة ${appt.time}`
          : `You have a ${appt.specialty}${doctorInfo} appointment tomorrow at ${appt.time}`,
        schedule: { at: dayBefore, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
      });
    }

    // 2 hours before
    const twoHoursBefore = new Date(apptDate.getTime() - 2 * 60 * 60 * 1000);
    if (twoHoursBefore.getTime() > now.getTime()) {
      const hourId = stableId(appt.id, '2h-before');
      scheduledIds.push(hourId);
      const doctorInfo = appt.doctorName ? (isArabic ? ` - د. ${appt.doctorName}` : ` - Dr. ${appt.doctorName}`) : '';
      notifications.push({
        id: hourId,
        title: isArabic ? '📅 موعدك بعد ساعتين' : '📅 Appointment in 2 Hours',
        body: isArabic
          ? `موعد ${appt.specialty}${doctorInfo} الساعة ${appt.time}`
          : `${appt.specialty}${doctorInfo} appointment at ${appt.time}`,
        schedule: { at: twoHoursBefore, allowWhileIdle: true },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
      });
    }
  });

  // Daily summary notification removed per user request

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
    console.log(`[Notifications] Scheduled ${notifications.length} notifications`);
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
    console.log(`[Notifications] Canceled dose reminder for ${medicationId} @ ${timeStr}`);
  } catch (e) {
    console.warn('[Notifications] Failed to cancel dose notification', e);
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
    console.log(`[Notifications] Canceled all reminders for medication ${medicationId}`);
  } catch (e) {
    console.warn('[Notifications] Failed to cancel medication notifications', e);
  }
}

/**
 * Re-schedule a single dose notification (used when undoing a taken dose).
 */
export async function rescheduleAllNotifications() {
  await scheduleMedicationNotifications();
}
