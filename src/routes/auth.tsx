import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldAlert, WifiOff } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/office/Logo";
import { DENY_MESSAGES, type DenyReason } from "@/lib/access";

const reasons = [
  "not_staff",
  "suspended",
  "no_role",
  "revoked",
  "signed_out",
  "expired",
  "invalid_device",
  "not_signed_in",
] as const;

const searchSchema = z.object({ reason: z.enum(reasons).optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — LightGrab Office" },
      { name: "description", content: "Staff sign-in for LightGrab Office." },
      { property: "og:title", content: "Sign in — LightGrab Office" },
      { property: "og:description", content: "Staff sign-in for LightGrab Office." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ search }) => {
    if (search.reason) return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard", replace: true });
  },
  component: SignInPage,
});

const credsSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email").email("That doesn't look like an email address").max(255),
  password: z.string().min(1, "Enter your password").max(200),
});

function SignInPage() {
  const { reason } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<{ title: string; body: string; offline?: boolean } | null>(
    reason ? DENY_MESSAGES[reason as DenyReason] : null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) fe[issue.path[0] as "email" | "password"] = issue.message;
      setFieldErrors(fe);
      return;
    }
    setFieldErrors({});
    if (!navigator.onLine) {
      setError({ title: "No internet connection", body: "Connect to the internet to sign in.", offline: true });
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    if (signInError) {
      setBusy(false);
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login")) {
        setError({ title: "Incorrect email or password", body: "Check your details and try again." });
      } else if (msg.includes("banned") || msg.includes("suspended")) {
        setError(DENY_MESSAGES.suspended);
      } else if (msg.includes("not confirmed")) {
        setError({
          title: "Account not activated yet",
          body: "Open the invitation email from LightGrab to activate your account, then sign in.",
        });
      } else if (/fetch|network/i.test(msg)) {
        setError({
          title: "Can't reach the LightGrab server",
          body: "Check your internet connection and try again.",
          offline: true,
        });
      } else {
        setError({ title: "Sign-in failed", body: "Please try again in a moment." });
      }
      return;
    }
    queryClient.removeQueries({ queryKey: ["access"] });
    await navigate({ to: "/dashboard", replace: true });
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-brand p-12 text-navy-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-cream p-2 shadow-raised">
            <LogoMark className="h-full w-full" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold">LightGrab</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-leaf">Office</p>
          </div>
        </div>
        <div className="max-w-md space-y-5">
          <h1 className="font-display text-5xl font-bold leading-[1.05]">
            From market list
            <br />
            to doorstep.
          </h1>
          <p className="text-base text-navy-foreground/75">
            Orders, procurement, couriers and payments for the LightGrab team in Oron, Akwa Ibom.
          </p>
        </div>
        <p className="text-xs text-navy-foreground/55">Authorised LightGrab staff only. Activity is logged.</p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-leaf/15 blur-3xl" />
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <LogoMark className="mb-4 h-20 w-auto lg:hidden" />
            <h2 className="font-display text-3xl font-bold text-navy">Sign in to LightGrab Office</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use the account your administrator gave you.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm"
            >
              {error.offline ? (
                <WifiOff className="mt-0.5 size-5 shrink-0 text-destructive" />
              ) : (
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <div>
                <p className="font-semibold text-navy">{error.title}</p>
                <p className="mt-0.5 text-muted-foreground">{error.body}</p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                className="h-11 bg-card"
              />
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.password}
                  className="h-11 bg-card pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-navy"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>
            <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
            Forgotten your password or locked out? Ask your office administrator to reset it.
          </p>
        </div>
      </main>
    </div>
  );
}
