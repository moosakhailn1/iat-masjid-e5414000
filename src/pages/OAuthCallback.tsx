import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const notifyOpener = () => {
      try {
        window.opener?.postMessage({ type: "oauth-complete" }, window.location.origin);
      } catch {
        // ignore
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        notifyOpener();
        toast.success("Signed in!");
        navigate("/", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        notifyOpener();
        navigate("/", { replace: true });
      }
    });

    const timeout = window.setTimeout(() => setTimedOut(true), 7000);

    return () => {
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 text-center space-y-2">
        <h1 className="text-foreground text-xl font-bold">Completing sign-in…</h1>
        <p className="text-muted-foreground text-sm">
          {timedOut
            ? "If this is taking too long, please close this window and try again from the app."
            : "Please wait while we finish securely signing you in."}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
