import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import ChipSelector from "@/components/ChipSelector";
import MedicationImageUpload from "@/components/MedicationImageUpload";
import { store } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { searchMedications, isKnownMedication } from "@/lib/medications-db";
import { scheduleMedicationNotifications } from "@/lib/notifications";
import type { Medication } from "@/types";

interface MedNameProps {
  name: string;
  setName: (v: string) => void;
  t: Record<string, string>;
}

const MedicationNameInput = ({ name, setName, t }: MedNameProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [checking, setChecking] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const showWarning = name.trim().length >= 3 && !isValid && !checking;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (name.trim().length < 2) {
      setIsValid(false);
      return;
    }
    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const valid = await isKnownMedication(name);
      setIsValid(valid);
      setChecking(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [name]);

  const handleChange = async (value: string) => {
    setName(value);
    if (value.length >= 2) {
      const results = await searchMedications(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="text-base font-bold text-foreground block mb-2">{t.medicationName} *</label>
      <div className="relative">
        <input
          value={name}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          placeholder="e.g. Panadol, Aspirin..."
          className={`w-full px-4 py-3 rounded-xl border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 pe-10 ${
            isValid
              ? "border-success focus:ring-success/30"
              : showWarning
                ? "border-warning focus:ring-warning/30"
                : "border-border focus:ring-ring"
          }`}
        />
        {isValid && <CheckCircle2 className="absolute top-1/2 -translate-y-1/2 end-3 w-5 h-5 text-success" />}
        {showWarning && <AlertCircle className="absolute top-1/2 -translate-y-1/2 end-3 w-5 h-5 text-warning" />}
      </div>

      {showWarning && (
        <p className="text-xs text-warning mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {t.medicationNotFound}
        </p>
      )}
      {isValid && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t.medicationVerified}
        </p>
      )}

      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((med) => (
            <button
              key={med}
              type="button"
              onClick={() => {
                setName(med);
                setShowSuggestions(false);
              }}
              className="w-full text-start px-4 py-2.5 text-foreground hover:bg-accent transition-colors first:rounded-t-xl last:rounded-b-xl text-sm"
            >
              {med}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AddMedicationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const editingMedication = editId ? store.getMedications().find((m) => m.id === editId) : null;

  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [name, setName] = useState("");
  const [form, setForm] = useState<Medication["form"]>("Pills");
  const [dosage, setDosage] = useState(1);
  const [frequency, setFrequency] = useState("Once daily");
  const [times, setTimes] = useState(["08:00"]);
  const [mealRelation, setMealRelation] = useState<Medication["mealRelation"]>("No preference");
  const [notes, setNotes] = useState("");
  const [stock, setStock] = useState(30);
  const [concentration, setConcentration] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isChronic, setIsChronic] = useState(true);
  const [durationDays, setDurationDays] = useState(7);
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('days');

  useEffect(() => {
    if (!editingMedication) return;
    setName(editingMedication.name);
    setForm(editingMedication.form);
    setDosage(editingMedication.dosage);
    setConcentration(editingMedication.concentration || "");
    setFrequency(editingMedication.frequency);
    setTimes(editingMedication.times);
    setStartDate(editingMedication.startDate || format(new Date(), "yyyy-MM-dd"));
    setMealRelation(editingMedication.mealRelation);
    setNotes(editingMedication.notes);
    setStock(editingMedication.stock);
    setImageUrl(editingMedication.imageUrl);
    setExpiryDate(editingMedication.expiryDate || "");
    setIsChronic(editingMedication.isChronic ?? true);
    if (editingMedication.durationDays) {
      if (editingMedication.durationDays % 30 === 0) {
        setDurationUnit('months');
        setDurationDays(editingMedication.durationDays / 30);
      } else if (editingMedication.durationDays % 7 === 0) {
        setDurationUnit('weeks');
        setDurationDays(editingMedication.durationDays / 7);
      } else {
        setDurationUnit('days');
        setDurationDays(editingMedication.durationDays);
      }
    }
  }, [editingMedication]);

  const formsMap: Record<string, string> = {
    Pills: t.pills,
    Capsules: t.capsules,
    Liquid: t.liquid,
    Injection: t.injection,
    Drops: t.drops,
    Cream: t.cream,
    Inhaler: t.inhaler,
    Patches: t.patches,
  };
  const formOptions = Object.keys(formsMap);
  const formLabels = Object.values(formsMap);

  const freqMap: Record<string, string> = {
    "Once daily": t.onceDaily,
    "Twice daily": t.twiceDaily,
    "Three times daily": t.threeTimesDaily,
    "Four times daily": t.fourTimesDaily,
    "Every X hours": t.everyXHours,
    "Specific days": t.specificDays,
    "Every week": t.everyWeek,
    "Every 2 weeks": t.every2Weeks,
    "Every month": t.everyMonth,
  };
  const freqOptions = Object.keys(freqMap);
  const freqLabels = Object.values(freqMap);

  const mealMap: Record<string, string> = {
    "No preference": t.noPreference,
    "Before meal": t.beforeMeal,
    "After meal": t.afterMeal,
    "With meal": t.withMeal,
  };
  const mealOptions = Object.keys(mealMap);
  const mealLabels = Object.values(mealMap);

  const stepLabels = [t.basicInfo, t.frequency, t.stock, t.confirm];

  const isNonDaily = ["Every week", "Every 2 weeks", "Every month"].includes(frequency);

  // Auto-adjust times array length based on frequency
  useEffect(() => {
    const defaults: Record<string, string[]> = {
      "Once daily": ["08:00"],
      "Twice daily": ["08:00", "20:00"],
      "Three times daily": ["08:00", "14:00", "20:00"],
      "Four times daily": ["08:00", "13:00", "18:00", "22:00"],
      "Every week": ["08:00"],
      "Every 2 weeks": ["08:00"],
      "Every month": ["08:00"],
    };
    const target = defaults[frequency];
    if (!target) return;
    setTimes((prev) => {
      if (prev.length === target.length) return prev;
      // Preserve user-entered times where possible, fill the rest from defaults
      const next = target.map((d, i) => prev[i] ?? d);
      return next;
    });
  }, [frequency]);

  const computedDurationDays = durationUnit === 'weeks' ? durationDays * 7 : durationUnit === 'months' ? durationDays * 30 : durationDays;

  const handleSave = async () => {
    const med: Medication = {
      id: editingMedication?.id || crypto.randomUUID(),
      name,
      form,
      dosage,
      concentration: concentration || undefined,
      frequency,
      times,
      startDate: isNonDaily ? startDate : undefined,
      isChronic,
      durationDays: isChronic ? undefined : computedDurationDays,
      mealRelation,
      notes,
      stock,
      initialStock: editingMedication?.initialStock || stock,
      imageUrl,
      expiryDate: expiryDate || undefined,
      createdAt: editingMedication?.createdAt || new Date().toISOString(),
    };
    await store.saveMedication(med);

    // If editing, remove old dose records for today so regeneration uses new times
    if (editingMedication) {
      const today = new Date().toISOString().slice(0, 10);
      await store.deleteDosesForMedDate(med.id, today);
    }

    try {
      await scheduleMedicationNotifications();
    } catch (err) {
      console.warn("Failed to schedule notifications:", err);
    }
    navigate("/medications");
  };
  const canNext = () => {
    if (step === 1) return name.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-background safe-top flex items-center px-4 pt-4 pb-2 border-b border-border/50 shadow-sm">
        <button onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))} className="text-foreground">
          <ArrowLeft className={`w-6 h-6 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-xl font-bold text-foreground mx-auto">{editingMedication ? (isRTL ? "تعديل الدواء" : "Edit Medication") : t.addMedication}</h1>
        <div className="w-6" />
      </div>

      <div className="px-4 mb-2">
        <div className="flex gap-2 mb-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {step}/{totalSteps} — {stepLabels[step - 1]}
        </p>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-5">
            <MedicationNameInput name={name} setName={setName} t={t} />
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.form}</label>
              <ChipSelector
                options={formLabels}
                value={formsMap[form]}
                onChange={(v) => {
                  const key = formOptions[formLabels.indexOf(v)];
                  setForm(key as Medication["form"]);
                }}
              />
            </div>
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.dosage}</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={dosage}
                  onChange={(e) => setDosage(Number(e.target.value))}
                  className="w-24 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground px-3 py-2 bg-accent rounded-lg">{formsMap[form]}</span>
              </div>
            </div>
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.concentration}</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-32 px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground px-3 py-2 bg-accent rounded-lg">{t.concentrationUnit}</span>
              </div>
            </div>
            <MedicationImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
            <div>
              <label className="text-base font-bold text-foreground block mb-2">
                {isRTL ? "تاريخ انتهاء الصلاحية (اختياري)" : "Expiry Date (optional)"}
              </label>
              <p className="text-sm text-muted-foreground mb-2">
                {isRTL ? "سيتم تنبيهك قبل 30 يوماً من الانتهاء" : "You'll be alerted 30 days before expiry"}
              </p>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.frequency}</label>
              <ChipSelector
                options={freqLabels}
                value={freqMap[frequency]}
                onChange={(v) => {
                  const key = freqOptions[freqLabels.indexOf(v)];
                  setFrequency(key);
                }}
              />
            </div>
            {isNonDaily && (
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.startDate}</label>
                <p className="text-sm text-muted-foreground mb-2">{t.startDateDesc}</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.times}</label>
              {times.map((tVal, i) => (
                <input
                  key={i}
                  type="time"
                  value={tVal}
                  onChange={(e) => {
                    const n = [...times];
                    n[i] = e.target.value;
                    setTimes(n);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground mb-2 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ))}
            </div>
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.mealRelation}</label>
              <ChipSelector
                options={mealLabels}
                value={mealMap[mealRelation]}
                onChange={(v) => {
                  const key = mealOptions[mealLabels.indexOf(v)];
                  setMealRelation(key as Medication["mealRelation"]);
                }}
              />
            </div>
            {/* Chronic / Temporary */}
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.usageType}</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsChronic(true)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${isChronic ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {t.chronic}
                </button>
                <button
                  type="button"
                  onClick={() => setIsChronic(false)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${!isChronic ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
                >
                  {t.temporary}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{isChronic ? t.chronicDesc : t.temporaryDesc}</p>
            </div>
            {!isChronic && (
              <div>
                <label className="text-base font-bold text-foreground block mb-2">{t.duration}</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-24 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-1">
                    {(['days', 'weeks', 'months'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setDurationUnit(u)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${durationUnit === u ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}
                      >
                        {t[u]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="text-base font-bold text-foreground block mb-2">{t.currentStock}</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground px-3 py-2 bg-accent rounded-lg">{formsMap[form]}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{t.stockAlert}</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-foreground text-center mb-6">{t.confirm}</h2>
            {imageUrl && (
              <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 border border-border">
                <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">{t.medicationName}</span><span className="font-bold text-foreground flex items-center gap-1">{name} <Check className="w-4 h-4 text-primary" /></span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.form}</span><span className="font-bold text-foreground">{formsMap[form]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.dosage}</span><span className="font-bold text-foreground">{dosage} {formsMap[form]}</span></div>
              {concentration && <div className="flex justify-between"><span className="text-muted-foreground">{t.concentration}</span><span className="font-bold text-foreground">{concentration} {t.concentrationUnit}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">{t.frequency}</span><span className="font-bold text-foreground">{freqMap[frequency]}</span></div>
              {isNonDaily && <div className="flex justify-between"><span className="text-muted-foreground">{t.startDate}</span><span className="font-bold text-foreground">{startDate}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">{t.times}</span><span className="font-bold text-foreground">{times.join(", ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.usageType}</span><span className="font-bold text-foreground">{isChronic ? t.chronic : `${t.temporary} — ${durationDays} ${t[durationUnit]}`}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.stock}</span><span className="font-bold text-foreground">{stock} {formsMap[form]}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-6 pt-2 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-4 rounded-2xl border border-border bg-card text-foreground font-bold text-lg"
          >
            {t.previous}
          </button>
        )}
        <button
          onClick={() => (step < totalSteps ? setStep(step + 1) : handleSave())}
          disabled={!canNext()}
          className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-50"
        >
          {step < totalSteps ? t.next : t.save}
        </button>
      </div>
    </div>
  );
};

export default AddMedicationPage;
