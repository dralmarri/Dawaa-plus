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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--nav-bg))] border-t border-[hsl(var(--nav-border))] safe-bottom print-hide">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1.5 flex-1 py-1"
            >
              <tab.icon
                className={`w-7 h-7 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={`text-[11px] transition-colors ${active ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
