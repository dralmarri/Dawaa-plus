import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PREVIEW_URL = process.env.PREVIEW_URL || 'https://dawaa-plus-buddy.lovable.app';
const OUT_DIR = '/mnt/documents/appstore-screenshots/ipad-12.9';
fs.mkdirSync(OUT_DIR, { recursive: true });

// iPad Pro 12.9" target: 2048x2732. Capture at 1024x1366 @2x DPR for crispness.
const VP = { width: 1024, height: 1366 };
const TARGET = { width: 2048, height: 2732 };

const today = new Date();
const ymd = (d) => d.toISOString().slice(0,10);
const dayMinus = (n) => { const d = new Date(today); d.setDate(d.getDate()-n); return ymd(d); };

const meds = [
  { id: 'm1', name: 'أملوديبين', dosage: '5mg', form: 'حبة', times: ['08:00','20:00'], stock: 28, initialStock: 60, imageUrl: '', notes: 'لضغط الدم', startDate: dayMinus(30), color:'#3B82F6' },
  { id: 'm2', name: 'ميتفورمين', dosage: '500mg', form: 'حبة', times: ['08:00','14:00','20:00'], stock: 45, initialStock: 90, imageUrl: '', notes: 'بعد الأكل', startDate: dayMinus(20), color:'#10B981' },
  { id: 'm3', name: 'أتورفاستاتين', dosage: '20mg', form: 'حبة', times: ['22:00'], stock: 12, initialStock: 30, imageUrl: '', notes: 'قبل النوم', startDate: dayMinus(15), color:'#F59E0B' },
  { id: 'm4', name: 'فيتامين د', dosage: '50000IU', form: 'كبسولة', times: ['09:00'], stock: 8, initialStock: 12, imageUrl: '', notes: 'أسبوعياً', startDate: dayMinus(10), color:'#8B5CF6' },
];
const bp = [
  { id:'b1', systolic:128, diastolic:82, pulse:72, date: dayMinus(0), time:'08:15', notes:'صباحاً' },
  { id:'b2', systolic:135, diastolic:86, pulse:78, date: dayMinus(1), time:'09:00', notes:'' },
  { id:'b3', systolic:122, diastolic:80, pulse:70, date: dayMinus(2), time:'08:30', notes:'' },
  { id:'b4', systolic:130, diastolic:84, pulse:74, date: dayMinus(3), time:'08:00', notes:'' },
  { id:'b5', systolic:125, diastolic:79, pulse:71, date: dayMinus(4), time:'08:45', notes:'' },
];
const labs = [
  { id:'l1', testName:'HbA1c', value:'6.8', unit:'%', date: dayMinus(7), notes:'متابعة السكري' },
  { id:'l2', testName:'الكوليسترول الكلي', value:'185', unit:'mg/dL', date: dayMinus(14), notes:'' },
  { id:'l3', testName:'الكرياتينين', value:'0.9', unit:'mg/dL', date: dayMinus(21), notes:'' },
];
const appts = [
  { id:'a1', doctorName:'د. أحمد الزهراني', specialty:'قلبية', date: dayMinus(-3), time:'10:00', location:'مستشفى الملك فيصل', notes:'مراجعة دورية' },
  { id:'a2', doctorName:'د. منى السبيعي', specialty:'سكري وغدد', date: dayMinus(-10), time:'13:30', location:'عيادة النخبة', notes:'تحاليل' },
];
const doses = [];
for (let d=0; d<3; d++) {
  const dateStr = dayMinus(d);
  for (const m of meds) {
    for (const t of m.times) {
      const status = (d>0 || (parseInt(t)<= today.getHours()-1)) ? (Math.random()>0.2?'taken':'missed') : 'pending';
      doses.push({ id:`d-${m.id}-${dateStr}-${t}`, medicationId:m.id, medicationName:m.name, scheduledDate:dateStr, scheduledTime:t, status, takenAt: status==='taken'? new Date().toISOString(): undefined });
    }
  }
}
const settings = { language:'ar', theme:'light', notifications:true, voiceAlerts:false, userName:'محمد', emergencyContacts:[] };

const seedScript = `
  localStorage.setItem('dawaa_medications', ${JSON.stringify(JSON.stringify(meds))});
  localStorage.setItem('dawaa_bp_readings', ${JSON.stringify(JSON.stringify(bp))});
  localStorage.setItem('dawaa_lab_tests', ${JSON.stringify(JSON.stringify(labs))});
  localStorage.setItem('dawaa_appointments', ${JSON.stringify(JSON.stringify(appts))});
  localStorage.setItem('dawaa_dose_records', ${JSON.stringify(JSON.stringify(doses))});
  localStorage.setItem('dawaa_settings', ${JSON.stringify(JSON.stringify(settings))});
  localStorage.setItem('dawaa_guest_mode', 'true');
  localStorage.setItem('language', 'ar');
`;

const pages = [
  { name: '01-home', route: '/' },
  { name: '02-medications', route: '/medications' },
  { name: '03-blood-pressure', route: '/blood-pressure' },
  { name: '04-lab-tests', route: '/lab-tests' },
  { name: '05-appointments', route: '/appointments' },
  { name: '06-history', route: '/history' },
  { name: '07-settings', route: '/settings' },
  { name: '08-add-medication', route: '/medications/add' },
];

const browser = await chromium.launch({ executablePath:'/bin/chromium', args:['--no-sandbox','--disable-setuid-sandbox'] });
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2, locale: 'ar-SA' });
const page = await ctx.newPage();

await page.goto(PREVIEW_URL, { waitUntil:'domcontentloaded' });
await page.evaluate(seedScript);
await page.waitForTimeout(500);

for (const p of pages) {
  await page.goto(PREVIEW_URL + p.route, { waitUntil:'networkidle' }).catch(()=>{});
  await page.waitForTimeout(1200);
  const raw = `/tmp/ipad-${p.name}-raw.png`;
  await page.screenshot({ path: raw, fullPage: false });
  const out = path.join(OUT_DIR, `ipad-129-${p.name}.png`);
  await sharp(raw).resize(TARGET.width, TARGET.height, { fit:'cover', position:'top' }).png().toFile(out);
  console.log('Saved', out);
}

await browser.close();
console.log('Done.');
