CREATE OR REPLACE FUNCTION public.update_app_settings(_courier_fee_kobo bigint, _service_fee_bps integer, _cash_enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old public.app_settings;
BEGIN
  PERFORM public.require_permission('settings.manage');
  IF _courier_fee_kobo IS NULL OR _courier_fee_kobo < 0 OR _courier_fee_kobo > 10000000 THEN RAISE EXCEPTION 'invalid_courier_fee'; END IF;
  IF _service_fee_bps IS NULL OR _service_fee_bps < 0 OR _service_fee_bps > 5000 THEN RAISE EXCEPTION 'invalid_service_fee'; END IF;
  SELECT * INTO _old FROM public.app_settings WHERE id = 1;
  UPDATE public.app_settings SET courier_fee_kobo = _courier_fee_kobo, service_fee_bps = _service_fee_bps,
    cash_enabled = COALESCE(_cash_enabled, cash_enabled), updated_at = now(), updated_by = auth.uid() WHERE id = 1;
  PERFORM public.write_audit('settings.updated', 'settings', '1', jsonb_build_object(
    'from', jsonb_build_object('courier_fee_kobo', _old.courier_fee_kobo, 'service_fee_bps', _old.service_fee_bps, 'cash_enabled', _old.cash_enabled),
    'to', jsonb_build_object('courier_fee_kobo', _courier_fee_kobo, 'service_fee_bps', _service_fee_bps, 'cash_enabled', _cash_enabled)));
END $$;

CREATE OR REPLACE FUNCTION public.revoke_device_session(_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s public.device_sessions;
BEGIN
  SELECT * INTO _s FROM public.device_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'session_not_found'; END IF;
  IF NOT (public.has_permission(auth.uid(), 'staff.manage') OR (_s.user_id = auth.uid() AND public.is_active_staff(auth.uid()))) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  IF _s.status <> 'active' THEN RETURN; END IF;
  UPDATE public.device_sessions SET status = 'revoked', ended_at = now(),
    ended_reason = CASE WHEN _s.user_id = auth.uid() THEN 'signed_out_by_self' ELSE 'revoked_by_admin' END
  WHERE id = _session_id;
  PERFORM public.write_audit('session.revoked', 'device_session', _session_id::text, jsonb_build_object('user', _s.user_id, 'device', _s.device_name));
END $$;

CREATE OR REPLACE FUNCTION public.active_admin_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(DISTINCT sp.user_id)::int FROM public.staff_profiles sp
  JOIN public.staff_roles sr ON sr.user_id = sp.user_id
  JOIN public.role_permissions rp ON rp.role_id = sr.role_id
  WHERE sp.status = 'active' AND rp.permission_key = 'staff.manage'
$$;

CREATE OR REPLACE FUNCTION public.set_staff_status(_user_id uuid, _status public.staff_status, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_permission('staff.manage');
  IF _user_id = auth.uid() THEN RAISE EXCEPTION 'cannot_change_own_status'; END IF;
  IF _status = 'suspended' AND (_reason IS NULL OR length(trim(_reason)) < 3) THEN RAISE EXCEPTION 'reason_required'; END IF;
  UPDATE public.staff_profiles SET status = _status, updated_at = now(),
    suspended_reason = CASE WHEN _status = 'suspended' THEN trim(_reason) ELSE NULL END
  WHERE user_id = _user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found'; END IF;
  IF _status = 'suspended' THEN
    IF public.active_admin_count() = 0 THEN RAISE EXCEPTION 'last_admin'; END IF;
    UPDATE public.device_sessions SET status = 'revoked', ended_at = now(), ended_reason = 'account_suspended'
    WHERE user_id = _user_id AND status = 'active';
  END IF;
  PERFORM public.write_audit('staff.' || _status::text, 'staff', _user_id::text, jsonb_build_object('reason', _reason));
END $$;

CREATE OR REPLACE FUNCTION public.set_staff_roles(_user_id uuid, _role_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_permission('staff.manage');
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = _user_id) THEN RAISE EXCEPTION 'staff_not_found'; END IF;
  DELETE FROM public.staff_roles WHERE user_id = _user_id AND role_id <> ALL(COALESCE(_role_ids, '{}'));
  INSERT INTO public.staff_roles(user_id, role_id)
  SELECT _user_id, r.id FROM public.roles r WHERE r.id = ANY(COALESCE(_role_ids, '{}'))
  ON CONFLICT DO NOTHING;
  IF public.active_admin_count() = 0 THEN RAISE EXCEPTION 'last_admin'; END IF;
  PERFORM public.write_audit('staff.roles_changed', 'staff', _user_id::text, jsonb_build_object('roles', _role_ids));
END $$;

CREATE OR REPLACE FUNCTION public.set_role_permissions(_role_id uuid, _permission_keys text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.roles;
BEGIN
  PERFORM public.require_permission('staff.manage');
  SELECT * INTO _r FROM public.roles WHERE id = _role_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'role_not_found'; END IF;
  IF _r.is_system THEN RAISE EXCEPTION 'system_role_locked'; END IF;
  DELETE FROM public.role_permissions WHERE role_id = _role_id AND permission_key <> ALL(COALESCE(_permission_keys, '{}'));
  INSERT INTO public.role_permissions(role_id, permission_key)
  SELECT _role_id, p.key FROM public.permissions p WHERE p.key = ANY(COALESCE(_permission_keys, '{}'))
  ON CONFLICT DO NOTHING;
  PERFORM public.write_audit('role.permissions_changed', 'role', _role_id::text, jsonb_build_object('permissions', _permission_keys));
END $$;

REVOKE ALL ON FUNCTION public.update_app_settings(bigint, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_device_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.active_admin_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_staff_status(uuid, public.staff_status, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_staff_roles(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_role_permissions(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_app_settings(bigint, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_device_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_status(uuid, public.staff_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_roles(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_role_permissions(uuid, text[]) TO authenticated;