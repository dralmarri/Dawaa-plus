import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import appIcon from "@/assets/app-icon.png";

const EmailConfirmedPage = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? "success" : "error");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("success");
    });
    return () => subscription.unsubscribe();
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
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      )}

      {status === "success" && (
        <div className="mt-6 space-y-4 max-w-sm">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-foreground">Email Confirmed!</h2>
          <p className="text-muted-foreground">Your account is now active. You can return to the app and sign in.</p>
          <a
            href="dawaaplus://"
            className="block w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-center"
          >
            Open Dawaa+ App
          </a>
          <p className="text-xs text-muted-foreground">
            If the button above doesn't work, open the Dawaa+ app manually and sign in with your email and password.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 space-y-4 max-w-sm">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-foreground">Link Expired</h2>
          <p className="text-muted-foreground">This confirmation link has expired or already been used. Open the app and try signing in.</p>
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
