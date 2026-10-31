import { useEffect, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const UserProfileDialog = ({ open, onOpenChange, onSaved }: Props) => {
  const { t, isRTL } = useLanguage();
  const [diseaseDropdownOpen, setDiseaseDropdownOpen] = useState(false);
  const [bloodTypeDropdownOpen, setBloodTypeDropdownOpen] = useState(false);
  // Local draft; saved only when the user presses Save
  const [draftProfile, setDraftProfile] = useState<AppSettings>(store.getSettings());
  useEffect(() => {
    if (open) setDraftProfile(store.getSettings());
  }, [open]);

  const saveProfile = async () => {
    // Merge onto the latest stored settings so other preferences are kept
    const next: AppSettings = { ...store.getSettings(), ...draftProfile };
    await store.saveSettings(next);
    onSaved?.(next);
    onOpenChange(false);
    toast.success(isRTL ? "تم حفظ بيانات المستخدم" : "Profile saved");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader><DialogTitle>{isRTL ? "بيانات المستخدم" : "User Profile"}</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{t.userName}</label>
            <input value={draftProfile.userName} onChange={(e) => setDraftProfile({ ...draftProfile, userName: e.target.value })}
              placeholder={isRTL ? "الاسم الكامل..." : "Full name..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "تاريخ الميلاد" : "Date of Birth"}</label>
            <input type="date" value={draftProfile.dateOfBirth || ""} onChange={(e) => setDraftProfile({ ...draftProfile, dateOfBirth: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "الحساسية من أدوية" : "Drug Allergies"}</label>
            <p className="text-xs text-muted-foreground mb-2">
              {isRTL ? "اذكر أي دواء تعاني من حساسية تجاهه (مثل: بنسلين، أسبرين)" : "List any medications you are allergic to (e.g. Penicillin, Aspirin)"}
            </p>
            <AllergyInput
              value={draftProfile.allergies || ""}
              onChange={(v) => setDraftProfile({ ...draftProfile, allergies: v })}
              isRTL={isRTL}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "الأمراض المزمنة" : "Chronic Diseases"}</label>
            <p className="text-xs text-muted-foreground mb-2">{isRTL ? "اختر من القائمة الأمراض التي تعاني منها" : "Select any conditions you have"}</p>
            <button
              type="button"
              onClick={() => setDiseaseDropdownOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="truncate">
                {(draftProfile.chronicDiseases || []).length > 0
                  ? (isRTL ? "تم اختيار " : "Selected ") + (draftProfile.chronicDiseases || []).length + (isRTL ? " مرض" : " conditions")
                  : (isRTL ? "اختر من القائمة" : "Select from list")}
              </span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              {isRTL
                ? "الاختيارات الحالية: " + (draftProfile.chronicDiseases || []).map((k) => diseaseOptions.find((d) => d.key === k)?.ar || k).join(", ")
                : "Selected: " + (draftProfile.chronicDiseases || []).map((k) => diseaseOptions.find((d) => d.key === k)?.en || k).join(", ")}
            </p>
            <Dialog open={diseaseDropdownOpen} onOpenChange={setDiseaseDropdownOpen}>
              <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
                <DialogHeader><DialogTitle>{isRTL ? "الأمراض المزمنة" : "Chronic Diseases"}</DialogTitle></DialogHeader>
                <div className="space-y-2 pt-2">
                  {diseaseOptions.map((d) => {
                    const selected = (draftProfile.chronicDiseases || []).includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? (draftProfile.chronicDiseases || []).filter((k) => k !== d.key)
                            : [...(draftProfile.chronicDiseases || []), d.key];
                          setDraftProfile({ ...draftProfile, chronicDiseases: next });
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-start transition-colors ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground"}`}
                      >
                        <span>{isRTL ? d.ar : d.en}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                          {selected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "فصيلة الدم" : "Blood Type"}</label>
            <button
              type="button"
              onClick={() => setBloodTypeDropdownOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <span className="truncate">{draftProfile.bloodType || (isRTL ? "اختر فصيلة الدم" : "Select blood type")}</span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </button>
            <Dialog open={bloodTypeDropdownOpen} onOpenChange={setBloodTypeDropdownOpen}>
              <DialogContent className="max-w-sm" dir={isRTL ? "rtl" : "ltr"}>
                <DialogHeader><DialogTitle>{isRTL ? "فصيلة الدم" : "Blood Type"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {bloodTypes.map((bt) => {
                    const selected = draftProfile.bloodType === bt;
                    return (
                      <button
                        key={bt}
                        type="button"
                        onClick={() => { setDraftProfile({ ...draftProfile, bloodType: bt }); setBloodTypeDropdownOpen(false); }}
                        className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground"}`}
                      >
                        {bt}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => { setDraftProfile({ ...draftProfile, bloodType: undefined }); setBloodTypeDropdownOpen(false); }}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-colors ${!draftProfile.bloodType ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground"}`}
                  >
                    {isRTL ? "غير محدد" : "Not set"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "أمراض أخرى (تخصيص)" : "Other Conditions (custom)"}</label>
            <p className="text-xs text-muted-foreground mb-2">{isRTL ? "اكتب أي مرض خاص غير موجود في القائمة" : "Write any condition not listed above"}</p>
            <textarea value={draftProfile.customDiseases || ""} onChange={(e) => setDraftProfile({ ...draftProfile, customDiseases: e.target.value })}
              placeholder={isRTL ? "اكتب هنا..." : "Write here..."} rows={2}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <button
            onClick={saveProfile}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold mt-2"
          >
            {isRTL ? "حفظ" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
