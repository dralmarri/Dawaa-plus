import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (err) {
        const msg = getErrorMessage(err.message);
        setError(msg);
        throw new Error(msg);
      }
    } catch (e: any) {
      if (!error) {
        const msg = getErrorMessage(e.message);
        setError(msg);
      }
      throw e;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        const msg = getErrorMessage(err.message);
        setError(msg);
        throw new Error(msg);
      }
    } catch (e: any) {
      if (!error) {
        const msg = getErrorMessage(e.message);
        setError(msg);
      }
      throw e;
    }
  };

  const logOut = async () => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signOut();
      if (err) {
        const msg = getErrorMessage(err.message);
        setError(msg);
        throw new Error(msg);
      }
    } catch (e: any) {
      if (!error) {
        const msg = getErrorMessage(e.message);
        setError(msg);
      }
      throw e;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        const msg = getErrorMessage(err.message);
        setError(msg);
        throw new Error(msg);
      }
    } catch (e: any) {
      if (!error) {
        const msg = getErrorMessage(e.message);
        setError(msg);
      }
      throw e;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{ user, loading, signUp, signIn, logOut, resetPassword, error, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

function getErrorMessage(message: string): string {
  const lower = (message || "").toLowerCase();
  if (lower.includes("already registered") || lower.includes("already in use") || lower.includes("user_already_exists") || lower.includes("user already") || lower.includes("422"))
    return "البريد الإلكتروني مستخدم بالفعل — جرّب تسجيل الدخول";
  if (lower.includes("invalid email"))
    return "البريد الإلكتروني غير صحيح";
  if (lower.includes("weak password") || lower.includes("at least") || lower.includes("password should"))
    return "كلمة المرور ضعيفة جداً (6 أحرف على الأقل)";
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "تم تجاوز عدد المحاولات، حاول لاحقاً";
  if (lower.includes("not found") || lower.includes("user not found"))
    return "لا يوجد حساب بهذا البريد الإلكتروني";
  if (lower.includes("email not confirmed"))
    return "يرجى تأكيد البريد الإلكتروني أولاً";
  return "حدث خطأ، حاول مرة أخرى";
}
