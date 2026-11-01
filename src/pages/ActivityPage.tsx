/**
 * PERSONAL BUILD ONLY (branch: personal-healthkit) — do not merge into main.
 * Steps, workouts and ECG recordings read live from Apple Health.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { App as CapApp } from "@capacitor/app";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Footprints, Dumbbell, HeartPulse, RefreshCw, X, Flame, Timer, Route, AlertTriangle, Loader2, Moon, Sun, Gauge, Wind, Heart, Scale } from "lucide-react";
import type { Workout } from "@capgo/capacitor-health";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { isHealthImportSupported } from "@/lib/healthImport";
import { formatTime12 } from "@/lib/time";
import {
  Ecg, Pedometer, sleepDebug, loadDailySteps, loadWorkouts, loadSleep, loadVitals, requestActivityAuthorization, workoutName,
  type DaySteps, type EcgSummary, type EcgClassification, type NightSleep, type Nap, type VitalPoint, type StageKey,
} from "@/lib/healthActivity";

type Tab = "steps" | "sleep" | "workouts" | "vitals" | "ecg";
const STEP_GOAL = 10000;

const timeOf = (d: Date) => format(d, "HH:mm");

// ── ECG strip ──────────────────────────────────────────────────────
// Standard ECG paper: 25 mm/s, 10 mm/mV. 1 SVG unit = 1 mm.
const SECONDS_PER_ROW = 5;
const ROW_HEIGHT_MM = 30;

const EcgStrip = ({ values, hz }: { values: number[]; hz: number }) => {
  const perRow = Math.round(SECONDS_PER_ROW * hz);
  const rows: number[][] = [];
  for (let i = 0; i < values.length; i += perRow) rows.push(values.slice(i, i + perRow));
  const width = SECONDS_PER_ROW * 25;
  const mid = ROW_HEIGHT_MM / 2;

  return (
    <div className="space-y-1" dir="ltr">
      {rows.map((row, r) => {
        const points = row
          .map((v, i) => {
            const x = (i / hz) * 25;
            const y = Math.max(0.5, Math.min(ROW_HEIGHT_MM - 0.5, mid - v / 100)); // µV → mm
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(" ");
        return (
          <svg key={r} viewBox={`0 0 ${width} ${ROW_HEIGHT_MM}`} className="w-full h-auto rounded-md bg-[#fff5f5]">
            {Array.from({ length: width + 1 }, (_, x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={ROW_HEIGHT_MM}
                stroke="#f5b5b5" strokeWidth={x % 5 === 0 ? 0.25 : 0.08} />
            ))}
            {Array.from({ length: ROW_HEIGHT_MM + 1 }, (_, y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={width} y2={y}
                stroke="#f5b5b5" strokeWidth={y % 5 === 0 ? 0.25 : 0.08} />
            ))}
            <polyline points={points} fill="none" stroke="#1f2937" strokeWidth={0.35} strokeLinejoin="round" />
          </svg>
        );
      })}
    </div>
  );
};

const ActivityPage = () => {
  const { isRTL } = useLanguage();
  const [tab, setTab] = useState<Tab>("steps");

  const [steps, setSteps] = useState<DaySteps[] | null>(null);
  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [sleep, setSleep] = useState<NightSleep[] | null>(null);
  const [naps, setNaps] = useState<Nap[]>([]);
  // Today's steps straight from the iPhone motion sensor (updates while walking).
  const [liveSteps, setLiveSteps] = useState<number | null>(null);
  const [vitals, setVitals] = useState<{ spo2: VitalPoint[]; restingHr: VitalPoint[]; weight: VitalPoint[] } | null>(null);
  const [ecgs, setEcgs] = useState<EcgSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [openEcg, setOpenEcg] = useState<EcgSummary | null>(null);
  const [wave, setWave] = useState<{ values: number[]; hz: number } | null>(null);
  const [waveError, setWaveError] = useState(false);

  const supported = isHealthImportSupported();

  // `silent`: background refresh (timer / app resume) — no spinner, keep old data on failure.
  const loadActivity = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(false); }
    try {
      await requestActivityAuthorization();
      const [s, w, sl, v] = await Promise.all([
        loadDailySteps(7),
        loadWorkouts(30),
        loadSleep(7).catch(() => ({ nights: [] as NightSleep[], naps: [] as Nap[] })),
        loadVitals(30),
      ]);
      setSteps(s);
      setWorkouts(w);
      setSleep(sl.nights);
      setNaps(sl.naps);
      setVitals(v);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadEcgs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      await Ecg.requestAuthorization();
      const { items } = await Ecg.list({ limit: 30 });
      setEcgs(items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    if (tab === "ecg") { if (ecgs === null) loadEcgs(); }
    else if (steps === null) loadActivity();
  }, [tab, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep steps/sleep/vitals current: re-read Apple Health every minute while the
  // page is visible, and immediately when the app comes back to the foreground.
  useEffect(() => {
    if (!supported || tab === "ecg") return;
    const tick = () => { if (document.visibilityState === "visible") loadActivity(true); };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    const sub = CapApp.addListener("appStateChange", ({ isActive }) => { if (isActive) loadActivity(true); });
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      sub.then((h) => h.remove()).catch(() => {});
    };
  }, [tab, supported, loadActivity]);

  // Live iPhone step count: start on mount and again whenever the app comes back
  // to the foreground (so the count resets correctly after midnight).
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const start = () => Pedometer.start()
      .then(({ steps: n }) => { if (!cancelled) setLiveSteps(n); })
      .catch(() => {});
    start();
    const stepsSub = Pedometer.addListener("steps", ({ steps: n }) => { if (!cancelled) setLiveSteps(n); });
    const appSub = CapApp.addListener("appStateChange", ({ isActive }) => { if (isActive) start(); });
    return () => {
      cancelled = true;
      Pedometer.stop().catch(() => {});
      stepsSub.then((h) => h.remove()).catch(() => {});
      appSub.then((h) => h.remove()).catch(() => {});
    };
  }, [supported]);

  const refresh = () => (tab === "ecg" ? loadEcgs() : loadActivity());

  const openRecording = async (e: EcgSummary) => {
    setOpenEcg(e);
    setWave(null);
    setWaveError(false);
    try {
      const res = await Ecg.waveform({ id: e.id, step: 4 });
      setWave({ values: res.values, hz: res.samplingFrequency });
    } catch {
      setWaveError(true);
    }
  };

  const dateLabel = (d: Date) => format(d, isRTL ? "d MMMM yyyy" : "MMM d, yyyy", { locale: isRTL ? ar : undefined });

  const ecgInfo = (c: EcgClassification): { label: string; tone: string } => {
    switch (c) {
      case "sinusRhythm":
        return { label: isRTL ? "نظم جيبي (طبيعي)" : "Sinus rhythm", tone: "bg-success/10 text-success" };
      case "atrialFibrillation":
        return { label: isRTL ? "رجفان أذيني" : "Atrial fibrillation", tone: "bg-destructive/10 text-destructive" };
      case "inconclusiveLowHeartRate":
        return { label: isRTL ? "غير حاسم - نبض منخفض" : "Inconclusive - low HR", tone: "bg-warning/10 text-warning" };
      case "inconclusiveHighHeartRate":
        return { label: isRTL ? "غير حاسم - نبض مرتفع" : "Inconclusive - high HR", tone: "bg-warning/10 text-warning" };
      case "inconclusivePoorReading":
        return { label: isRTL ? "غير حاسم - تسجيل ضعيف" : "Inconclusive - poor recording", tone: "bg-muted text-muted-foreground" };
      default:
        return { label: isRTL ? "غير حاسم" : "Inconclusive", tone: "bg-muted text-muted-foreground" };
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Footprints }[] = [
    { key: "steps", label: isRTL ? "الخطوات" : "Steps", icon: Footprints },
    { key: "sleep", label: isRTL ? "النوم" : "Sleep", icon: Moon },
    { key: "workouts", label: isRTL ? "التمارين" : "Workouts", icon: Dumbbell },
    { key: "vitals", label: isRTL ? "القياسات" : "Vitals", icon: Gauge },
    { key: "ecg", label: isRTL ? "تخطيط القلب" : "ECG", icon: HeartPulse },
  ];

  // ── Steps view ─────────────────────────────────────────────────
  const renderSteps = () => {
    if (!steps) return null;
    // Apple Health total (watch + iPhone, de-duplicated) can lag behind the live
    // iPhone count, so show whichever is higher for today.
    const healthToday = steps[steps.length - 1]?.steps ?? 0;
    const isLive = liveSteps !== null && liveSteps > healthToday;
    const today = isLive ? liveSteps : healthToday;
    const days = steps.map((d, i) => (i === steps.length - 1 ? { ...d, steps: today } : d));
    const avg = Math.round(days.reduce((s, d) => s + d.steps, 0) / days.length);
    const max = Math.max(STEP_GOAL, ...days.map((d) => d.steps));
    const pct = Math.min(100, Math.round((today / STEP_GOAL) * 100));
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{isRTL ? "خطوات اليوم" : "Steps today"}</p>
            {isLive && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {isRTL ? "مباشر من الآيفون" : "Live from iPhone"}
              </span>
            )}
          </div>
          <p className="text-4xl font-bold text-foreground mt-1">{today.toLocaleString("en-US")}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className={`rounded-xl px-3 py-2 ${!isLive ? "bg-primary/10" : "bg-muted"}`}>
              <p className="text-[10px] text-muted-foreground">{isRTL ? "صحة (الساعات + الآيفون)" : "Apple Health (watches + iPhone)"}</p>
              <p className="text-sm font-bold text-foreground">{healthToday.toLocaleString("en-US")}</p>
            </div>
            <div className={`rounded-xl px-3 py-2 ${isLive ? "bg-primary/10" : "bg-muted"}`}>
              <p className="text-[10px] text-muted-foreground">{isRTL ? "مستشعر الآيفون (مباشر)" : "iPhone sensor (live)"}</p>
              <p className="text-sm font-bold text-foreground">{liveSteps !== null ? liveSteps.toLocaleString("en-US") : "—"}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {isRTL ? "يُعرض الرقم الأعلى بين المصدرين" : "The higher of the two is shown"}
          </p>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{pct}% {isRTL ? "من الهدف" : "of goal"}</span>
            <span>{isRTL ? "الهدف" : "Goal"}: {STEP_GOAL.toLocaleString("en-US")}</span>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="font-bold text-foreground">{isRTL ? "آخر 7 أيام" : "Last 7 days"}</h3>
            <span className="text-xs text-muted-foreground">
              {isRTL ? "المتوسط" : "Average"}: <span className="font-bold text-foreground">{avg.toLocaleString("en-US")}</span>
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {days.map((d, i) => {
              const isToday = i === days.length - 1;
              return (
                <div key={d.date.toISOString()} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] text-muted-foreground">
                    {d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps}
                  </span>
                  <div
                    className={`w-full rounded-t-lg ${isToday ? "bg-primary" : "bg-primary/25"}`}
                    style={{ height: `${Math.max(4, (d.steps / max) * 100)}%` }}
                  />
                  <span className={`text-[10px] ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {format(d.date, "EEE", { locale: isRTL ? ar : undefined })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Sleep view ─────────────────────────────────────────────────
  const hm = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return isRTL ? `${h} س ${m} د` : `${h}h ${m}m`;
  };
  const STAGES: { key: StageKey; label: string; color: string }[] = [
    { key: "deep", label: isRTL ? "عميق" : "Deep", color: "#1e3a8a" },
    { key: "light", label: isRTL ? "خفيف" : "Light", color: "#3b82f6" },
    { key: "rem", label: isRTL ? "حركة العين السريعة" : "REM", color: "#8b5cf6" },
    { key: "asleep", label: isRTL ? "نوم" : "Asleep", color: "#60a5fa" },
    { key: "awake", label: isRTL ? "استيقاظ" : "Awake", color: "#f59e0b" },
  ];

  const renderSleep = () => {
    if (!sleep) return null;
    const withData = sleep.filter((n) => n.asleepMinutes > 0);
    const napsCard = naps.length > 0 && (
      <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Sun className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="font-bold text-foreground">{isRTL ? "القيلولة" : "Naps"}</h3>
        </div>
        <div className="divide-y divide-border">
          {naps.map((n) => (
            <div key={n.start.toISOString()} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(n.start, isRTL ? "EEEE d MMMM" : "EEE, MMM d", { locale: isRTL ? ar : undefined })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTime12(timeOf(n.start), isRTL)} ← {formatTime12(timeOf(n.end), isRTL)}
                </p>
              </div>
              <span className="font-bold text-foreground whitespace-nowrap">{hm(n.minutes)}</span>
            </div>
          ))}
        </div>
      </div>
    );
    if (withData.length === 0 && naps.length > 0) return <div className="space-y-4">{napsCard}</div>;
    if (withData.length === 0) {
      return (
        <div className="bg-card rounded-3xl p-8 border border-border text-center">
          <Moon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد بيانات نوم في آخر 7 أيام" : "No sleep data in the last 7 days"}</p>
          <p className="text-muted-foreground/70 text-[11px] mt-3 leading-relaxed" dir="ltr">
            {sleepDebug.error
              ? `error: ${sleepDebug.error}`
              : `samples: ${sleepDebug.raw}` +
                (Object.keys(sleepDebug.states).length ? ` · ${Object.entries(sleepDebug.states).map(([k, v]) => `${k} ${v}`).join(", ")}` : "") +
                (sleepDebug.sources.length ? ` · ${sleepDebug.sources.join(", ")}` : "")}
          </p>
          {sleepDebug.raw === 0 && !sleepDebug.error && (
            <p className="text-muted-foreground text-xs mt-3 leading-relaxed">
              {isRTL
                ? "إذا كانت بيانات النوم موجودة في تطبيق صحة، فعّل إذن «النوم» من: الإعدادات ← صحة ← الوصول إلى البيانات والأجهزة ← Dawaa+"
                : "If Apple Health has sleep data, enable Sleep in Settings → Health → Data Access & Devices → Dawaa+"}
            </p>
          )}
        </div>
      );
    }
    const last = [...sleep].reverse().find((n) => n.asleepMinutes > 0)!;
    const avg = Math.round(withData.reduce((a, n) => a + n.asleepMinutes, 0) / withData.length);
    const maxM = Math.max(8 * 60, ...sleep.map((n) => n.asleepMinutes));
    const stageTotal = STAGES.reduce((a, st) => a + last.stages[st.key], 0) || 1;
    const shownStages = STAGES.filter((st) => last.stages[st.key] > 0);
    return (
      <div className="space-y-4">
        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "نوم آخر ليلة" : "Last night"} · {format(last.date, isRTL ? "EEEE d MMMM" : "EEE, MMM d", { locale: isRTL ? ar : undefined })}
          </p>
          <p className="text-4xl font-bold text-foreground mt-1">{hm(last.asleepMinutes)}</p>
          {last.bedtime && last.wake && (
            <p className="text-sm text-muted-foreground mt-1">
              {formatTime12(timeOf(last.bedtime), isRTL)} ← {formatTime12(timeOf(last.wake), isRTL)}
            </p>
          )}
          {shownStages.length > 0 && (
            <>
              <div className="flex h-3 rounded-full overflow-hidden mt-5" dir="ltr">
                {shownStages.map((st) => (
                  <div key={st.key} style={{ width: `${(last.stages[st.key] / stageTotal) * 100}%`, backgroundColor: st.color }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                {shownStages.map((st) => (
                  <div key={st.key} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="text-muted-foreground">{st.label}</span>
                    <span className="font-bold text-foreground ms-auto whitespace-nowrap">{hm(last.stages[st.key])}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {last.source && <p className="text-[10px] text-muted-foreground mt-4">{isRTL ? "المصدر" : "Source"}: {last.source}</p>}
        </div>

        {napsCard}

        <div className="bg-card rounded-3xl p-6 border border-border shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <h3 className="font-bold text-foreground">{isRTL ? "آخر 7 ليالٍ" : "Last 7 nights"}</h3>
            <span className="text-xs text-muted-foreground">
              {isRTL ? "المتوسط" : "Average"}: <span className="font-bold text-foreground">{hm(avg)}</span>
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {sleep.map((n, i) => {
              const isLast = i === sleep.length - 1;
              return (
                <div key={n.date.toISOString()} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] text-muted-foreground">{n.asleepMinutes ? (n.asleepMinutes / 60).toFixed(1) : "—"}</span>
                  <div className={`w-full rounded-t-lg ${isLast ? "bg-[#3b82f6]" : "bg-[#3b82f6]/30"}`}
                    style={{ height: `${Math.max(4, (n.asleepMinutes / maxM) * 100)}%` }} />
                  <span className={`text-[10px] ${isLast ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                    {format(n.date, "EEE", { locale: isRTL ? ar : undefined })}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 text-center">{isRTL ? "بالساعات" : "Hours"}</p>
        </div>
      </div>
    );
  };

  // ── Vitals view ────────────────────────────────────────────────
  const Sparkline = ({ points, color }: { points: VitalPoint[]; color: string }) => {
    if (points.length < 2) return null;
    const vals = points.map((p) => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const t0 = points[0].date.getTime();
    const tSpan = points[points.length - 1].date.getTime() - t0 || 1;
    const d = points
      .map((p) => `${(((p.date.getTime() - t0) / tSpan) * 100).toFixed(2)},${(28 - ((p.value - min) / span) * 24).toFixed(2)}`)
      .join(" ");
    return (
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-12 mt-3" dir="ltr">
        <polyline points={d} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    );
  };

  const VitalCard = ({
    icon: Icon, title, unit, points, color, decimals = 0, note,
  }: {
    icon: typeof Heart; title: string; unit: string; points: VitalPoint[]; color: string; decimals?: number; note?: string;
  }) => {
    const latest = points[points.length - 1];
    const vals = points.map((p) => p.value);
    return (
      <div className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            {latest ? (
              <p className="text-2xl font-bold text-foreground">
                {latest.value.toFixed(decimals)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{isRTL ? "لا توجد قراءات" : "No readings"}</p>
            )}
          </div>
          {latest && (
            <span className="text-[10px] text-muted-foreground text-end flex-shrink-0">
              {format(latest.date, isRTL ? "d MMM" : "MMM d", { locale: isRTL ? ar : undefined })}
            </span>
          )}
        </div>
        {latest && vals.length > 1 && (
          <>
            <Sparkline points={points} color={color} />
            <p className="text-[11px] text-muted-foreground">
              {note ?? (isRTL ? "آخر 30 يوماً" : "Last 30 days")}: {Math.min(...vals).toFixed(decimals)} – {Math.max(...vals).toFixed(decimals)} {unit}
            </p>
          </>
        )}
      </div>
    );
  };

  const renderVitals = () => {
    if (!vitals) return null;
    return (
      <div className="space-y-3">
        <VitalCard icon={Wind} title={isRTL ? "تشبع الأكسجين" : "Blood oxygen"} unit="%" points={vitals.spo2} color="#0ea5e9" />
        <VitalCard icon={Heart} title={isRTL ? "نبض القلب أثناء الراحة" : "Resting heart rate"} unit="bpm" points={vitals.restingHr} color="#ef4444" />
        <VitalCard icon={Scale} title={isRTL ? "الوزن" : "Weight"} unit={isRTL ? "كغ" : "kg"} points={vitals.weight} color="#8b5cf6" decimals={1}
          note={isRTL ? "آخر سنة" : "Last year"} />
      </div>
    );
  };

  // ── Workouts view ──────────────────────────────────────────────
  const renderWorkouts = () => {
    if (!workouts) return null;
    if (workouts.length === 0) {
      return (
        <div className="bg-card rounded-3xl p-8 border border-border text-center">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{isRTL ? "لا توجد تمارين في آخر 30 يوماً" : "No workouts in the last 30 days"}</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {workouts.map((w) => {
          const start = new Date(w.startDate);
          const mins = Math.round(w.duration / 60);
          return (
            <div key={`${w.startDate}-${w.workoutType}`} className="bg-card rounded-3xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{workoutName(w.workoutType, isRTL)}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateLabel(start)} · {formatTime12(timeOf(start), isRTL)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">
                  <Timer className="w-3.5 h-3.5" /> {mins} {isRTL ? "دقيقة" : "min"}
                </span>
                {w.totalEnergyBurned != null && w.totalEnergyBurned > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                    <Flame className="w-3.5 h-3.5" /> {Math.round(w.totalEnergyBurned)} {isRTL ? "سعرة" : "kcal"}
                  </span>
                )}
                {w.totalDistance != null && w.totalDistance > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-info/10 text-info">
                    <Route className="w-3.5 h-3.5" /> {(w.totalDistance / 1000).toFixed(2)} {isRTL ? "كم" : "km"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── ECG view ───────────────────────────────────────────────────
  const disclaimer = (
    <div className="bg-warning/10 border border-warning/20 rounded-2xl p-3 flex gap-2 text-xs text-foreground/80">
      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
      <span>
        {isRTL
          ? "هذه التسجيلات من Apple Watch للاطلاع فقط وليست تشخيصاً طبياً. راجع طبيبك عند أي قلق."
          : "These Apple Watch recordings are for reference only and are not a medical diagnosis. See your doctor if concerned."}
      </span>
    </div>
  );

  const renderEcg = () => {
    if (!ecgs) return null;
    return (
      <div className="space-y-3">
        {disclaimer}
        {ecgs.length === 0 ? (
          <div className="bg-card rounded-3xl p-8 border border-border text-center">
            <HeartPulse className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {isRTL ? "لا توجد تسجيلات تخطيط قلب في تطبيق صحة" : "No ECG recordings in Apple Health"}
            </p>
          </div>
        ) : (
          ecgs.map((e) => {
            const d = new Date(e.startDate);
            const info = ecgInfo(e.classification);
            return (
              <button key={e.id} onClick={() => openRecording(e)}
                className="w-full text-start bg-card rounded-3xl p-4 border border-border shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-heart/10 flex items-center justify-center flex-shrink-0">
                    <HeartPulse className="w-6 h-6 text-heart" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${info.tone}`}>{info.label}</span>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {dateLabel(d)} · {formatTime12(timeOf(d), isRTL)}
                    </p>
                  </div>
                  {e.averageHeartRate != null && (
                    <div className="text-end flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">{Math.round(e.averageHeartRate)}</p>
                      <p className="text-[10px] text-muted-foreground">bpm</p>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={isRTL ? "النشاط والقلب" : "Activity & Heart"} showBack />

      <div className="px-5 pt-4 space-y-5">
        {!supported ? (
          <div className="bg-card rounded-3xl p-8 border border-border text-center text-sm text-muted-foreground">
            {isRTL ? "هذه الميزة متاحة على الآيفون فقط" : "This feature is available on iPhone only"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-1 bg-muted/60 p-1 rounded-2xl">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold leading-tight transition-colors ${
                    tab === t.key ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button onClick={refresh} disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-50">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                {isRTL ? "تحديث من تطبيق صحة" : "Refresh from Health"}
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive rounded-2xl p-4 text-sm">
                {isRTL
                  ? "تعذر قراءة البيانات. تأكد من السماح لدواء+ في: تطبيق صحة ← الملف الشخصي ← التطبيقات."
                  : "Could not read data. Check Dawaa+ permissions in Health → Profile → Apps."}
              </div>
            )}

            {loading && ((tab === "ecg" && !ecgs) || (tab !== "ecg" && !steps)) ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : tab === "steps" ? renderSteps()
              : tab === "sleep" ? renderSleep()
              : tab === "workouts" ? renderWorkouts()
              : tab === "vitals" ? renderVitals()
              : renderEcg()}
          </>
        )}
      </div>

      {openEcg && createPortal(
        <div className="fixed inset-0 bg-foreground/50 z-[60] flex items-end justify-center" onClick={() => setOpenEcg(null)}>
          <div dir={isRTL ? "rtl" : "ltr"} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[92vh] bg-background rounded-t-[32px] flex flex-col">
            <div className="w-full flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 bg-border rounded-full" /></div>
            <div className="px-6 pt-2 pb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{isRTL ? "تخطيط القلب" : "ECG"}</h2>
              <button onClick={() => setOpenEcg(null)} className="text-muted-foreground p-1" aria-label="Close"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] space-y-4">
              <div className="bg-card rounded-3xl p-4 border border-border">
                <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full ${ecgInfo(openEcg.classification).tone}`}>
                  {ecgInfo(openEcg.classification).label}
                </span>
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? "التاريخ" : "Date"}</p>
                    <p className="font-bold text-foreground">
                      {dateLabel(new Date(openEcg.startDate))} · {formatTime12(timeOf(new Date(openEcg.startDate)), isRTL)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">{isRTL ? "متوسط النبض" : "Average heart rate"}</p>
                    <p className="font-bold text-foreground">
                      <span dir="ltr">{openEcg.averageHeartRate != null ? `${Math.round(openEcg.averageHeartRate)} bpm` : "—"}</span>
                    </p>
                  </div>
                </div>
                {openEcg.symptoms && (
                  <p className="text-xs text-warning mt-3">{isRTL ? "تم تسجيل أعراض مع هذا التخطيط" : "Symptoms were logged with this recording"}</p>
                )}
              </div>

              <div className="bg-card rounded-3xl p-3 border border-border">
                {wave ? (
                  <>
                    <EcgStrip values={wave.values} hz={wave.hz} />
                    <p className="text-[10px] text-muted-foreground mt-2 text-center" dir="ltr">25 mm/s · 10 mm/mV · Lead I</p>
                  </>
                ) : waveError ? (
                  <p className="text-sm text-destructive text-center py-10">{isRTL ? "تعذر تحميل التخطيط" : "Could not load the recording"}</p>
                ) : (
                  <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
                )}
              </div>

              {disclaimer}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActivityPage;
