
CREATE OR REPLACE FUNCTION public.register_device_session(_device_id text, _device_name text, _platform text, _app_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sid uuid := public.current_auth_session_id();
  _profile public.staff_profiles;
  _existing public.device_sessions;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  END IF;
  IF _sid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;
  IF _device_id IS NULL OR length(_device_id) < 8 OR length(_device_id) > 128 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_device');
  END IF;
  SELECT * INTO _profile FROM public.staff_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN
    INSERT INTO public.audit_logs(actor_id, action, details) VALUES (_uid, 'auth.denied_not_staff', jsonb_build_object('device_id', _device_id));
    RETURN jsonb_build_object('ok', false, 'reason', 'not_staff');
  END IF;
  IF _profile.status = 'suspended' THEN
    INSERT INTO public.audit_logs(actor_id, action, details) VALUES (_uid, 'auth.denied_suspended', jsonb_build_object('device_id', _device_id));
    RETURN jsonb_build_object('ok', false, 'reason', 'suspended', 'message', _profile.suspended_reason);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.staff_roles WHERE user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_role');
  END IF;
  SELECT * INTO _existing FROM public.device_sessions WHERE auth_session_id = _sid;
  IF FOUND THEN
    IF _existing.status <> 'active' THEN
      RETURN jsonb_build_object('ok', false, 'reason', CASE WHEN _existing.status = 'revoked' THEN 'revoked' ELSE 'signed_out' END);
    END IF;
    UPDATE public.device_sessions SET last_seen_at = now() WHERE id = _existing.id;
    RETURN jsonb_build_object('ok', true, 'session_id', _existing.id);
  END IF;
  INSERT INTO public.device_sessions(user_id, auth_session_id, device_id, device_name, platform, app_version)
  VALUES (_uid, _sid, _device_id, left(_device_name, 120), left(_platform, 40), left(_app_version, 40))
  RETURNING * INTO _existing;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (_uid, 'auth.sign_in', 'device_session', _existing.id::text, jsonb_build_object('device_id', _device_id, 'device_name', _device_name, 'platform', _platform));
  RETURN jsonb_build_object('ok', true, 'session_id', _existing.id);
END $$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_staff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Becomes first admin only when no existing, active account can act as administrator.
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    JOIN public.staff_roles sr ON sr.user_id = sp.user_id
    JOIN public.roles r ON r.id = sr.role_id AND r.key = 'administrator'
    JOIN auth.users u ON u.id = sp.user_id
    WHERE sp.status = 'active'
  ) THEN
    INSERT INTO public.staff_profiles(user_id, email, full_name)
    VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email,''), '@', 1)))
    ON CONFLICT (user_id) DO UPDATE SET status = 'active';
    INSERT INTO public.staff_roles(user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE key IN ('office_manager','administrator')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (NEW.id, 'staff.bootstrap_first_admin', 'staff', NEW.id::text, '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
