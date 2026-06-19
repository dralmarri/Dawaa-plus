import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Always use the production web URL for email redirects so links work from
// iOS/Android native builds (where window.location.origin is capacitor://localhost
// and would be rejected by Supabase as an invalid redirect URL).
const AUTH_REDIRECT_BASE = "https://dawaaplus.net";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<boolean>;
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

  const signUp = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "https://dawaaplus.net/confirm" },
    });
    if (err) {
      const msg = getErrorMessage(err.message);
      setError(msg);
      throw new Error(msg);
    }
    // Returns true if user is immediately active (no email confirmation needed)
    return !!data.session;
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
        redirectTo: AUTH_REDIRECT_BASE + "/reset-password",
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
    return "This email is already registered — try signing in";
  if (lower.includes("invalid email"))
    return "Invalid email address";
  if (lower.includes("weak password") || lower.includes("at least") || lower.includes("password should") || lower.includes("password"))
    return message; // show exact Supabase message
  if (lower.includes("invalid login") || lower.includes("invalid credentials"))
    return "Incorrect email or password";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Too many attempts — please try again later";
  if (lower.includes("not found") || lower.includes("user not found"))
    return "No account found with this email";
  if (lower.includes("email not confirmed"))
    return "Please confirm your email first — check your inbox";
  if (lower.includes("redirect") || lower.includes("uri"))
    return "Configuration error — please contact support";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Network error — check your connection and try again";
  return `Error: ${message || "Unknown error"}`;
}
