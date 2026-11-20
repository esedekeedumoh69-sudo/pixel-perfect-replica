import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: "has_permission", args: { _user_id: string; _permission: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }; userId: string };

/** Verifies the caller as the signed-in user (RLS-aware client) before any privileged work. */
async function assertStaffManager(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_permission", { _user_id: ctx.userId, _permission: "staff.manage" });
  if (error || data !== true) throw new Error("permission_denied");
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(72),
  role_ids: z.array(z.string().uuid()).min(1).max(10),
});

export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffManager(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      throw new Error(/already|registered|exists/i.test(error?.message ?? "") ? "email_taken" : "create_failed");
    }
    const uid = created.user.id;
    const { error: pErr } = await supabaseAdmin
      .from("staff_profiles")
      .upsert({ user_id: uid, email: data.email, full_name: data.full_name, phone: data.phone || null, status: "active" });
    const { error: rErr } = pErr
      ? { error: pErr }
      : await supabaseAdmin.from("staff_roles").upsert(data.role_ids.map((role_id) => ({ user_id: uid, role_id })));
    if (pErr || rErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("create_failed");
    }
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "staff.created",
      entity_type: "staff",
      entity_id: uid,
      details: { email: data.email, roles: data.role_ids },
    });
    return { user_id: uid };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaffManager(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sp } = await supabaseAdmin.from("staff_profiles").select("user_id").eq("user_id", data.user_id).maybeSingle();
    if (!sp) throw new Error("staff_not_found");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error("reset_failed");
    // A new password ends every existing device login for that person.
    await supabaseAdmin
      .from("device_sessions")
      .update({ status: "revoked", ended_at: new Date().toISOString(), ended_reason: "password_reset" })
      .eq("user_id", data.user_id)
      .eq("status", "active");
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "staff.password_reset",
      entity_type: "staff",
      entity_id: data.user_id,
      details: {},
    });
    return { ok: true };
  });
