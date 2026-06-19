import { useLanguage } from "@/contexts/LanguageContext";
import appIcon from "@/assets/app-icon.png";
import { Check } from "lucide-react";

interface LanguageSelectionPageProps {
  onSelect: () => void;
}

const LanguageSelectionPage = ({ onSelect }: LanguageSelectionPageProps) => {
  const { lang, setLang } = useLanguage();

  const choose = (newLang: "ar" | "en") => {
    setLang(newLang);
    localStorage.setItem("dawaa_lang_selected", "1");
    onSelect();
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-background flex flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg">
          <img src={appIcon} alt="Dawaa+" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-3xl font-bold text-foreground" dir="ltr">Dawaa+</h1>
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">اختر اللغة</h2>
          <p className="text-base font-bold text-foreground" dir="ltr">Choose Language</p>
        </div>

        <button
          onClick={() => choose("ar")}
          className={`w-full py-4 rounded-2xl border-2 flex items-center justify-between px-5 transition-all ${
            lang === "ar" ? "border-primary bg-primary/10" : "border-border bg-accent"
          }`}
          dir="rtl"
        >
          <span className="text-lg font-bold text-foreground">العربية</span>
          {lang === "ar" && <Check className="w-5 h-5 text-primary" />}
        </button>

        <button
          onClick={() => choose("en")}
          className={`w-full py-4 rounded-2xl border-2 flex items-center justify-between px-5 transition-all ${
            lang === "en" ? "border-primary bg-primary/10" : "border-border bg-accent"
          }`}
          dir="ltr"
        >
          <span className="text-lg font-bold text-foreground">English</span>
          {lang === "en" && <Check className="w-5 h-5 text-primary" />}
        </button>

        <p className="text-xs text-muted-foreground text-center pt-2">
          يمكنك تغيير اللغة لاحقاً من الإعدادات · You can change this later in Settings
        </p>
      </div>
    </div>
  );
};

export default LanguageSelectionPage;
