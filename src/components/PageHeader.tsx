import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onAdd?: () => void;
  children?: ReactNode;
}

const PageHeader = ({ title, subtitle, showBack, onAdd }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-40 bg-[hsl(var(--nav-bg))] safe-top border-b border-[hsl(var(--nav-border))]">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        {/* Start side: back + title/subtitle */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 shrink-0 rounded-xl bg-card border border-[hsl(var(--nav-border))] flex items-center justify-center text-foreground"
            >
              <BackIcon className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* End side: add button */}
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-9 h-9 shrink-0 rounded-xl bg-primary flex items-center justify-center text-primary-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
