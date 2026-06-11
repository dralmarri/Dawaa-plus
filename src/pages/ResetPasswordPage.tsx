import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock, Eye, EyeOff } from "lucide-react";
import appIcon from "@/assets/app-icon.png";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      const lower = (err.message || "").toLowerCase();
      if (lower.includes("same") || lower.includes("different"))
        setError("كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة");
      else if (lower.includes("session") || lower.includes("auth"))
        setError("انتهت صلاحية الرابط — اطلب رابط استعادة جديد");
      else setError("حدث خطأ، حاول مرة أخرى");
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/", { replace: true }), 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg">
          <img src={appIcon} alt="Dawaa+" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">دواء+</h1>
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">تعيين كلمة مرور جديدة</h2>
          <p className="text-sm text-muted-foreground mt-1">أدخل كلمة المرور الجديدة لحسابك</p>
        </div>

        {hasSession === false && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center">
            <p className="text-sm text-destructive">انتهت صلاحية الرابط أو غير صالح — اطلب رابط استعادة جديد من صفحة تسجيل الدخول</p>
          </div>
        )}

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-sm text-green-600 font-medium">✅ تم تغيير كلمة المرور بنجاح! جارٍ تحويلك...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-foreground block mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute top-3.5 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="w-full px-4 py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "36px", [isRTL ? "paddingLeft" : "paddingRight"]: "40px" }}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-3.5 text-muted-foreground"
                  style={{ [isRTL ? "left" : "right"]: "12px" }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-foreground block mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute top-3.5 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "36px" }}
                  dir="ltr"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !password || !confirm || hasSession === false}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : "حفظ كلمة المرور الجديدة"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
