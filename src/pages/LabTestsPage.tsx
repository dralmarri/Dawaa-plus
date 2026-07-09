import { useState, useRef, useCallback } from "react";
import { FlaskConical, X, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp, Plus, Trash2, Search, Image, ZoomIn, Printer, Eye, EyeOff, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { store } from "@/lib/store";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useLanguage } from "@/contexts/LanguageContext";
import { analyzeValue, labReferences, type AnalyzedResult } from "@/lib/lab-references";
import type { LabTest } from "@/types";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ManualEntry {
  id: string;
  testName: string;
  value: string;
  isCustom: boolean;
}

// ── Multi-file encoding ────────────────────────────────────────────
// The `fileUrl` field / Supabase `file_url` column holds a single string.
// To support multiple attachments without a schema change, several files
// are packed into one string as `multi:[...]` (a JSON array). A single
// file is stored raw so existing entries keep working unchanged.
const MULTI_PREFIX = "multi:";

const parseFiles = (fileUrl?: string): string[] => {
  if (!fileUrl) return [];
  if (fileUrl.startsWith(MULTI_PREFIX)) {
    try {
      const arr = JSON.parse(fileUrl.slice(MULTI_PREFIX.length));
      return Array.isArray(arr) ? arr.filter((f) => typeof f === "string") : [];
    } catch {
      return [];
    }
  }
  return [fileUrl];
};

const encodeFiles = (files: string[]): string | undefined => {
  if (files.length === 0) return undefined;
  if (files.length === 1) return files[0];
  return MULTI_PREFIX + JSON.stringify(files);
};

const isPdfData = (f: string) => f.startsWith("pdfdata:");
const isPdfLegacy = (f: string) => f.startsWith("pdf:");
const isImageFile = (f: string) => !isPdfData(f) && !isPdfLegacy(f);
const pdfDataName = (f: string) => f.slice("pdfdata:".length).split("|||")[0] || "PDF";

