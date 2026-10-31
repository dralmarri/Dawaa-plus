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
  await Health.requestAuthorization({
    read: ["steps", "workouts", "sleep", "oxygenSaturation", "weight", "restingHeartRate"],
  });
}

// ── Sleep ──────────────────────────────────────────────────────────
export type StageKey = "deep" | "light" | "rem" | "asleep" | "awake";

export interface NightSleep {
  /** The morning the night ended on (local date). */
  date: Date;
  /** Minutes actually asleep (all asleep stages, overlaps merged). */
  asleepMinutes: number;
  /** Minutes per stage; "asleep" = unspecified stage. */
  stages: Record<StageKey, number>;
  hasStages: boolean;
  bedtime?: Date;
  wake?: Date;
  source?: string;
}

const ASLEEP_STATES = new Set(["asleep", "light", "deep", "rem"]);

/** Merge overlapping [start,end] ms intervals and return total minutes. */
const unionMinutes = (intervals: [number, number][]) => {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const iv of sorted) {
    if (!cur || iv[0] > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [iv[0], iv[1]];
    } else if (iv[1] > cur[1]) {
      cur[1] = iv[1];
    }
  }
  if (cur) total += cur[1] - cur[0];
  return Math.round(total / 60000);
};

/**
 * Sleep for the last `nights` nights (oldest first, last night last).
 * Several apps (watch, iPhone, Google Health) may record the same night, so per
 * night we use the single source that recorded the most sleep.
 */
export async function loadSleep(nights = 7): Promise<NightSleep[]> {
  const today = startOfDay(new Date());
  const from = new Date(today);
  from.setDate(from.getDate() - nights);
  from.setHours(12, 0, 0, 0);
  const { samples } = await Health.readSamples({
    dataType: "sleep",
    startDate: from.toISOString(),
    endDate: new Date().toISOString(),
    limit: 5000,
    ascending: false,
  });

  // Night key: a segment starting before noon belongs to that morning;
  // one starting in the evening belongs to the next morning.
  const nightKey = (start: Date) => startOfDay(new Date(start.getTime() + 12 * 60 * 60 * 1000)).toDateString();

  const byNight = new Map<string, Map<string, typeof samples>>();
  for (const s of samples ?? []) {
    if (!s.sleepState || s.sleepState === "inBed") continue;
    const key = nightKey(new Date(s.startDate));
    const src = s.sourceName || s.sourceId || "?";
    if (!byNight.has(key)) byNight.set(key, new Map());
    const m = byNight.get(key)!;
    if (!m.has(src)) m.set(src, []);
    m.get(src)!.push(s);
  }

  return Array.from({ length: nights }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (nights - 1 - i));
    const empty: NightSleep = {
      date, asleepMinutes: 0, hasStages: false,
      stages: { deep: 0, light: 0, rem: 0, asleep: 0, awake: 0 },
    };
    const sources = byNight.get(date.toDateString());
    if (!sources) return empty;

    let best: NightSleep = empty;
    for (const [src, segs] of sources) {
      const asleepSegs = segs.filter((x) => ASLEEP_STATES.has(x.sleepState!));
      const intervals = asleepSegs.map((x) => [new Date(x.startDate).getTime(), new Date(x.endDate).getTime()] as [number, number]);
      const asleepMinutes = unionMinutes(intervals);
      if (asleepMinutes <= best.asleepMinutes) continue;
      const stages: Record<StageKey, number> = { deep: 0, light: 0, rem: 0, asleep: 0, awake: 0 };
      for (const x of segs) stages[x.sleepState as StageKey] += Math.round(x.value);
      const starts = intervals.map((iv) => iv[0]);
      const ends = intervals.map((iv) => iv[1]);
      best = {
        date,
        asleepMinutes,
        stages,
        hasStages: stages.deep + stages.light + stages.rem > 0,
        bedtime: starts.length ? new Date(Math.min(...starts)) : undefined,
        wake: ends.length ? new Date(Math.max(...ends)) : undefined,
        source: src,
      };
    }
    return best;
  });
}

// ── Vitals (SpO2, resting HR, weight) ──────────────────────────────
export interface VitalPoint {
  date: Date;
  value: number;
}

const readVital = async (
  dataType: "oxygenSaturation" | "restingHeartRate" | "weight",
  days: number,
): Promise<VitalPoint[]> => {
  const { samples } = await Health.readSamples({
    dataType,
    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
    limit: 2000,
    ascending: false, // newest first so the latest is never cut off by the limit
  });
  return (samples ?? [])
    .map((s) => ({
      date: new Date(s.startDate),
      // HealthKit returns SpO2 as a fraction (0.97); show it as a percentage
      value: dataType === "oxygenSaturation" && s.value <= 1 ? s.value * 100 : s.value,
    }))
    .reverse();
};

export async function loadVitals(days = 30) {
  const safe = (p: Promise<VitalPoint[]>) => p.catch(() => [] as VitalPoint[]);
  const [spo2, restingHr, weight] = await Promise.all([
    safe(readVital("oxygenSaturation", days)),
    safe(readVital("restingHeartRate", days)),
    safe(readVital("weight", 365)),
  ]);
  return { spo2, restingHr, weight };
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
