/**
 * PERSONAL BUILD ONLY (branch: personal-healthkit) — do not merge into main.
 *
 * Live, read-only views of steps, workouts and ECG recordings from Apple Health.
 * Nothing is copied into Dawaa+ storage: Apple Health stays the source of truth.
 */
import { registerPlugin } from "@capacitor/core";
import { Health, type Workout } from "@capgo/capacitor-health";

// ── ECG (local native plugin in ios/App/App/AppDelegate.swift) ─────
export type EcgClassification =
  | "sinusRhythm"
  | "atrialFibrillation"
  | "inconclusiveLowHeartRate"
  | "inconclusiveHighHeartRate"
  | "inconclusivePoorReading"
  | "inconclusiveOther"
  | "unrecognized"
  | "notSet"
  | "unknown";

export interface EcgSummary {
  id: string;
  startDate: string;
  classification: EcgClassification;
  averageHeartRate?: number;
  symptoms: boolean;
  sourceName?: string;
}

interface EcgPlugin {
  requestAuthorization(): Promise<{ granted: boolean }>;
  list(options: { limit?: number }): Promise<{ items: EcgSummary[] }>;
  waveform(options: { id: string; step?: number }): Promise<{ values: number[]; samplingFrequency: number }>;
}

export const Ecg = registerPlugin<EcgPlugin>("Ecg");

// ── Steps ──────────────────────────────────────────────────────────
export interface DaySteps {
  date: Date;
  steps: number;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/** Daily step totals for the last `days` days (oldest first, today last). */
export async function loadDailySteps(days = 7): Promise<DaySteps[]> {
  const today = startOfDay(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const { samples } = await Health.queryAggregated({
    dataType: "steps",
    startDate: start.toISOString(),
    endDate: new Date().toISOString(),
    bucket: "day",
    aggregation: "sum",
  });
  const byDay = new Map<string, number>();
  for (const s of samples) byDay.set(startOfDay(new Date(s.startDate)).toDateString(), Math.round(s.value || 0));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, steps: byDay.get(date.toDateString()) ?? 0 };
  });
}

// ── Workouts ───────────────────────────────────────────────────────
export async function loadWorkouts(days = 30): Promise<Workout[]> {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { workouts } = await Health.queryWorkouts({
    startDate: start.toISOString(),
    endDate: new Date().toISOString(),
    limit: 100,
    ascending: false,
  });
  return workouts ?? [];
}

export async function requestActivityAuthorization() {
  await Health.requestAuthorization({ read: ["steps", "workouts"] });
}

const WORKOUT_NAMES: Record<string, [string, string]> = {
  walking: ["مشي", "Walking"],
  running: ["جري", "Running"],
  runningTreadmill: ["جري على السير", "Treadmill"],
  cycling: ["دراجة", "Cycling"],
  bikingStationary: ["دراجة ثابتة", "Stationary Bike"],
  swimming: ["سباحة", "Swimming"],
  swimmingPool: ["سباحة", "Pool Swim"],
  hiking: ["مشي جبلي", "Hiking"],
  yoga: ["يوغا", "Yoga"],
  pilates: ["بيلاتس", "Pilates"],
  elliptical: ["جهاز الإليبتكال", "Elliptical"],
  stairClimbing: ["صعود الدرج", "Stair Climbing"],
  functionalStrengthTraining: ["تمارين قوة", "Strength Training"],
  traditionalStrengthTraining: ["تمارين قوة", "Strength Training"],
  strengthTraining: ["تمارين قوة", "Strength Training"],
  highIntensityIntervalTraining: ["تمارين متقطعة عالية الشدة", "HIIT"],
  mixedCardio: ["تمارين قلب", "Cardio"],
  coreTraining: ["تمارين البطن", "Core Training"],
  flexibility: ["تمارين مرونة", "Flexibility"],
  cooldown: ["تهدئة", "Cooldown"],
  mindAndBody: ["تأمل وحركة", "Mind & Body"],
  football: ["كرة قدم", "Football"],
  soccer: ["كرة قدم", "Football"],
  tennis: ["تنس", "Tennis"],
  padel: ["بادل", "Padel"],
  other: ["تمرين", "Workout"],
};

export const workoutName = (type: string, isArabic: boolean) => {
  const n = WORKOUT_NAMES[type];
  if (n) return isArabic ? n[0] : n[1];
  return isArabic ? "تمرين" : type.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
};
