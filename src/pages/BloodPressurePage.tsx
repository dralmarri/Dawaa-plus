import { useState, useRef } from "react";
import { Heart, Save, Pencil, Camera, Loader2, Sparkles } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { store } from "@/lib/store";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";
import ChipSelector from "@/components/ChipSelector";
import BPChart from "@/components/BPChart";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BloodPressureReading } from "@/types";

// Resize + compress an image to keep edge-function payload small
async function fileToCompressedBase64(file: File, maxDim = 1280, quality = 0.85): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", quality);
  return { base64: out.split(",")[1], mimeType: "image/jpeg" };
}


const BloodPressurePage = () => {
  const { t, isRTL } = useLanguage();
  const [readings, setReadings] = useState(store.getReadings());
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [notes, setNotes] = useState("");
  const [period, setPeriod] = useState<"Morning" | "Evening">("Morning");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleImageScan = async (file: File) => {
    if (!file) return;
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file);
      const { data, error } = await supabase.functions.invoke("read-bp-image", {
        body: { imageBase64: base64, mimeType },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast.error(isRTL ? "تم تجاوز الحد المؤقت، حاول بعد قليل" : "Rate limit reached, try again shortly");
        return;
      }
      const { systolic: sys, diastolic: dia, heartRate: hr } = data || {};
      if (sys == null && dia == null && hr == null) {
        toast.error(isRTL ? "تعذّر قراءة الأرقام، حاول بصورة أوضح" : "Could not read numbers, try a clearer photo");
        return;
      }
      if (sys != null) setSystolic(String(sys));
      if (dia != null) setDiastolic(String(dia));
      if (hr != null) setHeartRate(String(hr));
      const parts: string[] = [];
      if (sys != null) parts.push(`${sys}`);
      if (dia != null) parts.push(`/${dia}`);
      if (hr != null) parts.push(` ♥${hr}`);
      toast.success(
        (isRTL ? "تمت القراءة: " : "Scanned: ") + parts.join(""),
        { description: isRTL ? "راجع الأرقام قبل الحفظ" : "Please verify before saving" }
      );
    } catch (e: any) {
      console.error(e);
      toast.error(isRTL ? "تعذّر تحليل الصورة" : "Failed to analyze image");
    } finally {
      setScanning(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };


  const latestReading = readings[0];
  const last7 = readings.slice(0, 7);
  const avgSys = last7.length ? Math.round(last7.reduce((s, r) => s + r.systolic, 0) / last7.length) : 0;
  const avgDia = last7.length ? Math.round(last7.reduce((s, r) => s + r.diastolic, 0) / last7.length) : 0;
  const avgHr = last7.length ? Math.round(last7.reduce((s, r) => s + r.heartRate, 0) / last7.length) : 0;

  const getCategory = (sys: number, dia: number) => {
    if (sys < 90 || dia < 60) return { label: isRTL ? "منخفض" : "Low", color: "text-info", emoji: "🔵" };
    if (sys < 120 && dia < 80) return { label: isRTL ? "طبيعي" : "Normal", color: "text-success", emoji: "🟢" };
    if (sys < 130 && dia < 80) return { label: isRTL ? "مرتفع قليلاً" : "Elevated", color: "text-warning", emoji: "🟡" };
    if (sys < 140 || dia < 90) return { label: isRTL ? "ضغط مرتفع - مرحلة 1" : "High - Stage 1", color: "text-warning", emoji: "🟠" };
    if (sys < 180 || dia < 120) return { label: isRTL ? "ضغط مرتفع - مرحلة 2" : "High - Stage 2", color: "text-destructive", emoji: "🔴" };
    return { label: isRTL ? "أزمة ضغط! راجع الطبيب فوراً" : "Hypertensive Crisis!", color: "text-destructive", emoji: "🚨" };
  };

  const periodLabels: Record<string, string> = { Morning: t.morning, Evening: t.evening };

  const openEdit = (r: BloodPressureReading) => {
    setEditingId(r.id);
    setSystolic(String(r.systolic));
    setDiastolic(String(r.diastolic));
    setHeartRate(String(r.heartRate));
    setNotes(r.notes || "");
    setPeriod(r.period);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!systolic || !diastolic || !heartRate) return;
    const reading: BloodPressureReading = {
      id: editingId || crypto.randomUUID(),
      systolic: Number(systolic), diastolic: Number(diastolic), heartRate: Number(heartRate),
      period,
      date: editingId ? (readings.find(r => r.id === editingId)?.date || format(new Date(), "yyyy-MM-dd")) : format(new Date(), "yyyy-MM-dd"),
      time: editingId ? (readings.find(r => r.id === editingId)?.time || format(new Date(), "HH:mm")) : format(new Date(), "HH:mm"),
      notes: notes.trim() || undefined,
    };
    await store.saveReading(reading);
    setReadings(store.getReadings());
    setSystolic(""); setDiastolic(""); setHeartRate(""); setNotes("");
    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setSystolic(""); setDiastolic(""); setHeartRate(""); setNotes("");
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await store.deleteReading(deleteId);
    setReadings(store.getReadings());
    setDeleteId(null);
  };

  const handlePrintReport = async () => {
    if (!readings.length) return;

    const header = isRTL ? "تقرير ضغط الدم" : "Blood Pressure Report";
    const tempDiv = document.createElement("div");
    tempDiv.dir = isRTL ? "rtl" : "ltr";
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-99999px";
    tempDiv.style.top = "0";
    tempDiv.style.width = "794px";
    tempDiv.style.background = "white";
    tempDiv.style.color = "#111827";
    tempDiv.style.padding = "32px";
    tempDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    tempDiv.innerHTML = `
      <h1 style="margin:0 0 8px;font-size:28px;">${header}</h1>
      <p style="margin:0 0 24px;color:#6b7280;">${isRTL ? "سجل القراءات الطبية لضغط الدم" : "Medical blood pressure readings report"}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "التاريخ" : "Date"}</th>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "الوقت" : "Time"}</th>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "الانقباضي" : "Systolic"}</th>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "الانبساطي" : "Diastolic"}</th>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "النبض" : "Heart rate"}</th>
            <th style="border:1px solid #d1d5db;background:#f3f4f6;padding:10px;text-align:${isRTL ? "right" : "left"}">${isRTL ? "الفترة" : "Period"}</th>
          </tr>
        </thead>
        <tbody>
          ${readings.map((r) => `
            <tr>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.date}</td>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.time}</td>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.systolic}</td>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.diastolic}</td>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.heartRate}</td>
              <td style="border:1px solid #d1d5db;padding:10px;">${r.period}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    document.body.appendChild(tempDiv);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = "blood-pressure-report.pdf";

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = pdf.output("datauristring");
        const base64Data = pdfDataUri.split("base64,")[1];

        if (!base64Data) {
          throw new Error("Unable to encode PDF file");
        }

        const file = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: header,
          dialogTitle: header,
          url: file.uri,
        });
      } else {
        pdf.save(fileName);
      }
    } catch (error) {
      console.error("Failed to export blood pressure report", error);
      toast.error(isRTL ? "تعذر إنشاء ملف التقرير الآن. حاول مرة أخرى." : "Unable to generate the report right now. Please try again.");
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <>
    <div className="pb-28 overflow-x-hidden">
      <PageHeader title={t.bloodPressureMonitoring} showBack />
      <div className="px-3 sm:px-4 space-y-4 max-w-lg mx-auto">
        {latestReading && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{t.latestReading}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{latestReading.systolic}/{latestReading.diastolic}</p>
                <p className="text-sm text-heart">♥ {latestReading.heartRate} bpm</p>
                <span className={`text-sm font-medium ${getCategory(latestReading.systolic, latestReading.diastolic).color}`}>
                  {getCategory(latestReading.systolic, latestReading.diastolic).emoji} {getCategory(latestReading.systolic, latestReading.diastolic).label}
                </span>
              </div>
              <div className="border-s border-border ps-3 flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">{t.averageOfLast} {last7.length} {t.readings}</p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{avgSys}/{avgDia}</p>
                <p className="text-sm text-heart">♥ {avgHr} bpm</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
            </div>
          </div>
        )}


        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3 sm:space-y-4 print-hide">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-info-foreground" fill="currentColor" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{editingId ? t.editReading : t.recordNewReading}</h2>
              <p className="text-sm text-muted-foreground">{t.enterBP}</p>
            </div>
          </div>



          <div>
            <label className="text-sm font-bold text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-heart" /> {t.systolicUpper}
            </label>
            <div className="flex items-center mt-1">
              <span className="text-sm text-muted-foreground me-2">mmHg</span>
              <input type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} placeholder="120"
                className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-lg" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-info" /> {t.diastolicLower}
            </label>
            <div className="flex items-center mt-1">
              <span className="text-sm text-muted-foreground me-2">mmHg</span>
              <input type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} placeholder="80"
                className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-lg" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-heart" /> {t.heartRate}
            </label>
            <div className="flex items-center mt-1">
              <span className="text-sm text-muted-foreground me-2">bpm</span>
              <input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} placeholder="72"
                className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-base sm:text-lg" />
              <Heart className="w-5 h-5 text-heart ms-2" fill="currentColor" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t.normalRange}</p>
          </div>

          <div>
            <label className="text-sm font-bold text-foreground block mb-2">{t.measurementPeriod}</label>
            <ChipSelector
              options={[t.morning, t.evening]}
              value={periodLabels[period]}
              onChange={(v) => setPeriod(v === t.morning ? "Morning" : "Evening")}
            />
          </div>

          <div>
            <label className="text-sm font-bold text-foreground block mb-1">
              {isRTL ? "ملاحظات (اختياري)" : "Notes (optional)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRTL ? "مثال: قبل التمرين، بعد الدواء..." : "e.g. before exercise, after medication..."}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={!systolic || !diastolic || !heartRate}
              className="flex-1 py-2.5 sm:py-3 rounded-2xl bg-info text-info-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base">
              <Save className="w-5 h-5" /> {editingId ? t.save : t.saveReading}
            </button>
            {editingId && (
              <button onClick={handleCancel}
                className="py-2.5 sm:py-3 px-6 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm sm:text-base">
                {t.cancel}
              </button>
            )}
          </div>
        </div>

        <div className="bg-primary rounded-2xl p-5 print-hide">
          <h3 className="text-lg font-bold text-primary-foreground mb-2">{t.medicalTip}</h3>
          <p className="text-primary-foreground/90 text-sm leading-relaxed">{t.medicalTipText}</p>
        </div>

        {readings.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📅</span>
              <h2 className="text-xl font-bold text-foreground">{t.readingsLog}</h2>
              <span className="text-sm bg-accent text-accent-foreground px-2 py-0.5 rounded-full ms-auto">
                {readings.length} {t.readings}
              </span>
            </div>
            <div className="space-y-3">
              {readings.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0">
                  <div>
                    <p className="font-bold text-foreground">{format(new Date(r.date), "MMMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground">{r.time}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.period === "Morning" ? "bg-warning/20 text-warning" : "bg-info/20 text-info"}`}>
                      {r.period === "Morning" ? "☀️" : "🌙"} {periodLabels[r.period]}
                    </span>
                  </div>
                  <div className="text-end">
                    <p className="font-bold text-foreground text-lg">{r.systolic}<span className="text-muted-foreground font-normal">/{r.diastolic}</span></p>
                    <p className="text-sm text-heart">♥ {r.heartRate} bpm</p>
                    <span className={`text-xs font-semibold ${getCategory(r.systolic, r.diastolic).color}`}>
                      {getCategory(r.systolic, r.diastolic).emoji} {getCategory(r.systolic, r.diastolic).label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 ms-2">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(r.id)} className="text-destructive/60 hover:text-destructive p-1">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <BPChart readings={readings} />

        {readings.length > 0 && (
          <button onClick={handlePrintReport} className="w-full py-3 rounded-2xl bg-info text-info-foreground font-semibold text-center print-hide">
            🖨️ {t.printReport}
          </button>
        )}
      </div>
    </div>
    <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isRTL ? "حذف القراءة" : "Delete Reading"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isRTL ? "هل أنت متأكد من حذف هذه القراءة؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this reading? This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isRTL ? "حذف" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default BloodPressurePage;
