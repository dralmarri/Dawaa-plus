import { store } from './store';
import { format, differenceInDays, differenceInMonths, parseISO, addDays } from 'date-fns';
import { cancelDoseNotification, rescheduleAllNotifications } from './notifications';
import type { DoseRecord } from '@/types';

/**
 * Check if a medication is scheduled for today based on its frequency and startDate.
 */
function isMedScheduledToday(frequency: string, startDate?: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every X hours'].includes(frequency)) {
    return true;
  }

  if (!startDate) return true;

  const start = parseISO(startDate);
  start.setHours(0, 0, 0, 0);

  if (today < start) return false;

  const daysDiff = differenceInDays(today, start);

  switch (frequency) {
    case 'Every week':
      return daysDiff % 7 === 0;
    case 'Every 2 weeks':
      return daysDiff % 14 === 0;
    case 'Every month':
      return today.getDate() === start.getDate() && differenceInMonths(today, start) >= 0;
    default:
      return true;
  }
}

/**
 * Deduplicate dose records: keep only ONE record per medicationId+scheduledTime+date.
 * Prefer taken > missed > pending. If same status, keep the one with an earlier id (first created).
 */
function deduplicateRecords(records: DoseRecord[]): DoseRecord[] {
  const statusPriority: Record<string, number> = { taken: 0, missed: 1, pending: 2 };
  const map = new Map<string, DoseRecord>();

  for (const r of records) {
    const key = `${r.medicationId}|${r.scheduledTime}|${r.date}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, r);
    } else {
      // Keep the one with higher priority status
      const existingPriority = statusPriority[existing.status] ?? 3;
      const newPriority = statusPriority[r.status] ?? 3;
      if (newPriority < existingPriority) {
        map.set(key, r);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Generate today's dose records from medications.
 * Only creates records that don't already exist for today.
 */
export function generateTodayDoses(): DoseRecord[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const medications = store.getMedications();
  const allExisting = store.getDoseRecords();

  // First, deduplicate any existing records for today
  const todayRecords = allExisting.filter(r => r.date === today);
  const deduped = deduplicateRecords(todayRecords);

  // If duplicates were found, clean them up in store
  if (deduped.length < todayRecords.length) {
    const keepIds = new Set(deduped.map(r => r.id));
    const cleanedRecords = allExisting.filter(r => r.date !== today || keepIds.has(r.id));
    store._setDoseRecords(cleanedRecords);
  }

  // Track what already exists using a Set for O(1) lookup
  const existingKeys = new Set(
    deduped.map(r => `${r.medicationId}|${r.scheduledTime}`)
  );

  medications.forEach(med => {
    if (!isMedScheduledToday(med.frequency, med.startDate)) return;

    // Skip expired temporary medications
    if (!med.isChronic && med.durationDays && med.createdAt) {
      const createdDate = parseISO(med.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      const endDate = addDays(createdDate, med.durationDays);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      if (todayDate > endDate) return;
    }

    med.times.forEach(time => {
      const key = `${med.id}|${time}`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key); // Prevent duplicates within same call
        const record: DoseRecord = {
          id: crypto.randomUUID(),
          medicationId: med.id,
          medicationName: med.name,
          scheduledTime: time,
          status: 'pending',
          date: today,
        };
        store.saveDoseRecord(record);
      }
    });
  });

  // Auto-mark past pending doses as missed
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();
  const allRecords = store.getDoseRecords();

  allRecords.forEach(record => {
    if (record.date === today && record.status === 'pending') {
      const parts = record.scheduledTime.split(':').map(Number);
      const schedH = parts[0] || 0;
      const schedM = parts[1] || 0;

      // Only mark as missed if current time is past scheduledTime + 30 min grace
      const graceTotal = schedM + 30;
      const missedH = schedH + Math.floor(graceTotal / 60);
      const missedM = graceTotal % 60;

      const isPast = nowH > missedH || (nowH === missedH && nowM >= missedM);
      if (isPast) {
        record.status = 'missed';
        store.saveDoseRecord(record);
      }
    }

    if (record.date < today && record.status === 'pending') {
      record.status = 'missed';
      store.saveDoseRecord(record);
    }
  });

  // Return deduplicated today's records for active medications only
  const medIds = new Set(medications.map(m => m.id));
  const finalRecords = store.getDoseRecords().filter(r => r.date === today && medIds.has(r.medicationId));
  return deduplicateRecords(finalRecords);
}

/**
 * Mark a dose as taken
 */
export async function markDoseTaken(recordId: string): Promise<{ lowStockMed?: { name: string; stock: number; percent: number } }> {
  const records = store.getDoseRecords();
  const record = records.find(r => r.id === recordId);
  let lowStockMed: { name: string; stock: number; percent: number } | undefined;
  if (record) {
    const wasNotTaken = record.status !== 'taken';
    record.status = 'taken';
    record.takenAt = format(new Date(), 'HH:mm');
    await store.saveDoseRecord(record);

    // Cancel today's pending reminder so notification doesn't fire after user took the dose
    cancelDoseNotification(record.medicationId, record.scheduledTime).catch(() => {});

    // Decrease stock only on a fresh "taken" transition
    if (wasNotTaken) {
      const med = store.getMedications().find(m => m.id === record.medicationId);
      if (med && med.stock > 0) {
        med.stock -= 1;
        await store.saveMedication(med);

        const initial = med.initialStock || med.stock + 1;
        const percent = Math.round((med.stock / initial) * 100);
        if (percent <= 20) {
          lowStockMed = { name: med.name, stock: med.stock, percent };
        }
      }
    }
  }
  return { lowStockMed };
}

/**
 * Mark a dose as missed
 */
export async function markDoseMissed(recordId: string) {
  const records = store.getDoseRecords();
  const record = records.find(r => r.id === recordId);
  if (record) {
    const wasTaken = record.status === 'taken';
    record.status = 'missed';
    record.takenAt = undefined;
    await store.saveDoseRecord(record);
    if (wasTaken) {
      const med = store.getMedications().find(m => m.id === record.medicationId);
      if (med) {
        med.stock += 1;
        await store.saveMedication(med);
      }
    }
  }
}

/**
 * Undo a dose — revert to pending. Refund stock if it was previously taken.
 */
export async function undoDose(recordId: string): Promise<void> {
  const records = store.getDoseRecords();
  const record = records.find(r => r.id === recordId);
  if (!record) return;

  const wasTaken = record.status === 'taken';
  record.status = 'pending';
  record.takenAt = undefined;
  await store.saveDoseRecord(record);

  if (wasTaken) {
    const med = store.getMedications().find(m => m.id === record.medicationId);
    if (med) {
      med.stock += 1;
      await store.saveMedication(med);
    }
  }

  // Re-arm notifications so the daily reminder is scheduled again
  rescheduleAllNotifications().catch(() => {});
}
