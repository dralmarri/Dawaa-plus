import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import appIcon from "@/assets/app-icon.png";

const EmailConfirmedPage = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const tryOpenApp = () => {
      window.location.href = "dawaaplus://";
    };

    const confirm = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus("success");
        tryOpenApp();
        return;
      }
      // Listen for auth state change (Supabase processes the hash token)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (s) {
          setStatus("success");
          tryOpenApp();
          subscription.unsubscribe();
        }
      });
      // Timeout fallback
      setTimeout(() => {
        setStatus((prev) => prev === "loading" ? "error" : prev);
        subscription.unsubscribe();
      }, 5000);
    };

    confirm();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-4 shadow-lg">
        <img src={appIcon} alt="Dawaa+" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2" dir="ltr">Dawaa+</h1>

      {status === "loading" && (
        <div className="mt-6">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Confirming your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="mt-6 space-y-4 max-w-sm">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-foreground">Email Confirmed!</h2>
          <p className="text-muted-foreground">Opening the app...</p>
          <a
            href="dawaaplus://"
            className="block w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-center"
          >
            Open Dawaa+ App
          </a>
          <p className="text-xs text-muted-foreground">
            If the app doesn't open automatically, tap the button above.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 space-y-4 max-w-sm">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-foreground">Link Expired</h2>
          <p className="text-muted-foreground">This link has expired or already been used. Open the app and sign in.</p>
          <a
            href="dawaaplus://"
            className="block w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-center"
          >
            Open Dawaa+ App
          </a>
        </div>
      )}
    </div>
  );
};

export default EmailConfirmedPage;
