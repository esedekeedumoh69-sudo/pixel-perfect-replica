import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { friendlyError } from "@/lib/errors";

type RpcResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

/**
 * Runs a backend action (RPC). The backend authorises every call; this hook only shows
 * a toast and refreshes the affected screens.
 */
export function useAction<TVars, TData = unknown>(
  fn: (vars: TVars) => RpcResult<TData>,
  opts: { success?: string | ((data: TData | null) => string); invalidate?: string[] } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TVars) => {
      const { data, error } = await fn(vars);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      const msg = typeof opts.success === "function" ? opts.success(data) : opts.success;
      if (msg) toast.success(msg);
      for (const k of opts.invalidate ?? ["orders", "dashboard"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
}

/** Postgres RPC parameters accept NULL even though generated types mark them required. */
export function nullable<T>(v: T | null | undefined): T {
  return (v ?? null) as T;
}