const FullscreenViewer = ({ images, startIndex, onClose, isRTL }: { images: string[]; startIndex: number; onClose: () => void; isRTL: boolean }) => {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const src = images[index] ?? images[0];
  const multiple = images.length > 1;

  const goTo = useCallback((delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [images.length]);

  const lastDist = useRef(0);
  const lastCenter = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  const handleDoubleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (scale > 1) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setScale(3);
      }
    }
    lastTap.current = now;
  }, [scale]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
      lastCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      dragging.current = true;
      dragStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y };
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current > 0) {
        const newScale = Math.min(Math.max(scale * (dist / lastDist.current), 1), 6);
        setScale(newScale);
        if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      }
      lastDist.current = dist;
    } else if (e.touches.length === 1 && dragging.current && scale > 1) {
      setTranslate({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }, [scale]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0;
    dragging.current = false;
  }, []);

  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 6));
  const zoomOut = () => {
    setScale((s) => {
      const ns = Math.max(s - 0.5, 1);
      if (ns <= 1) setTranslate({ x: 0, y: 0 });
      return ns;
    });
  };
  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="bg-white/20 text-white rounded-full p-2">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {multiple && (
            <span className="text-white text-xs font-bold bg-white/20 rounded-full px-3 py-1.5">
              {index + 1} / {images.length}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} className="bg-white/20 text-white rounded-full p-2 text-sm font-bold w-9 h-9 flex items-center justify-center">−</button>
            <button onClick={resetZoom} className="bg-white/20 text-white rounded-full px-3 py-1.5 text-xs font-bold min-w-[50px]">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={zoomIn} className="bg-white/20 text-white rounded-full p-2 text-sm font-bold w-9 h-9 flex items-center justify-center">+</button>
          </div>
        </div>
      </div>
      {/* Image area */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onClick={(e) => { if (scale <= 1) onClose(); else e.stopPropagation(); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt="Lab test"
          className="select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: dragging.current ? 'none' : 'transform 0.2s ease',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            touchAction: 'none',
          }}
          onClick={handleDoubleTap}
          draggable={false}
        />
        {multiple && scale <= 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(-1); }}
              className="absolute top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-3"
              style={{ [isRTL ? "right" : "left"]: "12px" }}
              aria-label="Previous"
            >
              <ChevronLeft className={`w-6 h-6 ${isRTL ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(1); }}
              className="absolute top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-3"
              style={{ [isRTL ? "left" : "right"]: "12px" }}
              aria-label="Next"
            >
              <ChevronRight className={`w-6 h-6 ${isRTL ? "rotate-180" : ""}`} />
            </button>
          </>
        )}
      </div>
      {/* Hint */}
      {scale <= 1 && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="bg-white/20 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
            {isRTL ? "انقر مرتين للتكبير • اسحب بإصبعين" : "Double-tap to zoom • Pinch to zoom"}
          </span>
        </div>
      )}
    </div>
  );
};

const LabTestsPage = () => {
  const { t, isRTL } = useLanguage();
  const [tests, setTests] = useState(store.getLabTests());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<Record<string, AnalyzedResult[]>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [fullscreen, setFullscreen] = useState<{ images: string[]; index: number } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ pages: string[]; name: string; downloadUrl: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getStoredLabResults = (): Record<string, AnalyzedResult[]> => {
    try { return JSON.parse(localStorage.getItem("dawaa_lab_results") || "{}"); } catch { return {}; }
  };

  const allStoredResults: Record<string, AnalyzedResult[]> = getStoredLabResults();

  const totalAbnormal = Object.values(allStoredResults).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.filter((r) => r.status !== "normal").length : 0),
    0
  );

  const filteredList = tests.filter((tst) => {
    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    if (tst.name.toLowerCase().includes(q)) return true;
    if (tst.notes?.toLowerCase().includes(q)) return true;
    const res = allStoredResults[tst.id];
    if (Array.isArray(res) && res.some((r) => r.testName.toLowerCase().includes(q))) return true;
    return false;
  });

  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [showTestPicker, setShowTestPicker] = useState(false);
  const [testSearch, setTestSearch] = useState("");
  const [customTestName, setCustomTestName] = useState("");

  const addManualEntry = (testName: string, isCustom: boolean) => {
    const entry: ManualEntry = { id: crypto.randomUUID(), testName, value: "", isCustom };
    setManualEntries((prev) => [...prev, entry]);
    setShowTestPicker(false);
    setTestSearch("");
    setCustomTestName("");
  };

  const updateEntryValue = (id: string, value: string) => {
    setManualEntries((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));
  };

  const removeEntry = (id: string) => {
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getManualResults = (): AnalyzedResult[] => {
    return manualEntries
      .filter((e) => e.value.trim() !== "")
      .map((e) => {
        const numValue = parseFloat(e.value);
        if (isNaN(numValue)) return null;
        const analyzed = analyzeValue(e.testName, numValue);
        if (analyzed) return analyzed;
        return {
          testName: e.testName,
          value: numValue,
          unit: "",
          normalRange: { min: 0, max: 0 },
          status: "normal" as const,
          category: t.other,
        };
      })
      .filter(Boolean) as AnalyzedResult[];
  };

  const filteredTests = labReferences.filter(
    (ref) =>
      ref.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      ref.aliases.some((a) => a.toLowerCase().includes(testSearch.toLowerCase())) ||
      ref.category.toLowerCase().includes(testSearch.toLowerCase())
  );

  const groupedTests = filteredTests.reduce((acc, ref) => {
    if (!acc[ref.category]) acc[ref.category] = [];
    acc[ref.category].push(ref);
    return acc;
  }, {} as Record<string, typeof labReferences>);

  const alreadyAdded = new Set(manualEntries.map((e) => e.testName));

  const compressImage = (file: File, maxWidth = 800, quality = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setAttaching(true);
    const added: string[] = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        try {
          added.push(await compressImage(file));
        } catch {
          try { added.push(await readAsDataUrl(file)); } catch { /* skip unreadable file */ }
        }
      } else if (file.type === "application/pdf") {
        // Store actual PDF data URL so it can be opened later.
        // Format: pdfdata:<filename>|||<dataUrl>
        try {
          added.push(`pdfdata:${file.name}|||${await readAsDataUrl(file)}`);
        } catch {
          added.push("pdf:" + file.name);
        }
      }
    }
    if (added.length > 0) setAttachedFiles((prev) => [...prev, ...added]);
    setAttaching(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Open a stored PDF for viewing — renders pages as images inside the app on all platforms
  const openPdf = async (fileUrl: string) => {
    if (!fileUrl.startsWith("pdfdata:")) return;
    const sep = fileUrl.indexOf("|||");
    if (sep < 0) return;
    const filename = fileUrl.slice("pdfdata:".length, sep) || "lab-test.pdf";
    const dataUrl = fileUrl.slice(sep + 3);
    try {
      setPdfLoading(true);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const arrayBuffer = await blob.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport } as Parameters<typeof page.render>[0]).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      setPdfViewer({ pages, name: filename, downloadUrl });
    } catch {
      toast.error(isRTL ? "تعذر فتح ملف PDF" : "Could not open PDF");
    } finally {
      setPdfLoading(false);
    }
  };


  const handleSave = async () => {
    const hasManualValues = manualEntries.some((entry) => entry.value.trim() !== "");
    const canSaveNow = Boolean(name.trim() || notes.trim() || attachedFiles.length > 0 || hasManualValues);
    if (!canSaveNow) return;

    const testId = editingId || crypto.randomUUID();
    const allResults = getManualResults();
    const generatedName = name.trim() || (isRTL ? `تحليل ${format(new Date(), "yyyy/MM/dd")}` : `Lab Test ${format(new Date(), "yyyy/MM/dd")}`);

    const existingTest = editingId ? tests.find(t2 => t2.id === editingId) : null;

    const test: LabTest = {
      id: testId,
      name: generatedName,
      notes: notes.trim(),
      fileUrl: encodeFiles(attachedFiles),
      date: existingTest?.date || new Date().toISOString(),
    };

    try {
      await store.saveLabTest(test);
      if (allResults.length > 0) {
        const stored = getStoredLabResults();
        stored[testId] = allResults;
        localStorage.setItem("dawaa_lab_results", JSON.stringify(stored));
        setSavedResults((prev) => ({ ...prev, [testId]: allResults }));
      }
      setTests(store.getLabTests());
      resetForm();
    } catch {
      if (test.fileUrl && test.fileUrl.length > 1000) {
        test.fileUrl = undefined;
        try {
          await store.saveLabTest(test);
          if (allResults.length > 0) {
            const stored = getStoredLabResults();
            stored[testId] = allResults;
            localStorage.setItem("dawaa_lab_results", JSON.stringify(stored));
            setSavedResults((prev) => ({ ...prev, [testId]: allResults }));
          }
          setTests(store.getLabTests());
          resetForm();
          toast.warning(isRTL ? "تم الحفظ بدون الصور (المساحة ممتلئة)" : "Saved without images (storage full)");
        } catch {
          toast.error(isRTL ? "فشل الحفظ - المساحة ممتلئة" : "Save failed - storage full");
        }
      } else {
        toast.error(isRTL ? "فشل الحفظ" : "Save failed");
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setName("");
    setNotes("");
    setManualEntries([]);
    setShowTestPicker(false);
    setAttachedFiles([]);
    setEditingId(null);
  };

  const openEdit = (test: LabTest) => {
    setEditingId(test.id);
    setName(test.name);
    setNotes(test.notes);
    setAttachedFiles(parseFiles(test.fileUrl));
    // Load existing results into manual entries
    const allResults = getStoredLabResults();
    const testResults = allResults[test.id] as AnalyzedResult[] | undefined;
    if (testResults && testResults.length > 0) {
      setManualEntries(testResults.map(r => ({
        id: crypto.randomUUID(),
        testName: r.testName,
        value: String(r.value),
        isCustom: false,
      })));
    } else {
      setManualEntries([]);
    }
    setShowForm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await store.deleteLabTest(deleteId);
    const allResults = getStoredLabResults();
    delete allResults[deleteId];
    localStorage.setItem("dawaa_lab_results", JSON.stringify(allResults));
    setTests(store.getLabTests());
    setDeleteId(null);
  };

  const loadSavedResults = (testId: string) => {
    if (savedResults[testId]) {
      setShowResults(showResults === testId ? null : testId);
      return;
    }
    const allResults = getStoredLabResults();
    if (allResults[testId]) {
      setSavedResults((prev) => ({ ...prev, [testId]: allResults[testId] }));
    }
    setShowResults(showResults === testId ? null : testId);
  };

  const handlePrint = async (test: LabTest) => {
    const results = savedResults[test.id] || getStoredLabResults()[test.id];
    const dateStr = format(new Date(test.date), "yyyy/MM/dd - hh:mm a");
    const imageFiles = parseFiles(test.fileUrl).filter(isImageFile);

    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 15;

    // Title and date
    pdf.setFontSize(16);
    pdf.text(test.name, pageWidth / 2, y, { align: "center" });
    y += 8;
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(dateStr, pageWidth / 2, y, { align: "center" });
    pdf.setTextColor(0);
    y += 8;

    // Show each attached image prominently, one after another
    for (let idx = 0; idx < imageFiles.length; idx++) {
      const fileUrl = imageFiles[idx];
      try {
        const img = document.createElement("img");
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = fileUrl;
        });

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const maxW = pageWidth - 20; // 10mm margins
        let maxH = pageHeight - y - 15; // leave bottom margin
        // Start each extra image on a fresh page if little room remains
        if (idx > 0 && maxH < 60) {
          pdf.addPage();
          y = 15;
          maxH = pageHeight - y - 15;
        }
        let w = maxW;
        let h = w / imgRatio;
        if (h > maxH) {
          h = maxH;
          w = h * imgRatio;
        }
        const x = (pageWidth - w) / 2;
        pdf.addImage(fileUrl, "JPEG", x, y, w, h);
        y += h + 5;
      } catch {
        // Image failed to load, continue without it
      }
    }

    // Notes
    if (test.notes) {
      if (y > pageHeight - 30) { pdf.addPage(); y = 15; }
      pdf.setFontSize(10);
      const noteLines = pdf.splitTextToSize(test.notes, pageWidth - 40);
      pdf.text(noteLines, 20, y);
      y += noteLines.length * 5 + 5;
    }

    // Results table (on new page if image took most of the space)
    if (results && results.length > 0) {
      if (y > pageHeight - 40) { pdf.addPage(); y = 15; }
      pdf.setFontSize(10);
      const colWidths = [55, 35, 40, 40];
      const headers = ["Test", "Result", "Normal Range", "Status"];
      const startX = 20;

      pdf.setFillColor(243, 244, 246);
      pdf.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 8, "F");
      pdf.setFont(undefined!, "bold");
      let x = startX;
      headers.forEach((h, i) => {
        pdf.text(h, x + 2, y);
        x += colWidths[i];
      });
      pdf.setFont(undefined!, "normal");
      y += 8;

      results.forEach((r: AnalyzedResult) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        x = startX;
        pdf.text(r.testName, x + 2, y);
        x += colWidths[0];
        pdf.text(`${r.value} ${r.unit}`, x + 2, y);
        x += colWidths[1];
        pdf.text(`${r.normalRange.min}-${r.normalRange.max}`, x + 2, y);
        x += colWidths[2];
        const statusText = r.status === "normal" ? "Normal" : r.status === "high" ? "High" : "Low";
        if (r.status === "high") pdf.setTextColor(220, 38, 38);
        else if (r.status === "low") pdf.setTextColor(37, 99, 235);
        else pdf.setTextColor(22, 163, 74);
        pdf.text(statusText, x + 2, y);
        pdf.setTextColor(0);
        y += 7;
      });
    }

    try {
      const base64 = pdf.output("datauristring").split(",")[1];
      const fileName = `lab-report-${format(new Date(), "yyyyMMdd-HHmmss")}.pdf`;
      const file = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: test.name,
        url: file.uri,
      });
    } catch {
      pdf.save(`lab-report-${test.name}.pdf`);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "high") return <ArrowUp className="w-4 h-4 text-destructive" />;
    if (status === "low") return <ArrowDown className="w-4 h-4 text-orange-500" />;
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  };

  const getStatusBg = (status: string) => {
    if (status === "high") return "bg-destructive/10 border-destructive/20";
    if (status === "low") return "bg-orange-500/10 border-orange-500/20";
    return "bg-green-500/10 border-green-500/20";
  };

  const ResultsView = ({ results }: { results: AnalyzedResult[] }) => {
    const abnormal = results.filter((r) => r.status !== "normal");
    const normal = results.filter((r) => r.status === "normal");

    return (
      <div className="space-y-3 mt-3">
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600">
            ✅ {t.normalResults}: {normal.length}
          </span>
          {abnormal.length > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
              ⚠️ {t.abnormalResults}: {abnormal.length}
            </span>
          )}
        </div>

        {abnormal.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {t.needsAttention}
            </h4>
            {abnormal.map((r, i) => (
              <div key={i} className={`rounded-xl border p-3 ${getStatusBg(r.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(r.status)}
                    <span className="font-bold text-sm text-foreground">{r.testName}</span>
                    <span className="text-xs text-muted-foreground">({r.category})</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-foreground">
                    {r.value} {r.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.normalRangeLabel}: {r.normalRange.min} - {r.normalRange.max} {r.unit}
                  {r.status === "high" ? ` • ${t.aboveNormal}` : ` • ${t.belowNormal}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {normal.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {t.normalResultsTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {normal.map((r, i) => (
                <div key={i} className="rounded-xl border border-border bg-card/50 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-sm text-foreground">{r.testName}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.value} {r.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hasManualValues = manualEntries.some((entry) => entry.value.trim() !== "");
  const canSave = Boolean(name.trim() || notes.trim() || attachedFiles.length > 0 || hasManualValues);
  const manualResults = getManualResults();

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={t.labTests} showBack onAdd={() => setShowForm(true)} />

      {fullscreen && (
        <FullscreenViewer
          images={fullscreen.images}
          startIndex={fullscreen.index}
          onClose={() => setFullscreen(null)}
          isRTL={isRTL}
        />
      )}

      {pdfLoading && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center">
          <div className="bg-background rounded-lg px-4 py-3 text-sm">
            {isRTL ? "جاري تحميل الملف..." : "Loading PDF..."}
          </div>
        </div>
      )}

      {pdfViewer && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between gap-2 p-3 bg-background border-b">
            <button
              onClick={() => {
                URL.revokeObjectURL(pdfViewer.downloadUrl);
                setPdfViewer(null);
              }}
              className="p-2 rounded-md hover:bg-muted flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium truncate flex-1 text-center">{pdfViewer.name}</span>
            <button
              onClick={async () => {
                try {
                  const { Capacitor } = await import("@capacitor/core");
                  if (Capacitor.isNativePlatform()) {
                    const base64 = pdfViewer.downloadUrl;
                    const res = await fetch(base64);
                    const blob = await res.blob();
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const b64 = (reader.result as string).split(",")[1];
                      const safeName = pdfViewer.name.replace(/[^\w.-]/g, "_");
                      const written = await Filesystem.writeFile({ path: safeName, data: b64, directory: Directory.Cache });
                      const { Share } = await import("@capacitor/share");
                      await Share.share({ title: pdfViewer.name, url: written.uri });
                    };
                    reader.readAsDataURL(blob);
                  } else {
                    const a = document.createElement("a");
                    a.href = pdfViewer.downloadUrl;
                    a.download = pdfViewer.name;
                    a.click();
                  }
                } catch {
                  toast.error(isRTL ? "تعذر مشاركة الملف" : "Could not share file");
                }
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground flex-shrink-0"
            >
              {isRTL ? "مشاركة" : "Share"}
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-neutral-900 p-2 space-y-2">
            {pdfViewer.pages.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`${isRTL ? "صفحة" : "Page"} ${i + 1}`}
                className="w-full h-auto bg-white rounded shadow"
              />
            ))}
          </div>
          <div className="bg-background border-t px-4 py-2 text-center text-xs text-muted-foreground">
            {isRTL ? `${pdfViewer.pages.length} صفحة` : `${pdfViewer.pages.length} page${pdfViewer.pages.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      )}

      {tests.length === 0 && !showForm ? (
        <EmptyState
          icon={<FlaskConical className="w-16 h-16" />}
          title={t.noLabTests}
          subtitle={t.addFirstLabTest}
          actionLabel={t.addLabTest}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="px-4 space-y-3 mt-4">
          {tests.length > 0 && !showForm && (
            <>
              {totalAbnormal > 0 && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-bold text-destructive">{totalAbnormal}</span>{" "}
                    {isRTL ? "نتيجة غير طبيعية عبر جميع التحاليل" : `abnormal result${totalAbnormal === 1 ? "" : "s"} across all tests`}
                  </p>
                </div>
              )}
              <div className="relative">
                <Search className="w-4 h-4 absolute top-3 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={isRTL ? "ابحث عن تحليل أو فحص..." : "Search tests or results..."}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "36px" }}
                />
              </div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                📋 {isRTL ? "التحاليل السابقة" : "Previous Tests"} ({filteredList.length}/{tests.length})
              </h2>
            </>
          )}

          {filteredList.map((test, index) => {
            const hasResults = savedResults[test.id] || allStoredResults[test.id];
            const testNumber = filteredList.length - index;
            const files = parseFiles(test.fileUrl);
            const imageFiles = files.filter(isImageFile);
            const pdfDataFiles = files.filter(isPdfData);
            const legacyPdfFiles = files.filter(isPdfLegacy);
            const hasImage = imageFiles.length > 0;

            return (
              <div key={test.id} className="bg-card rounded-3xl border-2 border-primary/30 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                          #{testNumber}
                        </span>
                        <h3 className="font-bold text-foreground">{test.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        📅 {format(new Date(test.date), "yyyy/MM/dd - hh:mm a")}
                      </p>
                      {test.notes && <p className="text-sm text-muted-foreground mt-1">📝 {test.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => openEdit(test)}
                        className="rounded-xl bg-primary text-primary-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                        <Pencil className="w-4 h-4" />
                        {isRTL ? "تعديل" : "Edit"}
                      </button>
                      <button onClick={() => setDeleteId(test.id)}
                        className="rounded-xl bg-summary-missed text-summary-missed-foreground py-2.5 px-5 font-semibold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                        {isRTL ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {hasImage && (
                      <button
                        onClick={() => setFullscreen({ images: imageFiles, index: 0 })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        {isRTL ? "عرض الصور" : "View Images"}
                        {imageFiles.length > 1 && ` (${imageFiles.length})`}
                      </button>
                    )}
                    {legacyPdfFiles.map((f, i) => (
                      <button
                        key={`legacy-${i}`}
                        onClick={() => toast.info(isRTL
                          ? "اضغط (تعديل) ثم أعد إرفاق الملف لتتمكن من فتحه"
                          : "Tap edit and re-attach the file to open it")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-accent transition-colors"
                      >
                        📄 {f.replace("pdf:", "")}
                      </button>
                    ))}
                    {pdfDataFiles.map((f, i) => (
                      <button
                        key={`pdf-${i}`}
                        onClick={() => openPdf(f)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        📄 {isRTL ? "فتح" : "Open"} {pdfDataName(f)}
                      </button>
                    ))}
                    {hasResults && (
                      <button
                        onClick={() => loadSavedResults(test.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        {showResults === test.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showResults === test.id ? (isRTL ? "إخفاء" : "Hide") : (isRTL ? "عرض النتائج" : "Results")}
                      </button>
                    )}
                    {(hasResults || hasImage) && (
                      <button
                        onClick={() => handlePrint(test)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        {isRTL ? "طباعة" : "Print"}
                      </button>
                    )}
                  </div>
                </div>

                {hasImage && (
                  imageFiles.length === 1 ? (
                    <div
                      className="relative cursor-pointer group border-t border-border"
                      onClick={() => setFullscreen({ images: imageFiles, index: 0 })}
                    >
                      <img
                        src={imageFiles[0]}
                        alt={test.name}
                        className="w-full max-h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 p-1 border-t border-border">
                      {imageFiles.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setFullscreen({ images: imageFiles, index: i })}
                          className="relative group aspect-square overflow-hidden rounded-lg"
                        >
                          <img src={img} alt={`${test.name} ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}

                {showResults === test.id && savedResults[test.id] && (
                  <div className="p-4 border-t border-border">
                    <ResultsView results={savedResults[test.id]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingId ? t.editLabTest : t.addLabTest}</h2>
              <button onClick={resetForm}>
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.testName} *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isRTL ? "مثال: CBC, فحص شامل" : "e.g. CBC, Lipid Panel"}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-base font-bold text-foreground block mb-2">
                📷 {isRTL ? "إرفاق صور/ملفات التحليل" : "Attach Lab Images/Files"}
                {attachedFiles.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground"> ({attachedFiles.length})</span>
                )}
              </label>

              {attachedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="relative rounded-xl border border-border overflow-hidden aspect-square bg-muted/30">
                      {isImageFile(file) ? (
                        <img
                          src={file}
                          alt={`attachment ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setFullscreen({ images: attachedFiles.filter(isImageFile), index: attachedFiles.filter(isImageFile).indexOf(file) })}
                        />
                      ) : (
                        <button
                          onClick={() => isPdfData(file) && openPdf(file)}
                          className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center"
                        >
                          <span className="text-2xl">📄</span>
                          <span className="text-[10px] font-medium text-foreground truncate w-full">
                            {isPdfData(file) ? pdfDataName(file) : file.replace("pdf:", "")}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={attaching}
                className="w-full border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
              >
                {attaching ? (
                  <p className="text-sm text-muted-foreground">{isRTL ? "جاري المعالجة..." : "Processing..."}</p>
                ) : (
                  <>
                    <Plus className="w-6 h-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {attachedFiles.length > 0
                        ? (isRTL ? "إضافة المزيد" : "Add more")
                        : (isRTL ? "اضغط لإرفاق صور (يمكن اختيار أكثر من صورة)" : "Tap to attach images (select multiple)")}
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP, PDF</p>
                  </>
                )}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileAttach}
                className="hidden"
              />
            </div>

            <div className="space-y-3">
              <label className="text-base font-bold text-foreground block">📝 {t.manualEntry}</label>

              {manualEntries.map((entry) => {
                const ref = labReferences.find((r) => r.name === entry.testName);
                const numVal = parseFloat(entry.value);
                const isOutOfRange = ref && !isNaN(numVal) && (numVal < ref.normalRange.min || numVal > ref.normalRange.max);

                return (
                  <div
                    key={entry.id}
                    className={`rounded-xl border p-3 ${isOutOfRange ? "border-destructive/30 bg-destructive/5" : "border-border bg-card/50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{entry.testName}</span>
                        {ref && (
                          <span className="text-xs text-muted-foreground">
                            ({ref.unit} • {ref.normalRange.min}-{ref.normalRange.max})
                          </span>
                        )}
                        {entry.isCustom && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{t.custom}</span>
                        )}
                      </div>
                      <button onClick={() => removeEntry(entry.id)} className="text-destructive/60 hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={entry.value}
                      onChange={(e) => updateEntryValue(entry.id, e.target.value)}
                      placeholder={t.enterValue}
                      className={`w-full px-3 py-2 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm ${isOutOfRange ? "border-destructive/40" : "border-border"}`}
                    />
                    {isOutOfRange && ref && (
                      <p className="text-xs text-destructive mt-1">
                        {numVal > ref.normalRange.max ? `⬆ ${t.aboveNormal}` : `⬇ ${t.belowNormal}`}
                      </p>
                    )}
                  </div>
                );
              })}

              {!showTestPicker ? (
                <button
                  onClick={() => setShowTestPicker(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                >
                  <Plus className="w-4 h-4" /> {t.addTestItem}
                </button>
              ) : (
                <div className="rounded-xl border border-border bg-card p-3 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute top-3 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
                    <input
                      value={testSearch}
                      onChange={(e) => setTestSearch(e.target.value)}
                      placeholder={t.searchTests}
                      autoFocus
                      className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "36px" }}
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {Object.entries(groupedTests).map(([category, refs]) => (
                      <div key={category}>
                        <p className="text-xs font-bold text-muted-foreground px-1 mb-1">{category}</p>
                        <div className="space-y-1">
                          {refs.map((ref) => (
                            <button
                              key={ref.name}
                              disabled={alreadyAdded.has(ref.name)}
                              onClick={() => addManualEntry(ref.name, false)}
                              className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${alreadyAdded.has(ref.name) ? "bg-muted text-muted-foreground opacity-50" : "hover:bg-primary/10 text-foreground"}`}
                            >
                              <span className="font-medium">{ref.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {ref.normalRange.min}-{ref.normalRange.max} {ref.unit}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-bold text-muted-foreground mb-2">{t.customTest}</p>
                    <div className="flex gap-2">
                      <input
                        value={customTestName}
                        onChange={(e) => setCustomTestName(e.target.value)}
                        placeholder={t.enterCustomTestName}
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                      />
                      <button
                        onClick={() => { if (customTestName.trim()) addManualEntry(customTestName.trim(), true); }}
                        disabled={!customTestName.trim()}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                      >
                        {t.add}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowTestPicker(false); setTestSearch(""); }}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t.cancel}
                  </button>
                </div>
              )}

              {manualResults.length > 0 && (
                <div className="bg-muted/50 rounded-xl p-4">
                  <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-primary" />
                    {t.analysisResults} ({manualResults.length} {t.testsFound})
                  </h3>
                  <ResultsView results={manualResults} />
                </div>
              )}
            </div>

            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.notes}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.notes + "..."}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                {t.save}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 py-3 rounded-2xl bg-muted text-foreground font-bold"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "حذف التحليل" : "Delete Lab Test"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل أنت متأكد من حذف هذا التحليل؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this lab test? This action cannot be undone."}
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
    </div>
  );
};

export default LabTestsPage;
