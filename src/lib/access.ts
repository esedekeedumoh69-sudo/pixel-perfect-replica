import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceInfo } from "@/lib/desktop";

export type DenyReason =
  | "not_staff"
  | "suspended"
  | "no_role"
  | "revoked"
  | "signed_out"
  | "expired"
  | "invalid_device"
  | "not_signed_in";

export interface Access {
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: "active" | "suspended";
  roles: { key: string; name: string }[];
  permissions: string[];
  deviceSessionId: string;
}

export class AccessDenied extends Error {
  constructor(
    public reason: DenyReason,
    public detail?: string | null,
  ) {
    super("access_denied:" + reason);
  }
}

export class ConnectionProblem extends Error {
  constructor(message = "connection_problem") {
    super(message);
  }
}

function isNetworkError(err: unknown) {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
  return /fetch|network|timeout/i.test(msg) || name === "AuthRetryableFetchError";
}

/**
 * Verifies the signed-in user against the backend: active staff, has a role, and this login is
 * registered to this device and not revoked. Every backend permission check depends on this registration.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ConnectionProblem("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function establishAccess(): Promise<Access> {
  // Never leave staff staring at a spinner: give up after 20s and show the connection screen.
  return withTimeout(establishAccessInner(), 20_000);
}

async function establishAccessInner(): Promise<Access> {
  if (typeof navigator !== "undefined" && !navigator.onLine) throw new ConnectionProblem();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new AccessDenied("not_signed_in");
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) {
    if (isNetworkError(userErr)) throw new ConnectionProblem();
    throw new AccessDenied("expired");
  }
  if (!userData.user) throw new AccessDenied("not_signed_in");

  const device = await getDeviceInfo();
  const { data: reg, error: regErr } = await supabase.rpc("register_device_session", {
    _device_id: device.deviceId,
    _device_name: device.deviceName,
    _platform: device.platform,
    _app_version: device.appVersion,
  });
  if (regErr) {
    if (isNetworkError(regErr)) throw new ConnectionProblem();
    throw new ConnectionProblem(regErr.message);
  }
  const result = reg as { ok: boolean; reason?: DenyReason; message?: string | null; session_id?: string };
  if (!result.ok) throw new AccessDenied(result.reason ?? "not_staff", result.message);

  const { data: access, error: accessErr } = await supabase.rpc("get_my_access");
  if (accessErr || !access) {
    if (accessErr && isNetworkError(accessErr)) throw new ConnectionProblem();
    throw new AccessDenied("not_staff");
  }
  return { ...(access as unknown as Omit<Access, "deviceSessionId">), deviceSessionId: result.session_id! };
}

export const accessQueryOptions = queryOptions({
  queryKey: ["access"],
  queryFn: establishAccess,
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
});

export const DENY_MESSAGES: Record<DenyReason, { title: string; body: string }> = {
  not_staff: {
    title: "This account isn't set up for LightGrab Office",
    body: "Your sign-in worked, but no Office account is linked to it. Ask an administrator to set you up.",
  },
  suspended: {
    title: "Your account is suspended",
    body: "An administrator has suspended this account. Contact your office manager to have it reactivated.",
  },
  no_role: {
    title: "No role assigned yet",
    body: "Your account exists but has no role. Ask an administrator to assign you a role.",
  },
  revoked: {
    title: "This device was signed out by an administrator",
    body: "Your session on this laptop was ended. Sign in again if you still need access.",
  },
  signed_out: { title: "You were signed out", body: "Please sign in again." },
  expired: { title: "Your session has expired", body: "For your security, please sign in again." },
  invalid_device: {
    title: "This device couldn't be identified",
    body: "Restart LightGrab Office and try again. If it keeps happening, reinstall the app.",
  },
  not_signed_in: { title: "Please sign in", body: "Sign in with the account your administrator gave you." },
};

let intentionalSignOut = false;
export function markIntentionalSignOut(v: boolean) {
  intentionalSignOut = v;
}
export function isIntentionalSignOut() {
  return intentionalSignOut;
}
