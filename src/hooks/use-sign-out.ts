import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { markIntentionalSignOut, type DenyReason } from "@/lib/access";

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async (opts?: { reason?: DenyReason; endSession?: boolean }) => {
    markIntentionalSignOut(true);
    try {
      if (opts?.endSession !== false) {
        await supabase.rpc("end_device_session").then(
          () => undefined,
          () => undefined,
        );
      }
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      await navigate({ to: "/auth", search: opts?.reason ? { reason: opts.reason } : {}, replace: true });
      markIntentionalSignOut(false);
    }
  };
}
