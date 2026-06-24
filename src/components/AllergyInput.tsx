import { useState, useRef, useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { searchMedications, isKnownMedication } from "@/lib/medications-db";

interface AllergyInputProps {
  value: string;
  onChange: (value: string) => void;
  isRTL: boolean;
}

// Parse the stored comma-separated string into individual allergy names.
const parseChips = (value: string): string[] =>
  value
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);

const AllergyInput = ({ value, onChange, isRTL }: AllergyInputProps) => {
  const chips = parseChips(value);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [checking, setChecking] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const showWarning = text.trim().length >= 3 && !isValid && !checking;

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
    if (text.trim().length < 2) {
      setIsValid(false);
      return;
    }
    setChecking(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const valid = await isKnownMedication(text);
      setIsValid(valid);
      setChecking(false);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [text]);

  const handleChange = async (val: string) => {
    setText(val);
    if (val.length >= 2) {
      const results = await searchMedications(val);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const addChip = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    // Avoid duplicates (case-insensitive)
    if (chips.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setText("");
      setShowSuggestions(false);
      return;
    }
    const next = [...chips, clean];
    onChange(next.join("، "));
    setText("");
    setSuggestions([]);
    setShowSuggestions(false);
    setIsValid(false);
  };

  const removeChip = (name: string) => {
    onChange(chips.filter((c) => c !== name).join("، "));
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Existing allergy chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full px-3 py-1.5 text-sm font-medium"
            >
              {chip}
              <button type="button" onClick={() => removeChip(chip)} aria-label="remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (text.trim()) addChip(text);
            }
          }}
          placeholder={isRTL ? "اكتب اسم الدواء ثم اختر من القائمة" : "Type a medication name, then pick from list"}
          className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 pe-10 ${
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
          {isRTL ? "لم يتم العثور على هذا الدواء — تحقق من الاسم" : "Medication not found — check the name"}
        </p>
      )}
      {isValid && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {isRTL ? "دواء معروف — اضغط Enter أو اختر من القائمة للإضافة" : "Known medication — press Enter or pick from list to add"}
        </p>
      )}

      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((med) => (
            <button
              key={med}
              type="button"
              onClick={() => addChip(med)}
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

export default AllergyInput;
