import { useEffect, useState } from "react";
import { FilePlus2, FileDown, Pencil, Check, UserPlus, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { format, subDays, isAfter, parseISO } from "date-fns";
import PageHeader from "@/components/PageHeader";
import { useLanguage } from "@/contexts/LanguageContext";
import { store } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import appIcon from "@/assets/app-icon.png";
import UserProfileDialog from "@/components/UserProfileDialog";
import { countProfileFilled, PROFILE_TOTAL, diseaseOptions } from "@/lib/profile";
import { toast } from "sonner";
import { formatTime12, formatTimes } from "@/lib/time";

const ReportsPage = () => {
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [authName, setAuthName] = useState<string>("");

  const meds = store.getMedications();
  const readings = store.getReadings();
  const appointments = store.getAppointments?.() || [];
  const labs = store.getLabTests?.() || [];
  const [settings, setSettings] = useState(store.getSettings());
  const [profileOpen, setProfileOpen] = useState(false);
  const bsReadings = store.getBloodSugarReadings?.() || [];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      const name =
        meta.full_name ||
        meta.name ||
        meta.display_name ||
        (u.email ? u.email.split("@")[0] : "");
      setAuthName(name || "");
    });
  }, []);

  const patientName =
    settings.userName || authName || (isRTL ? "غير محدد" : "Not specified");

  // last 30 days of BP readings
  const cutoff = subDays(new Date(), 30);
  const bp30 = readings
    .filter((r) => {
      try { return isAfter(parseISO(r.date), cutoff); } catch { return false; }
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const upcomingAppts = appointments
    .filter((a) => !a.completed && isAfter(parseISO(a.date), subDays(new Date(), 1)))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // ── BP Chart (inline SVG, last 30 days) ─────────────────
  const renderBPChart = () => {
    if (bp30.length === 0) {
      return `<div style="padding:24px;text-align:center;color:#6b7280;font-size:14px;">${isRTL ? "لا توجد قراءات في آخر 30 يوماً" : "No readings in the last 30 days"}</div>`;
    }
    const w = 700, h = 220, pad = 40;
    const maxV = Math.max(...bp30.map((r) => r.systolic), 180);
    const minV = Math.min(...bp30.map((r) => r.diastolic), 50);
    const range = maxV - minV || 1;
    const stepX = bp30.length > 1 ? (w - pad * 2) / (bp30.length - 1) : 0;

    const point = (v: number, i: number) => {
      const x = pad + i * stepX;
      const y = h - pad - ((v - minV) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    };

    const sysPath = bp30.map((r, i) => point(r.systolic, i)).join(" ");
    const diaPath = bp30.map((r, i) => point(r.diastolic, i)).join(" ");

    // Y-axis gridlines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const y = pad + f * (h - pad * 2);
      const v = Math.round(maxV - f * range);
      return `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/><text x="${pad - 6}" y="${y + 4}" font-size="10" fill="#6b7280" text-anchor="end">${v}</text>`;
    }).join("");

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;">
        ${gridLines}
        <polyline points="${sysPath}" fill="none" stroke="#dc2626" stroke-width="2"/>
        <polyline points="${diaPath}" fill="none" stroke="#2563eb" stroke-width="2"/>
        ${bp30.map((r, i) => {
          const [sx, sy] = point(r.systolic, i).split(",");
          const [dx, dy] = point(r.diastolic, i).split(",");
          return `<circle cx="${sx}" cy="${sy}" r="2.5" fill="#dc2626"/><circle cx="${dx}" cy="${dy}" r="2.5" fill="#2563eb"/>`;
        }).join("")}
      </svg>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:12px;color:#374151;">
        <span><span style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:50%;margin-${isRTL ? "left" : "right"}:6px;"></span>${isRTL ? "الانقباضي" : "Systolic"}</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#2563eb;border-radius:50%;margin-${isRTL ? "left" : "right"}:6px;"></span>${isRTL ? "الانبساطي" : "Diastolic"}</span>
      </div>
    `;
  };

  const buildReportHTML = () => {
    const today = format(new Date(), "yyyy-MM-dd HH:mm");
    const dir = isRTL ? "rtl" : "ltr";
    const align = isRTL ? "right" : "left";

    const freqLabel: Record<string, { ar: string; en: string }> = {
      "Once daily": { ar: "مرة يومياً", en: "Once daily" },
      "Twice daily": { ar: "مرتين يومياً", en: "Twice daily" },
      "Three times daily": { ar: "ثلاث مرات يومياً", en: "Three times daily" },
      "Four times daily": { ar: "أربع مرات يومياً", en: "Four times daily" },
      daily: { ar: "يومياً", en: "Daily" },
      weekly: { ar: "أسبوعياً", en: "Weekly" },
      monthly: { ar: "شهرياً", en: "Monthly" },
    };
    const tr = (key: string) => freqLabel[key]?.[isRTL ? "ar" : "en"] || key;

    const th = (label: string) =>
      `<th style="border:1px solid #d1d5db;background:#dcfce7;padding:8px;text-align:${align};font-size:12px;color:#14532d;">${label}</th>`;
    const td = (val: string | number) =>
      `<td style="border:1px solid #e5e7eb;padding:8px;font-size:12px;color:#1f2937;">${val}</td>`;

    const sectionTitle = (txt: string) =>
      `<h2 style="font-size:18px;color:#14532d;border-bottom:2px solid #14532d;padding-bottom:6px;margin:24px 0 12px 0;">${txt}</h2>`;

    const medsTable = meds.length === 0
      ? `<p style="color:#6b7280;font-size:13px;">${isRTL ? "لا توجد أدوية مسجلة" : "No medications recorded"}</p>`
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            ${th(isRTL ? "اسم الدواء" : "Medication")}
            ${th(isRTL ? "الجرعة" : "Dosage")}
            ${th(isRTL ? "التكرار" : "Frequency")}
            ${th(isRTL ? "الأوقات" : "Times")}
            ${th(isRTL ? "علاقة بالوجبة" : "Meal")}
          </tr></thead>
          <tbody>${meds.map((m) => `<tr>
            ${td(m.name)}
            ${td(`${m.dosage} ${m.concentration || ""}`)}
            ${td(tr(m.frequency))}
            ${td(formatTimes(m.times, isRTL))}
            ${td(m.mealRelation)}
          </tr>`).join("")}</tbody>
        </table>`;

    const apptsTable = upcomingAppts.length === 0
      ? `<p style="color:#6b7280;font-size:13px;">${isRTL ? "لا توجد مواعيد قادمة" : "No upcoming appointments"}</p>`
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            ${th(isRTL ? "التاريخ" : "Date")}
            ${th(isRTL ? "الوقت" : "Time")}
            ${th(isRTL ? "التخصص" : "Specialty")}
            ${th(isRTL ? "الطبيب" : "Doctor")}
            ${th(isRTL ? "الموقع" : "Location")}
          </tr></thead>
          <tbody>${upcomingAppts.map((a) => `<tr>
            ${td(a.date)}
            ${td(a.time)}
            ${td(a.specialty || "—")}
            ${td(a.doctorName || "—")}
            ${td(a.location || "—")}
          </tr>`).join("")}</tbody>
        </table>`;

    const renderLabAttachment = (fileUrl?: string) => {
      if (!fileUrl) return "";
      if (fileUrl.startsWith("data:image") || fileUrl.startsWith("http")) {
        return `<div style="margin-top:8px;padding:8px 12px;background:#ecfdf5;border:1px dashed #14532d;border-radius:8px;font-size:12px;color:#14532d;">
          🖼️ ${isRTL ? "صورة التحليل مرفقة في صفحة منفصلة" : "Lab image attached on a separate page"}
        </div>`;
      }
      if (fileUrl.startsWith("pdfdata:")) {
        const name = fileUrl.slice(8).split("|||")[0] || "PDF";
        return `<div style="margin-top:8px;padding:8px 12px;background:#f3f4f6;border:1px dashed #9ca3af;border-radius:8px;font-size:12px;color:#374151;">
          📄 ${isRTL ? "ملف PDF مرفق:" : "PDF attached:"} <strong>${name}</strong>
        </div>`;
      }
      if (fileUrl.startsWith("pdf:")) {
        const name = fileUrl.slice(4);
        return `<div style="margin-top:8px;padding:8px 12px;background:#f3f4f6;border:1px dashed #9ca3af;border-radius:8px;font-size:12px;color:#374151;">
          📄 ${isRTL ? "ملف PDF مرفق:" : "PDF attached:"} <strong>${name}</strong>
        </div>`;
      }
      return "";
    };

    const labsBlock = labs.length === 0
      ? `<p style="color:#6b7280;font-size:13px;">${isRTL ? "لا توجد تحاليل مسجلة" : "No lab results recorded"}</p>`
      : labs.slice(0, 20).map((l) => `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:12px;background:#fafafa;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;">
              <strong style="font-size:14px;color:#14532d;">${l.name}</strong>
              <span style="font-size:12px;color:#6b7280;">${l.date}</span>
            </div>
            ${l.notes ? `<div style="font-size:12px;color:#1f2937;white-space:pre-wrap;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px;">${l.notes.replace(/</g, "&lt;")}</div>` : `<div style="font-size:12px;color:#9ca3af;font-style:italic;">${isRTL ? "لا توجد بيانات يدوية" : "No manual data"}</div>`}
            ${renderLabAttachment(l.fileUrl)}
          </div>
        `).join("");

    // ── Patient profile block ─────────────────────────────
    const diseaseLabels: Record<string, { ar: string; en: string }> = {
      diabetes: { ar: "السكري", en: "Diabetes" },
      hypertension: { ar: "ضغط الدم", en: "Hypertension" },
      cholesterol: { ar: "الكوليسترول", en: "Cholesterol" },
      heart: { ar: "أمراض القلب", en: "Heart Disease" },
      asthma: { ar: "الربو", en: "Asthma" },
      thyroid: { ar: "الغدة الدرقية", en: "Thyroid" },
      kidney: { ar: "الكلى", en: "Kidney" },
      liver: { ar: "الكبد", en: "Liver" },
      rheumatism: { ar: "الروماتيزم", en: "Rheumatism" },
      anemia: { ar: "فقر الدم", en: "Anemia" },
    };
    const dash = isRTL ? "—" : "—";
    const ec = settings.emergencyContact;
    const diseasesList = [
      ...((settings.chronicDiseases || []).map((k) => diseaseLabels[k]?.[isRTL ? "ar" : "en"] || k)),
      ...(settings.customDiseases ? [settings.customDiseases] : []),
    ];
    const profileRow = (label: string, value: string) =>
      `<tr>${td(`<strong>${label}</strong>`)}${td(value || dash)}</tr>`;
    const profileTable = `<table style="width:100%;border-collapse:collapse;">
      <tbody>
        ${profileRow(isRTL ? "الاسم" : "Name", patientName)}
        ${profileRow(isRTL ? "تاريخ الميلاد" : "Date of Birth", settings.dateOfBirth || "")}
        ${profileRow(isRTL ? "فصيلة الدم" : "Blood Type", settings.bloodType || "")}
        ${profileRow(isRTL ? "الحساسية من الأدوية" : "Drug Allergies", settings.allergies || (isRTL ? "لا يوجد" : "None"))}
        ${profileRow(isRTL ? "الأمراض المزمنة" : "Chronic Diseases", diseasesList.length ? diseasesList.join("، ") : (isRTL ? "لا يوجد" : "None"))}
        ${profileRow(isRTL ? "جهة اتصال الطوارئ" : "Emergency Contact",
          ec && ec.name ? `${ec.name} — <span dir="ltr">${ec.phone}</span> (${ec.method === "whatsapp" ? "WhatsApp" : "SMS"})` : "")}
      </tbody>
    </table>`;

    // ── Blood sugar last 30 days ──────────────────────────
    const bs30 = bsReadings
      .filter((r) => { try { return isAfter(parseISO(r.date), cutoff); } catch { return false; } })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const bsPeriodLabel: Record<string, { ar: string; en: string }> = {
      "Fasting": { ar: "صائم", en: "Fasting" },
      "Before meal": { ar: "قبل الأكل", en: "Before meal" },
      "After meal": { ar: "بعد الأكل", en: "After meal" },
      "Bedtime": { ar: "قبل النوم", en: "Bedtime" },
      "Random": { ar: "عشوائي", en: "Random" },
    };
    const bsTable = bs30.length === 0
      ? `<p style="color:#6b7280;font-size:13px;">${isRTL ? "لا توجد قراءات سكر في آخر 30 يوماً" : "No blood sugar readings in the last 30 days"}</p>`
      : `<table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            ${th(isRTL ? "التاريخ" : "Date")}
            ${th(isRTL ? "الوقت" : "Time")}
            ${th(isRTL ? "القراءة (mg/dL)" : "Value (mg/dL)")}
            ${th(isRTL ? "وقت القياس" : "When")}
          </tr></thead>
          <tbody>${bs30.map((r) => `<tr>
            ${td(r.date)}
            ${td(formatTime12(r.time, isRTL))}
            ${td(`<strong>${r.value}</strong>`)}
            ${td(bsPeriodLabel[r.period]?.[isRTL ? "ar" : "en"] || r.period)}
          </tr>`).join("")}</tbody>
        </table>`;

    const bpTable = bp30.length === 0
      ? `<p style="color:#6b7280;font-size:13px;">${isRTL ? "لا توجد قراءات ضغط في آخر 30 يوماً" : "No blood pressure readings in the last 30 days"}</p>`
      : `<table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead><tr>
            ${th(isRTL ? "التاريخ" : "Date")}
            ${th(isRTL ? "الوقت" : "Time")}
            ${th(isRTL ? "الانقباضي" : "Systolic")}
            ${th(isRTL ? "الانبساطي" : "Diastolic")}
            ${th(isRTL ? "النبض" : "Pulse")}
          </tr></thead>
          <tbody>${bp30.map((r) => `<tr>
            ${td(r.date)}
            ${td(formatTime12(r.time, isRTL))}
            ${td(`<strong>${r.systolic}</strong>`)}
            ${td(`<strong>${r.diastolic}</strong>`)}
            ${td(r.heartRate ?? "—")}
          </tr>`).join("")}</tbody>
        </table>`;

    return `
      <div dir="${dir}" style="width:794px;padding:32px;background:#fff;font-family:'Segoe UI','Tahoma','Arial',sans-serif;color:#111827;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:16px;border-bottom:3px solid #14532d;padding-bottom:16px;margin-bottom:20px;">
          <img src="${appIcon}" alt="Dawaa+" style="width:64px;height:64px;object-fit:contain;" crossorigin="anonymous"/>
          <div style="flex:1;">
            <h1 style="margin:0;font-size:26px;color:#14532d;font-weight:bold;">Dawaa+ ${isRTL ? "— التقرير الصحي" : "— Health Report"}</h1>
            <div style="margin-top:6px;font-size:13px;color:#374151;">
              <strong>${isRTL ? "المريض:" : "Patient:"}</strong> ${patientName}
              &nbsp;•&nbsp;
              <strong>${isRTL ? "التاريخ:" : "Date:"}</strong> ${today}
            </div>
          </div>
        </div>

        ${sectionTitle(isRTL ? "👤 بيانات المريض" : "👤 Patient Profile")}
        ${profileTable}

        ${sectionTitle(isRTL ? "💊 الأدوية الحالية" : "💊 Current Medications")}
        ${medsTable}

        ${sectionTitle(isRTL ? "🩺 ضغط الدم — آخر 30 يوماً" : "🩺 Blood Pressure — Last 30 Days")}
        <div style="text-align:center;">${renderBPChart()}</div>
        ${bpTable}

        ${bsReadings.length > 0 ? `${sectionTitle(isRTL ? "🩸 سكر الدم — آخر 30 يوماً" : "🩸 Blood Sugar — Last 30 Days")}${bsTable}` : ""}

        ${sectionTitle(isRTL ? "📅 المواعيد القادمة" : "📅 Upcoming Appointments")}
        ${apptsTable}

        ${sectionTitle(isRTL ? "🧪 ملخص التحاليل" : "🧪 Lab Results Summary")}
        ${labsBlock}

        <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
          ${isRTL ? "تم إنشاء هذا التقرير بواسطة تطبيق Dawaa+" : "Generated by Dawaa+ app"}
        </div>
      </div>
    `;
  };

  const handleExport = async () => {
    setLoading(true);
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-10000px";
    tempDiv.style.top = "0";
    tempDiv.innerHTML = buildReportHTML();
    document.body.appendChild(tempDiv);

    try {
      // wait a tick so image loads
      await new Promise((r) => setTimeout(r, 300));

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
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

      // Append a separate page for each lab image at natural fit
      const imageLabs = labs.filter(
        (l) => l.fileUrl && (l.fileUrl.startsWith("data:image") || l.fileUrl.startsWith("http"))
      );

      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const marginMm = 10;
      const headerH = 14;
      const maxW = pageWidth - marginMm * 2;
      const maxH = pageHeight - marginMm * 2 - headerH;

      for (const lab of imageLabs) {
        try {
          const img = await loadImg(lab.fileUrl!);
          // fit while preserving aspect ratio
          const ratio = Math.min(maxW / (img.width / 3.7795), maxH / (img.height / 3.7795));
          // convert px → mm using 96dpi (1mm = 3.7795 px)
          const wMm = Math.min((img.width / 3.7795) * ratio, maxW);
          const hMm = Math.min((img.height / 3.7795) * ratio, maxH);
          const x = (pageWidth - wMm) / 2;
          const y = marginMm + headerH + (maxH - hMm) / 2;

          pdf.addPage();
          // Header for the attachment page
          pdf.setFontSize(11);
          pdf.setTextColor(20, 83, 45);
          const label = `${lab.name}  •  ${lab.date}`;
          pdf.text(label, pageWidth / 2, marginMm + 8, { align: "center" });

          const fmt = lab.fileUrl!.startsWith("data:image/png") ? "PNG" : "JPEG";
          pdf.addImage(lab.fileUrl!, fmt, x, y, wMm, hMm);
        } catch (err) {
          console.warn("Failed to attach lab image", lab.id, err);
        }
      }



      const fileName = `dawaa-plus-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const pdfDataUri = pdf.output("datauristring");
        const base64Data = pdfDataUri.split("base64,")[1];
        if (!base64Data) throw new Error("encode failed");
        const file = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: isRTL ? "تقرير Dawaa+" : "Dawaa+ Report",
          dialogTitle: isRTL ? "مشاركة التقرير" : "Share Report",
          url: file.uri,
        });
      } else {
        pdf.save(fileName);
      }

      toast.success(isRTL ? "تم إنشاء التقرير" : "Report generated");
    } catch (e) {
      console.error("Report export failed", e);
      toast.error(isRTL ? "تعذر إنشاء التقرير" : "Failed to generate report");
    } finally {
      document.body.removeChild(tempDiv);
      setLoading(false);
    }
  };

  const filled = countProfileFilled(settings);
  const isEmptyProfile = filled === 0;
  const displayName = settings.userName || authName;
  const initial = displayName.trim().charAt(0).toUpperCase();
  const diseaseNames = [
    ...(settings.chronicDiseases || []).map((k) => {
      const d = diseaseOptions.find((x) => x.key === k);
      return d ? (isRTL ? d.ar : d.en) : k;
    }),
    ...(settings.customDiseases ? [settings.customDiseases] : []),
  ];
  const formatDob = (iso?: string) => (iso ? iso.replace(/-/g, "/") : "—");

  const reportItems = isRTL
    ? ["بيانات المريض", "قائمة الأدوية والجرعات", "مخطط ضغط الدم لآخر 30 يوماً", "قراءات السكر لآخر 30 يوماً", "المواعيد القادمة", "ملخص التحاليل"]
    : ["Patient profile", "Medications & dosages", "Blood pressure chart (last 30 days)", "Blood sugar readings (last 30 days)", "Upcoming appointments", "Lab results summary"];

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={isRTL ? "التقارير الطبية" : "Medical Reports"} showBack />

      <div className="px-5 pt-4 space-y-6">
        {/* Patient profile */}
        {isEmptyProfile ? (
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-border bg-muted/40 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              {isRTL ? "بياناتك الصحية غير مكتملة" : "Your health profile is empty"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-[15rem]">
              {isRTL ? "أضف بياناتك الصحية لتظهر في التقرير الطبي الشامل" : "Add your health details to include them in the full medical report"}
            </p>
            <button
              onClick={() => setProfileOpen(true)}
              className="mt-6 w-full bg-accent text-primary font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-transform"
            >
              {isRTL ? "إضافة البيانات" : "Add Details"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full text-start bg-card rounded-3xl p-5 shadow-sm border border-border active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary">{initial || "؟"}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground truncate">
                    {displayName || (isRTL ? "بدون اسم" : "No name")}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(filled / PROFILE_TOTAL) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {filled}/{PROFILE_TOTAL} {isRTL ? "حقول مكتملة" : "fields completed"}
                    </span>
                  </div>
                </div>
              </div>
              <span className="p-2 text-primary rounded-full">
                <Pencil className="w-4 h-4" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/60 p-3 rounded-2xl border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 font-medium">{isRTL ? "فصيلة الدم" : "Blood Type"}</p>
                <p className="text-sm font-bold text-primary" dir="ltr" style={{ textAlign: isRTL ? "right" : "left" }}>
                  {settings.bloodType || "—"}
                </p>
              </div>
              <div className="bg-background/60 p-3 rounded-2xl border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 font-medium">{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</p>
                <p className="text-sm font-bold text-foreground">{formatDob(settings.dateOfBirth)}</p>
              </div>
            </div>

            {(diseaseNames.length > 0 || settings.allergies) && (
              <div className="space-y-2 mt-4">
                {diseaseNames.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground/80">
                      <span className="text-muted-foreground font-medium">{isRTL ? "الأمراض المزمنة: " : "Conditions: "}</span>
                      {diseaseNames.join(isRTL ? "، " : ", ")}
                    </p>
                  </div>
                )}
                {settings.allergies && (
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 flex-shrink-0" />
                    <p className="text-sm text-foreground/80">
                      <span className="text-muted-foreground font-medium">{isRTL ? "الحساسية: " : "Allergies: "}</span>
                      {settings.allergies}
                    </p>
                  </div>
                )}
              </div>
            )}
          </button>
        )}

        {/* Comprehensive report */}
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
          <div className="mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <FilePlus2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {isRTL ? "التقرير الصحي الشامل" : "Comprehensive Health Report"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {isRTL ? "ملف PDF يحتوي جميع بياناتك الطبية" : "A PDF with all your medical data"}
            </p>
          </div>

          <ul className="space-y-4 mb-8">
            {reportItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-success" strokeWidth={3} />
                </span>
                <span className="text-sm text-foreground/80">{item}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-md active:scale-[0.98] transition disabled:bg-primary/40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            <span>
              {loading ? (isRTL ? "جارٍ الإنشاء..." : "Generating...") : (isRTL ? "تصدير PDF" : "Export PDF")}
            </span>
          </button>
        </div>

        {/* Tip */}
        <div className="bg-primary/5 rounded-3xl p-5 flex gap-4 border border-primary/10">
          <span className="text-xl leading-none">💡</span>
          <p className="text-sm text-primary leading-relaxed">
            {isRTL
              ? "سيُنشأ تقرير يحمل اسمك وتاريخ اليوم، يمكنك مشاركته مع طبيبك."
              : "The report includes your name and today's date — share it with your doctor."}
          </p>
        </div>
      </div>

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onSaved={setSettings} />
    </div>
  );
};

export default ReportsPage;
