import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail, Lock, Eye, EyeOff, UserX } from "lucide-react";
import appIcon from "@/assets/app-icon.png";

type Mode = "login" | "register" | "reset";

interface AuthPageProps {
  onSkip: () => void;
}

const AuthPage = ({ onSkip }: AuthPageProps) => {
  const { signIn, signUp, resetPassword, error, clearError } = useAuth();
  const { isRTL } = useLanguage();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signupSent, setSignupSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLocalError(null);
    if (mode === "register") {
      if (password.length < 6) {
        setLocalError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("كلمتا المرور غير متطابقتين");
        return;
      }
    }
    setLoading(true);
    clearError();
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else if (mode === "register") {
        await signUp(email.trim(), password);
        setSignupSent(true);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch {
      // error shown via context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg">
          <img src={appIcon} alt="Dawaa+" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-foreground" dir="ltr">Dawaa+</h1>
        <p className="text-sm text-muted-foreground mt-1">رفيقك الصحي</p>
      </div>

      <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">
            {mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب جديد" : "استعادة كلمة المرور"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "ادخل لمزامنة بياناتك على جميع أجهزتك" :
             mode === "register" ? "أنشئ حساباً لحفظ بياناتك في السحابة" :
             "سنرسل لك رابط لإعادة تعيين كلمة المرور"}
          </p>
        </div>

        {/* Reset sent message */}
        {resetSent && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-sm text-green-600 font-medium">✅ تم إرسال رابط الاستعادة على بريدك الإلكتروني</p>
          </div>
        )}

        {/* Signup sent message */}
        {signupSent && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-sm text-green-600 font-medium">✅ تم إرسال رابط التأكيد إلى بريدك الإلكتروني. افتح الرسالة لتفعيل حسابك.</p>
          </div>
        )}

        {/* Error */}
        {(localError || error) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            <p className="text-sm text-destructive text-center">{localError || error}</p>
          </div>
        )}

        {/* Email */}
        <div>
          <label className="text-sm font-bold text-foreground block mb-1.5">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute top-3.5 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ [isRTL ? "paddingRight" : "paddingLeft"]: "36px" }}
              dir="ltr"
            />
          </div>
        </div>

        {/* Password */}
        {mode !== "reset" && (
          <div>
            <label className="text-sm font-bold text-foreground block mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-3.5 text-muted-foreground" style={{ [isRTL ? "right" : "left"]: "12px" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "6 أحرف على الأقل" : "••••••••"}
                className="w-full px-4 py-3 rounded-xl bg-accent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{
                  [isRTL ? "paddingRight" : "paddingLeft"]: "36px",
                  [isRTL ? "paddingLeft" : "paddingRight"]: "40px",
                }}
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
        )}

        {/* Forgot password */}
        {mode === "login" && (
          <button
            onClick={() => { setMode("reset"); clearError(); setResetSent(false); }}
            className="text-sm text-primary hover:underline w-full text-start"
          >
            نسيت كلمة المرور؟
          </button>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || (mode !== "reset" && !password)}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : mode === "login" ? "تسجيل الدخول" : mode === "register" ? "إنشاء حساب" : "إرسال رابط الاستعادة"}
        </button>

        {/* Switch mode */}
        <div className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              ليس لديك حساب؟{" "}
              <button onClick={() => { setMode("register"); clearError(); }} className="text-primary font-bold hover:underline">
                إنشاء حساب
              </button>
            </>
          ) : (
            <button onClick={() => { setMode("login"); clearError(); setResetSent(false); }} className="text-primary font-bold hover:underline">
              ← العودة لتسجيل الدخول
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">أو</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Skip / local mode */}
        <button
          onClick={onSkip}
          className="w-full py-3 rounded-2xl bg-muted text-foreground font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors"
        >
          <UserX className="w-4 h-4" />
          المتابعة بدون حساب (حفظ محلي فقط)
        </button>
        <p className="text-xs text-muted-foreground text-center -mt-2">
          لن تتمكن من المزامنة بين الأجهزة
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
