import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onAdd?: () => void;
  children?: ReactNode;
}

const PageHeader = ({ title, showBack, onAdd }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <div className="fixed top-0 left-0 right-0 w-full z-40 bg-background/95 backdrop-blur-sm safe-top border-b border-border/40">
      <div className="flex items-center justify-between px-3 py-3">
        {/* Left slot */}
        <div className="w-10 flex justify-start">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-foreground"
            >
              <BackIcon className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>

        {/* Center title */}
        <h1 className="flex-1 text-center text-lg font-bold text-foreground px-2 truncate">
          {title}
        </h1>

        {/* Right slot */}
        <div className="w-10 flex justify-end">
          {onAdd ? (
            <button
              onClick={onAdd}
              className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
