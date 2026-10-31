/**
 * PERSONAL BUILD ONLY (branch: personal-healthkit) — do not merge into main.
 *
 * Imports blood pressure, pulse and blood sugar readings from Apple Health
 * into Dawaa+. Read-only: nothing is ever written back to Apple Health.
 */
import { Capacitor } from "@capacitor/core";
import { Health, type HealthSample } from "@capgo/capacitor-health";
import { format } from "date-fns";
import { store } from "@/lib/store";
import type { BloodPressureReading, BloodSugarReading } from "@/types";

const DAYS_BACK = 30;
const PULSE_MATCH_WINDOW_MS = 10 * 60 * 1000; // pair a pulse reading taken within 10 min

export interface HealthImportResult {
  ok: boolean;
  bp: number;
  sugar: number;
  error?: string;
}

export const isHealthImportSupported = () => Capacitor.getPlatform() === "ios";

const periodFor = (d: Date): "Morning" | "Evening" => (d.getHours() < 12 ? "Morning" : "Evening");

export async function importFromAppleHealth(): Promise<HealthImportResult> {
  if (!isHealthImportSupported()) return { ok: false, bp: 0, sugar: 0, error: "unsupported" };

  try {
    const { available } = await Health.isAvailable();
    if (!available) return { ok: false, bp: 0, sugar: 0, error: "unavailable" };

    await Health.requestAuthorization({ read: ["bloodPressure", "heartRate", "bloodGlucose"] });

    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
    const query = { startDate, endDate, limit: 1000, ascending: true };

    // iOS doesn't tell apps whether read access was denied; a denied type simply
    // returns no samples, so each read is allowed to fail independently.
    const read = async (dataType: "bloodPressure" | "heartRate" | "bloodGlucose"): Promise<HealthSample[]> => {
      try {
        return (await Health.readSamples({ ...query, dataType })).samples ?? [];
      } catch {
        return [];
      }
    };
    const [bpSamples, sugarSamples] = await Promise.all([read("bloodPressure"), read("bloodGlucose")]);

    // Watches record heart rate every few minutes (thousands per month), so
    // fetch only the pulse readings around each blood pressure reading.
    const pulseNear = async (when: Date): Promise<number | null> => {
      try {
        const { samples } = await Health.readSamples({
          dataType: "heartRate",
          startDate: new Date(when.getTime() - PULSE_MATCH_WINDOW_MS).toISOString(),
          endDate: new Date(when.getTime() + PULSE_MATCH_WINDOW_MS).toISOString(),
          limit: 100,
        });
        let best: { diff: number; v: number } | null = null;
        for (const s of samples ?? []) {
          const diff = Math.abs(new Date(s.startDate).getTime() - when.getTime());
          if (!best || diff < best.diff) best = { diff, v: s.value };
        }
        return best ? Math.round(best.v) : null;
      } catch {
        return null;
      }
    };

    // ── Blood pressure (+ nearest pulse) ──────────────────────────
    const existingBp = store.getReadings();
    const bpIds = new Set(existingBp.map((r) => r.id));
    const bpKeys = new Set(existingBp.map((r) => `${r.date}|${r.time}|${r.systolic}|${r.diastolic}`));

    let bpCount = 0;
    for (const s of bpSamples) {
      if (s.systolic == null || s.diastolic == null) continue;
      const when = new Date(s.startDate);
      const id = s.platformId || `health-bp-${s.startDate}`;
      const reading: BloodPressureReading = {
        id,
        systolic: Math.round(s.systolic),
        diastolic: Math.round(s.diastolic),
        heartRate: 0,
        period: periodFor(when),
        date: format(when, "yyyy-MM-dd"),
        time: format(when, "HH:mm"),
        notes: "مستورد من تطبيق صحة",
      };
      const key = `${reading.date}|${reading.time}|${reading.systolic}|${reading.diastolic}`;
      if (bpIds.has(id) || bpKeys.has(key)) continue;

      const pulse = await pulseNear(when);
      if (pulse) reading.heartRate = pulse;

      await store.saveReading(reading);
      bpIds.add(id);
      bpKeys.add(key);
      bpCount++;
    }

    // ── Blood sugar (mg/dL) ───────────────────────────────────────
    const existingSugar = store.getBloodSugarReadings();
    const sugarIds = new Set(existingSugar.map((r) => r.id));
    const sugarKeys = new Set(existingSugar.map((r) => `${r.date}|${r.time}|${r.value}`));

    let sugarCount = 0;
    for (const s of sugarSamples) {
      const when = new Date(s.startDate);
      const id = s.platformId || `health-bs-${s.startDate}`;
      const reading: BloodSugarReading = {
        id,
        value: Math.round(s.value),
        // Apple Health doesn't expose meal timing here, so default to "Random"
        period: "Random",
        date: format(when, "yyyy-MM-dd"),
        time: format(when, "HH:mm"),
        notes: "مستورد من تطبيق صحة",
      };
      const key = `${reading.date}|${reading.time}|${reading.value}`;
      if (sugarIds.has(id) || sugarKeys.has(key)) continue;
      await store.saveBloodSugarReading(reading);
      sugarIds.add(id);
      sugarKeys.add(key);
      sugarCount++;
    }

    return { ok: true, bp: bpCount, sugar: sugarCount };
  } catch (e) {
    return { ok: false, bp: 0, sugar: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
