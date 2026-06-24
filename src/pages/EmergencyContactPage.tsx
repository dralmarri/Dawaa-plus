import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Phone, MessageCircle, User } from "lucide-react";
import { store } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { EmergencyContact } from "@/types";

const EmergencyContactPage = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const settings = store.getSettings();

  const [contact, setContact] = useState<EmergencyContact>(
    settings.emergencyContact || { name: "", phone: "", method: "whatsapp" }
  );

  const handleSave = () => {
    if (!contact.name.trim() || !contact.phone.trim()) {
      toast.error(isRTL ? "يرجى إدخال الاسم ورقم الهاتف" : "Please enter name and phone number");
      return;
    }
    // Clean phone number
    const cleanPhone = contact.phone.replace(/[^\d+]/g, "");
    if (cleanPhone.length < 8) {
      toast.error(isRTL ? "رقم الهاتف غير صحيح" : "Invalid phone number");
      return;
    }

    const updated = { ...contact, phone: cleanPhone };
    store.saveSettings({ ...settings, emergencyContact: updated });
    toast.success(isRTL ? "تم حفظ جهة الاتصال" : "Contact saved");
    navigate("/settings");
  };

  const handleRemove = () => {
    const { emergencyContact, ...rest } = store.getSettings();
    store.saveSettings({ ...rest, emergencyContact: undefined } as any);
    toast.success(isRTL ? "تم حذف جهة الاتصال" : "Contact removed");
    navigate("/settings");
  };

  return (
    <div className="pb-24 overflow-x-hidden">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className={`w-6 h-6 text-foreground ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {isRTL ? "جهة اتصال الطوارئ" : "Emergency Contact"}
        </h1>
      </div>

      <div className="px-4 space-y-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isRTL
              ? "سيتم إرسال رسالة تلقائية لهذا الشخص عبر الواتساب أو رسالة نصية عند تفويت جرعتين متتاليتين من الدواء."
              : "An automatic message will be sent to this person via WhatsApp or SMS when 2 consecutive medication doses are missed."}
          </p>
        </div>

        {/* Name */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-2">
            <User className="w-4 h-4 inline-block me-2 text-primary" />
            {isRTL ? "اسم الشخص الموثوق" : "Trusted Person Name"}
          </label>
          <input
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            placeholder={isRTL ? "مثال: أحمد" : "e.g. Ahmed"}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Phone */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-2">
            <Phone className="w-4 h-4 inline-block me-2 text-primary" />
            {isRTL ? "رقم الهاتف (مع رمز الدولة)" : "Phone Number (with country code)"}
          </label>
          <input
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            placeholder="+966XXXXXXXXX"
            type="tel"
            dir="ltr"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Method */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <label className="text-base font-bold text-foreground block mb-3">
            {isRTL ? "طريقة التواصل" : "Contact Method"}
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setContact({ ...contact, method: "whatsapp" })}
              className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors flex items-center justify-center gap-2 ${
                contact.method === "whatsapp"
                  ? "border-primary bg-chip-active text-chip-active-foreground"
                  : "border-border bg-chip text-chip-foreground"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
            <button
              onClick={() => setContact({ ...contact, method: "sms" })}
              className={`flex-1 py-3 rounded-xl border text-center font-semibold transition-colors flex items-center justify-center gap-2 ${
                contact.method === "sms"
                  ? "border-primary bg-chip-active text-chip-active-foreground"
                  : "border-border bg-chip text-chip-foreground"
              }`}
            >
              <Phone className="w-5 h-5" />
              SMS
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg"
        >
          {isRTL ? "حفظ" : "Save"}
        </button>

        {settings.emergencyContact && (
          <button
            onClick={handleRemove}
            className="w-full py-3 rounded-2xl border border-destructive text-destructive font-medium"
          >
            {isRTL ? "حذف جهة الاتصال" : "Remove Contact"}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmergencyContactPage;
