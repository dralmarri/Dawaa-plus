import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import AllergyInput from "@/components/AllergyInput";
import { store } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { AppSettings } from "@/types";
import { diseaseOptions, bloodTypes } from "@/lib/profile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: AppSettings) => void;
}

const fieldClass =
  "w-full bg-card border border-border rounded-2xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
const labelClass = "block text-sm font-bold text-foreground mb-2";

/** Bottom sheet for editing the user's health profile. */
const UserProfileDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const { isRTL } = useLanguage();
  // Local draft; saved only when the user presses Save
  const [draft, setDraft] = useState<AppSettings>(store.getSettings());
  useEffect(() => {
    if (open) setDraft(store.getSettings());
  }, [open]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  const save = async () => {
    // Merge onto the latest stored settings so other preferences are kept
    const next: AppSettings = { ...store.getSettings(), ...draft };
    await store.saveSettings(next);
    onSaved?.(next);
    close();
    toast.success(isRTL ? "تم حفظ الملف الصحي" : "Health profile saved");
  };

  const toggleDisease = (key: string) => {
    const current = draft.chronicDiseases || [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setDraft({ ...draft, chronicDiseases: next });
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-foreground/50 z-[60] flex items-end justify-center overflow-hidden"
      onClick={close}
    >
      <div
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full max-w-lg max-h-[92vh] bg-background rounded-t-[32px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-foreground">
            {isRTL ? "تعديل الملف الصحي" : "Edit Health Profile"}
          </h2>
          <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors p-1" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{isRTL ? "الاسم" : "Name"}</label>
              <input
                value={draft.userName}
                onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                placeholder={isRTL ? "الاسم الكامل..." : "Full name..."}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</label>
              <input
                type="date"
                value={draft.dateOfBirth || ""}
                onChange={(e) => setDraft({ ...draft, dateOfBirth: e.target.value })}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>{isRTL ? "فصيلة الدم" : "Blood Type"}</label>
              <div className="relative">
                <select
                  value={draft.bloodType || ""}
                  onChange={(e) => setDraft({ ...draft, bloodType: e.target.value || undefined })}
                  className={`${fieldClass} appearance-none`}
                  // ltr keeps "O+" from being mirrored to "+O" by Arabic text direction
                  dir="ltr"
                  style={isRTL
                    ? { textAlign: "right", paddingLeft: "2.5rem" }
                    : { textAlign: "left", paddingRight: "2.5rem" }}
                >
                  <option value="">{isRTL ? "غير محدد" : "Not set"}</option>
                  {bloodTypes.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 end-4 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{isRTL ? "الحساسية من الأدوية" : "Drug Allergies"}</label>
            <AllergyInput
              value={draft.allergies || ""}
              onChange={(v) => setDraft({ ...draft, allergies: v })}
              isRTL={isRTL}
            />
          </div>

          <div>
            <label className={labelClass}>{isRTL ? "الأمراض المزمنة" : "Chronic Conditions"}</label>
            <div className="grid grid-cols-2 gap-2">
              {diseaseOptions.map((d) => {
                const selected = (draft.chronicDiseases || []).includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDisease(d.key)}
                    className={`p-3 rounded-2xl text-xs flex items-center justify-between gap-2 transition-colors text-start ${
                      selected
                        ? "border-2 border-primary bg-primary/5 text-primary font-bold"
                        : "border border-border bg-card text-muted-foreground font-medium hover:border-primary"
                    }`}
                  >
                    <span className="truncate">{isRTL ? d.ar : d.en}</span>
                    {selected && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>{isRTL ? "أمراض أخرى" : "Other Conditions"}</label>
            <textarea
              rows={3}
              value={draft.customDiseases || ""}
              onChange={(e) => setDraft({ ...draft, customDiseases: e.target.value })}
              placeholder={isRTL ? "اكتب هنا أي أمراض أخرى..." : "Write any other conditions here..."}
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>

        {/* Save */}
        <div className="shrink-0 px-6 pt-4 bg-card border-t border-border pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <button
            onClick={save}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          >
            {isRTL ? "حفظ التعديلات" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserProfileDialog;
