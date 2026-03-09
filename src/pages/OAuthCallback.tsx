import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OAuthCallback = () => {
  const [status, setStatus] = useState<"working" | "done" | "timedOut">("working");

  useEffect(() => {
    let done = false;

    const sendToOpenerAndClose = async () => {
      if (done) return;

      const { data, error } = await supabase.auth.getSession();
      const session = data.session;

      if (error || !session?.access_token || !session.refresh_token) return;

      const hasOpener = !!window.opener;

      if (hasOpener) {
        try {
          window.opener?.postMessage(
            {
              type: "oauth-complete",
              session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              },
            },
            window.location.origin,
          );
        } catch {
          // ignore
        }
      }

      done = true;
      setStatus("done");

      window.setTimeout(() => {
        // Popup flow: close
        if (hasOpener) {
          try {
            window.close();
          } catch {
            // ignore
          }
          return;
        }

        // Same-tab flow: go back into the app
        window.location.replace("/");
      }, 150);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void sendToOpenerAndClose();
    });

    void sendToOpenerAndClose();

    const timeout = window.setTimeout(() => {
      if (!done) setStatus("timedOut");
    }, 10000);

    return () => {
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 text-center space-y-2">
        <h1 className="text-foreground text-xl font-bold">
          {status === "done" ? "Signed in" : "Completing sign-in…"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {status === "done"
            ? "You can close this window and return to the app."
            : status === "timedOut"
              ? "If this is taking too long, please close this window and try again from the app."
              : "Please wait while we finish securely signing you in."}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
