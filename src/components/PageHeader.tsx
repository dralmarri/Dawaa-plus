import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
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

  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft className={`w-6 h-6 ${isRTL ? "rotate-180" : ""}`} />
          </button>
        )}
        <img
          src="/app-icon.png"
          alt=""
          className="w-9 h-9 rounded-xl object-cover shadow-sm border border-border"
        />
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      </div>

      {onAdd && (
        <button onClick={onAdd} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PageHeader;
