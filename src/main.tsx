import { createRoot } from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { initStore } from "@/lib/store";
import { Preferences } from "@capacitor/preferences";

// Dev-only screenshot seeder: ?seed=appstore
if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("seed") === "appstore") {
  (async () => {
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const meds = [
      { id: "m1", name: "أملوديبين", form: "Pills", dosage: 1, concentration: "5mg", frequency: "يومياً", times: ["08:00"], startDate: today, isChronic: true, mealRelation: "After meal", notes: "لضغط الدم", stock: 45, initialStock: 60, createdAt: nowIso },
      { id: "m2", name: "ميتفورمين", form: "Pills", dosage: 1, concentration: "500mg", frequency: "مرتين يومياً", times: ["08:00", "20:00"], startDate: today, isChronic: true, mealRelation: "With meal", notes: "للسكري", stock: 80, initialStock: 120, createdAt: nowIso },
      { id: "m3", name: "أتورفاستاتين", form: "Pills", dosage: 1, concentration: "20mg", frequency: "يومياً", times: ["21:00"], startDate: today, isChronic: true, mealRelation: "No preference", notes: "للكوليسترول", stock: 25, initialStock: 30, createdAt: nowIso },
      { id: "m4", name: "أوميغا 3", form: "Capsules", dosage: 1, concentration: "1000mg", frequency: "يومياً", times: ["13:00"], startDate: today, isChronic: true, mealRelation: "With meal", notes: "مكمل غذائي", stock: 90, initialStock: 90, createdAt: nowIso },
    ];
    const bp: any[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      bp.push({ id: "b" + i, systolic: 118 + Math.floor(Math.random() * 14), diastolic: 74 + Math.floor(Math.random() * 9), heartRate: 68 + Math.floor(Math.random() * 12), period: "Morning", date: d.toISOString().slice(0, 10), time: "07:30" });
    }
    const appts = [
      { id: "a1", doctorName: "د. خالد العلي", specialty: "باطنية", date: "2026-06-20", time: "10:00", location: "مستشفى الملك فهد", reminderBefore: "60", notes: "مراجعة دورية", completed: false },
      { id: "a2", doctorName: "د. سارة المطيري", specialty: "قلب", date: "2026-07-05", time: "14:30", location: "عيادة القلب التخصصية", reminderBefore: "60", notes: "فحص تخطيط القلب", completed: false },
    ];
    const labs = [
      { id: "l1", name: "تحليل السكر التراكمي HbA1c", notes: "النتيجة: 6.8% — مقبول", date: "2026-05-15" },
      { id: "l2", name: "وظائف الكلى", notes: "الكرياتينين: 0.9 mg/dL — طبيعي", date: "2026-05-20" },
      { id: "l3", name: "الكوليسترول الكلي", notes: "النتيجة: 185 mg/dL — ضمن الحد", date: "2026-06-01" },
    ];
    const doses: any[] = [];
    for (const med of meds) for (const t of med.times) doses.push({ id: med.id + "-" + t, medicationId: med.id, medicationName: med.name, scheduledTime: t, status: "pending", date: today });
    doses[0].status = "taken"; doses[0].takenAt = nowIso;
    const settings = { language: "ar", userName: "أحمد", notifications: true, voiceNotifications: true, reminderBefore: "10", escalationOnMissed: false, dailySummary: true, dailySummaryTime: "08:00" };
    await Preferences.set({ key: "dawaa_medications", value: JSON.stringify(meds) });
    await Preferences.set({ key: "dawaa_readings", value: JSON.stringify(bp) });
    await Preferences.set({ key: "dawaa_appointments", value: JSON.stringify(appts) });
    await Preferences.set({ key: "dawaa_labTests", value: JSON.stringify(labs) });
    await Preferences.set({ key: "dawaa_doseRecords", value: JSON.stringify(doses) });
    await Preferences.set({ key: "dawaa_settings", value: JSON.stringify(settings) });
    window.location.replace("/");
  })();
}

const render = () => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));

// Always render the app — never block on initStore. Catch any init error silently.
Promise.race([initStore().catch((e) => console.error("initStore failed:", e)), timeout])
  .then(render)
  .catch((e) => {
    console.error("Bootstrap error:", e);
    render();
  });

// Remove any Lovable badge elements injected into the DOM
const removeLovableElements = (root: ParentNode) => {
  const selectors = [
    'iframe[src*="lovable"]',
    '[id*="lovable"]',
    '[src*="lovable"]',
    'a[href*="lovable"]',
  ];
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
};

const checkNode = (node: Node) => {
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const src = el.getAttribute?.("src") || "";
  const id = el.getAttribute?.("id") || "";
  const href = el.getAttribute?.("href") || "";
  if (
    src.toLowerCase().includes("lovable") ||
    id.toLowerCase().includes("lovable") ||
    href.toLowerCase().includes("lovable")
  ) {
    el.remove();
    return;
  }
  removeLovableElements(el);
};

if (typeof window !== "undefined" && typeof MutationObserver !== "undefined") {
  removeLovableElements(document);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(checkNode);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
