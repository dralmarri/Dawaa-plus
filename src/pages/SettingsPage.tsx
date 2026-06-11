import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, FileText, Shield, Mail, Info, LogOut, LogIn, ChevronRight, ChevronLeft, Moon, Sun, Trash2 } from "lucide-react";
import { store } from "@/lib/store";
import ChipSelector from "@/components/ChipSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { requestNotificationPermission, scheduleMedicationNotifications, getPermissionStatus } from "@/lib/notifications";

import { toast } from "sonner";
import type { AppSettings } from "@/types";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t, lang, setLang, isRTL } = useLanguage();
  const { logOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(store.getSettings());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    if (partial.notifications !== undefined || partial.reminderBefore !== undefined) {
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

  const handleShareApp = async () => {
    const shareData = {
      title: "dawaa+",
      text: isRTL ? "جرب تطبيق دواء+ لإدارة أدويتك وصحتك" : "Try dawaa+ app to manage your medications and health",
      url: "https://dawaa-plus-buddy.lovable.app",
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(shareData.url);
      toast.success(isRTL ? "تم نسخ الرابط" : "Link copied!");
    }
  };

  const menuItems = [
    { icon: Share2, label: t.shareApp, action: handleShareApp },
  ];

  const aboutItems = [
    { icon: FileText, label: t.termsOfUse, path: "/terms-of-use" },
    { icon: Shield, label: t.privacyPolicy, path: "/privacy-policy" },
    { icon: Mail, label: t.contactUs, action: () => window.open("mailto:dralmarri@gmail.com", "_blank") },
    { icon: Info, label: t.version, value: "1.0.5" },
  ];

  const reminderMap: Record<string, string> = {
    "0": t.atTime, "5": t.min5, "10": t.min10, "15": t.min15, "30": t.min30, "60": t.min60,
  };
  const reminderKeys = Object.keys(reminderMap);
  const reminderLabels = Object.values(reminderMap);

  return (
    <div className="pb-28">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-foreground">{t.settings}</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Language */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-3">{t.language}</label>
          <div className="flex gap-3">
            <button onClick={() => { setLang("ar"); update({ language: "ar" }); }}
              className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors ${lang === "ar" ? "border-primary bg-chip-active text-chip-active-foreground" : "border-border bg-chip text-chip-foreground"}`}>
              العربية
            </button>
            <button onClick={() => { setLang("en"); update({ language: "en" }); }}
              className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors ${lang === "en" ? "border-primary bg-chip-active text-chip-active-foreground" : "border-border bg-chip text-chip-foreground"}`}>
              English
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <h3 className="font-bold text-foreground">{t.theme}</h3>
              <p className="text-sm text-muted-foreground">{theme === "dark" ? t.darkMode : t.lightMode}</p>
            </div>
          </div>
          <button onClick={toggleTheme}
            className={`w-12 h-7 rounded-full transition-colors relative ${theme === "dark" ? "bg-primary" : "bg-border"}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${theme === "dark" ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
          </button>
        </div>

        {/* User Name */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-2">{t.userName}</label>
          <input value={settings.userName} onChange={(e) => update({ userName: e.target.value })}
            placeholder={t.userName + "..."}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">{t.notifications}</h3>
            <p className="text-sm text-muted-foreground">
              {settings.notifications ? t.enabled : t.disabled} - 0 {t.scheduled}
            </p>
          </div>
          <button onClick={() => update({ notifications: !settings.notifications })}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.notifications ? "bg-primary" : "bg-border"}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${settings.notifications ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
          </button>
        </div>

        {/* Voice notifications removed due to poor speech synthesis quality */}


        {/* Daily Summary */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-foreground flex items-center gap-2">📋 {t.dailySummary}</h3>
              <p className="text-sm text-muted-foreground">{t.dailySummaryDesc}</p>
            </div>
            <button onClick={() => update({ dailySummary: !settings.dailySummary })}
              className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${settings.dailySummary ? "bg-primary" : "bg-border"}`}>
              <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all ${settings.dailySummary ? "ltr:right-0.5 rtl:left-0.5" : "ltr:left-0.5 rtl:right-0.5"}`} />
            </button>
          </div>
          {settings.dailySummary && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground">{t.dailySummaryTime}</label>
              <input type="time" value={settings.dailySummaryTime || "08:00"}
                onChange={(e) => update({ dailySummaryTime: e.target.value })}
                className="px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
        </div>

        {/* Reminder */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-3">{t.reminderBefore}</label>
          <ChipSelector options={reminderLabels} value={reminderMap[settings.reminderBefore] || settings.reminderBefore}
            onChange={(v) => update({ reminderBefore: reminderKeys[reminderLabels.indexOf(v)] || v })} />
        </div>

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

        {user ? (
          <button onClick={async () => {
              const msg = isRTL ? "هل تريد تسجيل الخروج؟" : "Do you want to sign out?";
              if (window.confirm(msg)) {
                await logOut();
                navigate("/auth", { replace: true });
              }
            }}
            className="bg-card rounded-2xl border border-border w-full flex items-center justify-between px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-destructive" />
              <span className="text-destructive font-medium">{t.signOut}</span>
            </div>
            <Chevron className="w-5 h-5 text-muted-foreground" />
          </button>
        ) : (
          <button onClick={() => navigate("/auth", { replace: true })}
            className="bg-card rounded-2xl border border-primary w-full flex items-center justify-between px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <LogIn className="w-5 h-5 text-primary" />
              <span className="text-primary font-bold">{isRTL ? "تسجيل الدخول للمزامنة" : "Sign in to sync"}</span>
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
    </div>
  );
};

export default SettingsPage;
