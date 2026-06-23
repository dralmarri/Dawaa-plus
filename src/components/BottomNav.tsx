import { useLocation, useNavigate } from "react-router-dom";
import { Home, Pill, CalendarDays, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { path: "/", label: t.home, icon: Home },
    { path: "/medications", label: t.medications, icon: Pill },
    { path: "/history", label: t.history, icon: CalendarDays },
    { path: "/settings", label: t.settings, icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] safe-bottom print-hide">
      <div className="max-w-lg mx-auto flex items-center justify-around h-[68px]">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
