import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import PageHeader from "@/components/PageHeader";
import { Share2, FileText, Shield, Mail, Info, LogOut, LogIn, ChevronRight, ChevronLeft, ChevronDown, Check, Moon, Sun, Trash2, MessageCircle, Send, Copy, X, MapPin, Globe, Smartphone, User, Bell, Languages } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { store } from "@/lib/store";
import ChipSelector from "@/components/ChipSelector";
import AllergyInput from "@/components/AllergyInput";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { requestNotificationPermission, scheduleMedicationNotifications, getPermissionStatus } from "@/lib/notifications";

import { toast } from "sonner";
import type { AppSettings } from "@/types";

const SettingsPage = ({ onSwitchToAuth }: { onSwitchToAuth?: () => void }) => {
  const navigate = useNavigate();
  const { t, lang, setLang, isRTL } = useLanguage();
  const { logOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(store.getSettings());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [diseaseDropdownOpen, setDiseaseDropdownOpen] = useState(false);
  const [bloodTypeDropdownOpen, setBloodTypeDropdownOpen] = useState(false);
  

  // Local draft for the profile dialog; saved only when the user presses Save
  const [draftProfile, setDraftProfile] = useState<AppSettings>(settings);
  useEffect(() => {
    if (profileOpen) setDraftProfile(settings);
  }, [profileOpen, settings]);

  const diseaseOptions = [
    { key: "diabetes", ar: "السكري", en: "Diabetes" },
    { key: "hypertension", ar: "ضغط الدم", en: "Hypertension" },
    { key: "cholesterol", ar: "الكوليسترول", en: "Cholesterol" },
    { key: "heart", ar: "القلب", en: "Heart Disease" },
    { key: "asthma", ar: "الربو", en: "Asthma" },
    { key: "thyroid", ar: "الغدة الدرقية", en: "Thyroid" },
    { key: "kidney", ar: "الكلى", en: "Kidney" },
    { key: "liver", ar: "الكبد", en: "Liver" },
    { key: "rheumatism", ar: "الروماتيزم", en: "Rheumatism" },
    { key: "anemia", ar: "فقر الدم", en: "Anemia" },
  ];
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const saveProfile = () => {
    update(draftProfile);
    setProfileOpen(false);
    toast.success(isRTL ? "تم حفظ بيانات المستخدم" : "Profile saved");
  };

  const SHARE_URL = "https://dawaaplus.net";
  const APP_STORE_URL = "https://apps.apple.com/app/dawaa-plus/id6759831259";
  const SHARE_TEXT = isRTL
    ? "جرب تطبيق دواء+ لإدارة أدويتك وصحتك"
    : "Try dawaa+ app to manage your medications and health";

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      // Clear local data
      try {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.clear();
      } catch {
        localStorage.clear();
      }
      toast.success(t.deleteAccountSuccess);
      await logOut().catch(() => {});
      window.location.href = "/auth";
    } catch (e) {
      toast.error(t.deleteAccountError);
      setDeleting(false);
    }
  };

  const update = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await store.saveSettings(next);
    if (
      partial.notifications !== undefined ||
      partial.reminderBefore !== undefined ||
      partial.bpReminders !== undefined ||
      partial.bpCustomTimes !== undefined ||
      partial.bloodSugarReminders !== undefined ||
      partial.bloodSugarCustomTimes !== undefined
    ) {
      if (next.notifications) {
        const granted = await requestNotificationPermission();
        if (granted) {
          const count = await scheduleMedicationNotifications();
          toast.success(isRTL ? `تم تفعيل التنبيهات (${count} تنبيه مجدول)` : `Notifications enabled (${count} scheduled)`);
        } else {
          toast.error(isRTL ? 'يرجى السماح بالتنبيهات من الإعدادات' : 'Please allow notifications in settings');
          setSettings({ ...next, notifications: false });
          store.saveSettings({ ...next, notifications: false });
        }
      } else {
        await scheduleMedicationNotifications();
      }
    }
  };

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const handleShareApp = () => {
    setShareOpen(true);
  };

  const shareWithSystem = async (url: string, text: string) => {
    const title = "dawaa+";
    setShareOpen(false);
    try {
      const { Share } = await import("@capacitor/share");
      const can = await Share.canShare();
      if (can.value) {
        await Share.share({ title, text, url, dialogTitle: title });
        return;
      }
    } catch {
      /* not in native app */
    }
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      /* user cancelled */
    }
    // Fallback: reopen modal so user can use link options
    setShareOpen(true);
  };

  const shareWebLink = () => shareWithSystem(SHARE_URL, SHARE_TEXT);
  const shareAppStoreLink = () =>
    shareWithSystem(
      APP_STORE_URL,
      isRTL
        ? `${SHARE_TEXT}\nحمّل التطبيق من متجر آبل:`
        : `${SHARE_TEXT}\nDownload from the App Store:`
    );




  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast.success(isRTL ? "تم نسخ الرابط" : "Link copied!");
    } catch {
      toast.error(isRTL ? "تعذر النسخ" : "Copy failed");
    }
  };



  const menuItems = [
    
    { icon: Share2, label: t.shareApp, action: handleShareApp },
  ];

  const aboutItems = [
    { icon: FileText, label: t.termsOfUse, path: "/terms" },
    { icon: Shield, label: t.privacyPolicy, path: "/privacy" },
    { icon: Mail, label: t.contactUs, action: () => navigate("/contact") },
    { icon: Info, label: t.version, value: "1.0.9" },
  ];

  const reminderMap: Record<string, string> = {
    "0": t.atTime, "5": t.min5, "10": t.min10, "15": t.min15, "30": t.min30, "60": t.min60,
  };
  const reminderKeys = Object.keys(reminderMap);
  const reminderLabels = Object.values(reminderMap);

  if (showAuthOverlay) {
    return <AuthPage onSkip={() => setShowAuthOverlay(false)} onSignedIn={() => setShowAuthOverlay(false)} />;
  }

  return (
    <div className="pb-28 pt-header overflow-x-hidden">
      <PageHeader title={t.settings} showBack />

      <div className="px-4 space-y-4">
        {(() => {
          const profileFilled = [
            settings.userName,
            settings.dateOfBirth,
            settings.bloodType,
            settings.allergies,
            (settings.chronicDiseases || []).length > 0 ? "1" : "",
            settings.customDiseases,
            settings.emergencyContact?.name,
            settings.emergencyContact?.phone,
          ].filter(Boolean).length;
          const profileTotal = 8;
          const totalNotifs = 3;
          const activeNotifs = [settings.notifications, settings.bpReminders, settings.bloodSugarReminders].filter(Boolean).length;
          const notifSummary = activeNotifs === totalNotifs
            ? t.enabled
            : activeNotifs === 0
              ? t.disabled
              : `${activeNotifs}/${totalNotifs} ${isRTL ? "مفعّلة" : "On"}`;
          const rows = [
            { icon: Languages, label: t.language, value: lang === "ar" ? "العربية" : "English", onClick: () => setLanguageOpen(true) },
            { icon: theme === "dark" ? Moon : Sun, label: t.theme, value: theme === "dark" ? t.darkMode : t.lightMode, onClick: () => setThemeOpen(true) },
            { icon: User, label: isRTL ? "بيانات المستخدم" : "User Profile", value: `${profileFilled}/${profileTotal} ${isRTL ? "حقول" : "fields"}`, onClick: () => setProfileOpen(true) },
            { icon: Bell, label: t.notifications, value: notifSummary, onClick: () => setNotificationsOpen(true) },
          ];
          return (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              {rows.map((row) => (
                <button key={row.label} onClick={row.onClick}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <row.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{row.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.value}</p>
                    </div>
                  </div>
                  <Chevron className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          );
        })()}

        {/* Account info row (read-only) */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{isRTL ? "الحساب الحالي" : "Current account"}</p>
            {user ? (
              <p className="text-sm font-bold text-foreground truncate" dir="ltr">{user.email}</p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">{isRTL ? "وضع الضيف (بدون حساب)" : "Guest mode (no account)"}</p>
            )}
          </div>
        </div>

        {/* Login button shown directly under account row for guest users */}
        {!user && (
          <button onClick={() => navigate("/auth", { state: { fromSettings: true } })}
            className="bg-card rounded-2xl border border-primary w-full flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <LogIn className="w-5 h-5 text-primary" />
              <span className="text-primary font-bold">{isRTL ? "تسجيل الدخول للمزامنة" : "Sign in to sync"}</span>
            </div>
            <Chevron className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Language Dialog */}
        <Dialog open={languageOpen} onOpenChange={setLanguageOpen}>
          <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader><DialogTitle>{t.language}</DialogTitle></DialogHeader>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setLang("ar"); update({ language: "ar" }); setLanguageOpen(false); }}
                className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors ${lang === "ar" ? "border-primary bg-chip-active text-chip-active-foreground" : "border-border bg-chip text-chip-foreground"}`}>
                العربية
              </button>
              <button onClick={() => { setLang("en"); update({ language: "en" }); setLanguageOpen(false); }}
                className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors ${lang === "en" ? "border-primary bg-chip-active text-chip-active-foreground" : "border-border bg-chip text-chip-foreground"}`}>
                English
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Theme Dialog */}
        <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
          <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader><DialogTitle>{t.theme}</DialogTitle></DialogHeader>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                <p className="text-sm text-muted-foreground">{theme === "dark" ? t.darkMode : t.lightMode}</p>
              </div>
              <button onClick={toggleTheme}
                className={`w-12 h-7 rounded-full transition-colors relative ${theme === "dark" ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${theme === "dark" ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Profile Dialog */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
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

              <div className="pt-4 border-t border-border space-y-3">
                <div>
                  <h4 className="font-bold text-foreground flex items-center gap-2">🆘 {isRTL ? "جهة اتصال الطوارئ" : "Emergency Contact"}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL ? "بيانات أقرب شخص للاتصال به وقت الطوارئ — ستُستخدم في ميزة SOS وفي حال تفويت جرعتين متتاليتين." : "Closest person to contact in an emergency — used by the SOS feature and after 2 consecutive missed doses."}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "الاسم وصلة القرابة" : "Name & Relation"}</label>
                  <input value={draftProfile.emergencyContact?.name || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, emergencyContact: { name: e.target.value, phone: draftProfile.emergencyContact?.phone || "", method: draftProfile.emergencyContact?.method || "whatsapp" } })}
                    placeholder={isRTL ? "مثال: أحمد - الابن" : "e.g. Ahmed - Son"}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "رقم الهاتف (مع رمز الدولة)" : "Phone (with country code)"}</label>
                  <input type="tel" dir="ltr" value={draftProfile.emergencyContact?.phone || ""}
                    onChange={(e) => setDraftProfile({ ...draftProfile, emergencyContact: { name: draftProfile.emergencyContact?.name || "", phone: e.target.value, method: draftProfile.emergencyContact?.method || "whatsapp" } })}
                    placeholder="+966XXXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">{isRTL ? "طريقة التواصل" : "Contact Method"}</label>
                  <div className="flex gap-2">
                    {(["whatsapp", "sms"] as const).map((m) => {
                      const selected = (draftProfile.emergencyContact?.method || "whatsapp") === m;
                      return (
                        <button key={m} type="button"
                          onClick={() => setDraftProfile({ ...draftProfile, emergencyContact: { name: draftProfile.emergencyContact?.name || "", phone: draftProfile.emergencyContact?.phone || "", method: m } })}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${selected ? "border-primary bg-chip-active text-chip-active-foreground" : "border-border bg-chip text-chip-foreground"}`}>
                          {m === "whatsapp" ? "WhatsApp" : "SMS"}
                        </button>
                      );
                    })}
                  </div>
                </div>
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

        {/* Notifications Dialog */}
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader><DialogTitle>🔔 {t.notifications}</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-2">
              {/* Medication reminders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">💊 {t.medicationReminders}</p>
                    <p className="text-sm text-muted-foreground">{t.medicationRemindersDesc}</p>
                  </div>
                  <button onClick={() => update({ notifications: !settings.notifications })}
                    className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${settings.notifications ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${settings.notifications ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
                  </button>
                </div>
                {settings.notifications && (
                  <div className="pt-3 border-t border-border">
                    <label className="text-sm font-semibold text-foreground block mb-3">{t.reminderBefore}</label>
                    <ChipSelector options={reminderLabels} value={reminderMap[settings.reminderBefore] || settings.reminderBefore}
                      onChange={(v) => update({ reminderBefore: reminderKeys[reminderLabels.indexOf(v)] || v })} />
                  </div>
                )}
              </div>

              {/* Blood pressure reminders */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">❤️‍🩹 {t.bpReminders}</p>
                    <p className="text-sm text-muted-foreground">{t.bpRemindersDesc}</p>
                  </div>
                  <button onClick={() => {
                      const enabling = !settings.bpReminders;
                      const patch: Partial<AppSettings> = { bpReminders: enabling };
                      if (enabling && (!settings.bpCustomTimes || settings.bpCustomTimes.length === 0)) {
                        patch.bpCustomTimes = ['10:00', '21:00'];
                      }
                      update(patch);
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${settings.bpReminders ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${settings.bpReminders ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
                  </button>
                </div>
                {settings.bpReminders && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.bpCustomTimes}</p>
                      <p className="text-xs text-muted-foreground">{t.bpCustomTimesDesc}</p>
                    </div>
                    <div className="space-y-2">
                      {(settings.bpCustomTimes || []).map((time, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="time" value={time}
                            onChange={(e) => {
                              const next = [...(settings.bpCustomTimes || [])];
                              next[idx] = e.target.value;
                              update({ bpCustomTimes: next });
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                          <button onClick={() => {
                              const next = (settings.bpCustomTimes || []).filter((_, i) => i !== idx);
                              update({ bpCustomTimes: next });
                            }}
                            className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
                            aria-label="remove">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { const next = [...(settings.bpCustomTimes || []), "08:00"]; update({ bpCustomTimes: next }); }}
                      className="w-full py-2.5 rounded-xl border border-dashed border-primary/50 text-primary font-semibold text-sm">
                      + {t.addTime}
                    </button>
                  </div>
                )}
              </div>

              {/* Blood sugar reminders */}
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">🩸 {t.bloodSugarReminders}</p>
                    <p className="text-sm text-muted-foreground">{t.bloodSugarRemindersDesc}</p>
                  </div>
                  <button onClick={() => {
                      const enabling = !settings.bloodSugarReminders;
                      const patch: Partial<AppSettings> = { bloodSugarReminders: enabling };
                      if (enabling && (!settings.bloodSugarCustomTimes || settings.bloodSugarCustomTimes.length === 0)) {
                        patch.bloodSugarCustomTimes = ['08:00', '21:00'];
                      }
                      update(patch);
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${settings.bloodSugarReminders ? "bg-primary" : "bg-border"}`}>
                    <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${settings.bloodSugarReminders ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
                  </button>
                </div>
                {settings.bloodSugarReminders && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.bloodSugarCustomTimes}</p>
                      <p className="text-xs text-muted-foreground">{t.bloodSugarCustomTimesDesc}</p>
                    </div>
                    <div className="space-y-2">
                      {(settings.bloodSugarCustomTimes || []).map((time, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="time" value={time}
                            onChange={(e) => {
                              const next = [...(settings.bloodSugarCustomTimes || [])];
                              next[idx] = e.target.value;
                              update({ bloodSugarCustomTimes: next });
                            }}
                            className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                          <button onClick={() => {
                              const next = (settings.bloodSugarCustomTimes || []).filter((_, i) => i !== idx);
                              update({ bloodSugarCustomTimes: next });
                            }}
                            className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"
                            aria-label="remove">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { const next = [...(settings.bloodSugarCustomTimes || []), "08:00"]; update({ bloodSugarCustomTimes: next }); }}
                      className="w-full py-2.5 rounded-xl border border-dashed border-primary/50 text-primary font-semibold text-sm">
                      + {t.addTime}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>






        {/* Menu Items */}
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {menuItems.map((item) => (
            <button key={item.label} onClick={() => item.action ? item.action() : null}
              className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">{item.label}</span>
              </div>
              <Chevron className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* About */}
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          <div className="px-5 py-3"><h3 className="font-bold text-foreground">{t.about}</h3></div>
          {aboutItems.map((item) => (
            <button key={item.label} onClick={() => { if (item.action) item.action(); else if (item.path) navigate(item.path); }}
              className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">{item.label}</span>
              </div>
              {item.value ? <span className="text-muted-foreground">{item.value}</span> : <Chevron className="w-5 h-5 text-muted-foreground" />}
            </button>
          ))}
        </div>


        {user && (
          <button onClick={() => setSignOutConfirm(true)}
            className="bg-card rounded-2xl border border-border w-full flex items-center justify-between px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="text-destructive font-medium">{t.signOut}</span>
            </div>
            <Chevron className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Delete account (required by Apple App Store guideline 5.1.1(v)) */}
        {user && (
          <button onClick={() => { setDeleteConfirm(true); setDeleteInput(""); }}
            className="bg-card rounded-2xl border border-destructive/30 w-full flex items-center justify-between px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-destructive font-medium">{t.deleteAccount}</span>
            </div>
            <Chevron className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Share app modal - unified */}
      {shareOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
          dir={isRTL ? "rtl" : "ltr"}
          onClick={() => setShareOpen(false)}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-md p-6 space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{t.shareApp}</h2>
              <button
                onClick={() => setShareOpen(false)}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-border"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">{SHARE_TEXT}</p>

            {/* Two clear options: web page vs App Store */}
            <div className="space-y-3">
              <button
                onClick={shareWebLink}
                className="w-full rounded-2xl border border-border bg-muted/40 hover:bg-muted transition-colors p-4 flex items-center gap-3 text-start"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">
                    {isRTL ? "مشاركة رابط الموقع" : "Share website link"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    {SHARE_URL}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isRTL ? "يفتح كصفحة ويب على أي جهاز" : "Opens as a web page on any device"}
                  </p>
                </div>
                <Chevron className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>

              <button
                onClick={shareAppStoreLink}
                className="w-full rounded-2xl border border-border bg-muted/40 hover:bg-muted transition-colors p-4 flex items-center gap-3 text-start"
              >
                <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">
                    {isRTL ? "مشاركة التطبيق من متجر آبل" : "Share App Store link"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? "للتثبيت على iPhone و iPad مباشرة" : "Install directly on iPhone & iPad"}
                  </p>
                </div>
                <Chevron className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                {isRTL ? "أو شارك رابط الموقع عبر" : "Or share website link via"}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(SHARE_URL)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted hover:bg-border transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">WhatsApp</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShareOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted hover:bg-border transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-foreground">Telegram</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent("dawaa+")}&body=${encodeURIComponent(SHARE_URL)}`}
                onClick={() => setShareOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted hover:bg-border transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground">{isRTL ? "بريد" : "Email"}</span>
              </a>

              <button
                onClick={() => { copyLink(); setShareOpen(false); }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted hover:bg-border transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-foreground/80 flex items-center justify-center">
                  <Copy className="w-6 h-6 text-background" />
                </div>
                <span className="text-xs font-medium text-foreground">{isRTL ? "نسخ" : "Copy"}</span>
              </button>
            </div>


          </div>
        </div>
      )}

      {/* Delete account confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4" dir={isRTL ? "rtl" : "ltr"}>
          <div className="bg-card rounded-3xl w-full max-w-md p-6 space-y-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{t.deleteAccountConfirmTitle}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t.deleteAccountConfirmBody}</p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={t.typeDeleteToConfirm}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-muted text-foreground font-bold disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !(deleteInput.trim().toUpperCase() === "DELETE" || deleteInput.trim() === "حذف")}
                className="flex-1 py-3 rounded-2xl bg-destructive text-destructive-foreground font-bold disabled:opacity-50 flex items-center justify-center"
              >
                {deleting ? <div className="w-5 h-5 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" /> : t.deleteAccount}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={signOutConfirm} onOpenChange={setSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "تسجيل الخروج" : "Sign Out"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL ? "هل تريد تسجيل الخروج من حسابك؟" : "Do you want to sign out of your account?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await logOut(); navigate("/auth", { replace: true }); }}>
              {isRTL ? "تسجيل الخروج" : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
