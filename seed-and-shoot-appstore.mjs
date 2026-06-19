import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PREVIEW_URL = process.env.PREVIEW_URL || 'http://localhost:4173';
const OUT_BASE = '/mnt/documents/appstore-screenshots';

const devices = [
  {
    name: 'iphone-6.5',
    label: 'iPhone 6.5" (1242×2688)',
    vp: { width: 414, height: 896 },
    dpr: 3,
    target: { width: 1242, height: 2688 },
  },
  {
    name: 'ipad-12.9',
    label: 'iPad Pro 12.9" (2048×2732)',
    vp: { width: 1024, height: 1366 },
    dpr: 2,
    target: { width: 2048, height: 2732 },
  },
];

const today = new Date();
const ymd = (d) => d.toISOString().slice(0, 10);
const dayMinus = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return ymd(d); };
const dayPlus = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };
const createdAt = (n) => new Date(Date.now() - n * 86400000).toISOString();

const currentHour = today.getHours();

const meds = [
  {
    id: 'm1', name: 'Amlodipine', dosage: 5, concentration: '5mg', form: 'Pills', frequency: 'Twice daily',
    times: ['08:00', '20:00'], stock: 28, initialStock: 60, notes: 'لضغط الدم', startDate: dayMinus(30),
    isChronic: true, mealRelation: 'No preference', createdAt: createdAt(30),
  },
  {
    id: 'm2', name: 'Metformin', dosage: 500, concentration: '500mg', form: 'Pills', frequency: 'Three times daily',
    times: ['08:00', '14:00', '20:00'], stock: 45, initialStock: 90, notes: 'بعد الأكل', startDate: dayMinus(20),
    isChronic: true, mealRelation: 'After meal', createdAt: createdAt(20),
  },
  {
    id: 'm3', name: 'Atorvastatin', dosage: 20, concentration: '20mg', form: 'Pills', frequency: 'Once daily',
    times: ['22:00'], stock: 12, initialStock: 30, notes: 'قبل النوم', startDate: dayMinus(15),
    isChronic: true, mealRelation: 'No preference', createdAt: createdAt(15),
  },
  {
    id: 'm4', name: 'Vitamin D', dosage: 50000, concentration: '50000 IU', form: 'Capsules', frequency: 'Once daily',
    times: ['09:00'], stock: 8, initialStock: 12, notes: 'أسبوعياً', startDate: dayMinus(10),
    isChronic: false, durationDays: 30, mealRelation: 'With meal', createdAt: createdAt(10),
  },
];

const bp = [
  { id: 'b1', systolic: 128, diastolic: 82, heartRate: 72, period: 'Morning', date: dayMinus(0), time: '08:15', notes: 'صباحاً' },
  { id: 'b2', systolic: 135, diastolic: 86, heartRate: 78, period: 'Morning', date: dayMinus(1), time: '09:00', notes: '' },
  { id: 'b3', systolic: 122, diastolic: 80, heartRate: 70, period: 'Morning', date: dayMinus(2), time: '08:30', notes: '' },
  { id: 'b4', systolic: 130, diastolic: 84, heartRate: 74, period: 'Morning', date: dayMinus(3), time: '08:00', notes: '' },
  { id: 'b5', systolic: 125, diastolic: 79, heartRate: 71, period: 'Morning', date: dayMinus(4), time: '08:45', notes: '' },
];

const labs = [
  { id: 'l1', name: 'CBC', notes: 'متابعة عامة', date: dayMinus(7) },
  { id: 'l2', name: 'Lipid Panel', notes: 'متابعة الكوليسترول', date: dayMinus(14) },
  { id: 'l3', name: 'Diabetes Panel', notes: 'متابعة السكري', date: dayMinus(21) },
];

const labResults = {
  l1: [
    { testName: 'WBC', value: 6.5, unit: '×10³/µL', normalRange: { min: 4.0, max: 11.0 }, status: 'normal', category: 'CBC' },
    { testName: 'Hemoglobin', value: 13.2, unit: 'g/dL', normalRange: { min: 12.0, max: 17.5 }, status: 'normal', category: 'CBC' },
    { testName: 'Platelets', value: 320, unit: '×10³/µL', normalRange: { min: 150, max: 400 }, status: 'normal', category: 'CBC' },
  ],
  l2: [
    { testName: 'Total Cholesterol', value: 185, unit: 'mg/dL', normalRange: { min: 0, max: 200 }, status: 'normal', category: 'Lipids' },
    { testName: 'LDL', value: 115, unit: 'mg/dL', normalRange: { min: 0, max: 100 }, status: 'high', category: 'Lipids' },
    { testName: 'HDL', value: 55, unit: 'mg/dL', normalRange: { min: 40, max: 60 }, status: 'normal', category: 'Lipids' },
    { testName: 'Triglycerides', value: 140, unit: 'mg/dL', normalRange: { min: 0, max: 150 }, status: 'normal', category: 'Lipids' },
  ],
  l3: [
    { testName: 'Glucose Fasting', value: 110, unit: 'mg/dL', normalRange: { min: 70, max: 100 }, status: 'high', category: 'Diabetes' },
    { testName: 'HbA1c', value: 6.8, unit: '%', normalRange: { min: 4.0, max: 5.6 }, status: 'high', category: 'Diabetes' },
  ],
};

const appts = [
  {
    id: 'a1', doctorName: 'د. أحمد الزهراني', specialty: 'Cardiologist', date: dayPlus(3), time: '10:00',
    location: 'مستشفى الملك فيصل', reminderBefore: '30 minutes', notes: 'مراجعة دورية', completed: false,
  },
  {
    id: 'a2', doctorName: 'د. منى السبيعي', specialty: 'General Practitioner', date: dayPlus(10), time: '13:30',
    location: 'عيادة النخبة', reminderBefore: '60 minutes', notes: 'تحاليل', completed: false,
  },
];

const doses = [];
for (let d = 0; d < 3; d++) {
  const dateStr = dayMinus(d);
  for (const m of meds) {
    for (const t of m.times) {
      const hour = parseInt(t.split(':')[0], 10);
      let status;
      if (d === 0) {
        // Today: morning doses already taken, future doses pending, anything right at the current hour missed
        if (hour <= currentHour - 2) status = 'taken';
        else if (hour <= currentHour) status = 'missed';
        else status = 'pending';
      } else {
        // Past days: mostly taken with the occasional missed dose
        status = Math.random() > 0.2 ? 'taken' : 'missed';
      }
      const takenAt = status === 'taken' ? `${dateStr}T${t}:00` : undefined;
      doses.push({
        id: `d-${m.id}-${dateStr}-${t}`,
        medicationId: m.id,
        medicationName: m.name,
        date: dateStr,
        scheduledTime: t,
        status,
        takenAt,
      });
    }
  }
}

const settings = {
  language: 'ar', theme: 'light', notifications: true, voiceNotifications: false, reminderBefore: '5',
  escalationOnMissed: false, dailySummary: true, dailySummaryTime: '08:00', userName: 'محمد',
};

const seedData = {
  'CapacitorStorage.dawaa_medications': JSON.stringify(meds),
  'CapacitorStorage.dawaa_readings': JSON.stringify(bp),
  'CapacitorStorage.dawaa_appointments': JSON.stringify(appts),
  'CapacitorStorage.dawaa_labTests': JSON.stringify(labs),
  'CapacitorStorage.dawaa_doseRecords': JSON.stringify(doses),
  'CapacitorStorage.dawaa_settings': JSON.stringify(settings),
  'dawaa_lab_results': JSON.stringify(labResults),
  'language': 'ar',
};

const pages = [
  { name: '01-home', route: '/' },
  { name: '02-medications', route: '/medications' },
  { name: '03-history', route: '/history' },
  { name: '04-blood-pressure', route: '/blood-pressure' },
  { name: '05-lab-tests', route: '/lab-tests' },
  { name: '06-appointments', route: '/appointments' },
  { name: '07-settings', route: '/settings' },
];

async function capture(device) {
  const outDir = path.join(OUT_BASE, device.name);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: device.vp,
    deviceScaleFactor: device.dpr,
    locale: 'ar-SA',
  });

  await ctx.addInitScript((data) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, seedData);

  const page = await ctx.newPage();
  await page.goto(PREVIEW_URL + '/auth', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1000);

  // Click guest button to enter the app
  await page.getByText('المتابعة بدون حساب', { exact: false }).click().catch(() => {});
  await page.waitForTimeout(2000);

  for (const p of pages) {
    // SPA navigation to preserve guest-mode React state
    await page.evaluate((route) => {
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, p.route);
    await page.waitForTimeout(2000);

    // Give any charts / lists a moment to render and settle
    await page.waitForTimeout(1000);

    const raw = `/tmp/${device.name}-${p.name}-raw.png`;
    await page.screenshot({ path: raw, fullPage: false });

    const out = path.join(outDir, `${device.name}-${p.name}.png`);
    await sharp(raw)
      .resize(device.target.width, device.target.height, { fit: 'cover', position: 'top' })
      .png()
      .toFile(out);
    console.log('Saved', out);
  }

  await browser.close();
}

(async () => {
  for (const device of devices) {
    console.log(`\nCapturing ${device.label}...`);
    await capture(device);
  }
  console.log('\nDone. Screenshots saved to', OUT_BASE);
})();
