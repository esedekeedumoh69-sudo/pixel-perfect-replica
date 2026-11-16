
-- ============ ENUMS ============
CREATE TYPE public.staff_status AS ENUM ('active','suspended');
CREATE TYPE public.order_status AS ENUM ('new','awaiting_confirmation','awaiting_procurement','processing','awaiting_courier','courier_assigned','out_for_delivery','completed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','awaiting_verification','paid','failed','refunded');
CREATE TYPE public.payment_method AS ENUM ('paystack','cash');
CREATE TYPE public.item_availability AS ENUM ('pending','found','unavailable','substituted');
CREATE TYPE public.approval_status AS ENUM ('not_required','pending','approved','rejected');
CREATE TYPE public.courier_availability AS ENUM ('available','busy','offline');
CREATE TYPE public.courier_approval AS ENUM ('pending','approved','rejected');
CREATE TYPE public.assignment_status AS ENUM ('assigned','accepted','picked_up','delivered','failed','cancelled');
CREATE TYPE public.device_session_status AS ENUM ('active','revoked','signed_out');
CREATE TYPE public.procurement_status AS ENUM ('assigned','in_progress','done');

-- ============ STAFF / RBAC ============
CREATE TABLE public.staff_profiles (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text,
  status public.staff_status NOT NULL DEFAULT 'active',
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  category text NOT NULL,
  description text NOT NULL
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_roles (
  user_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
GRANT SELECT ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  auth_session_id uuid NOT NULL UNIQUE,
  device_id text NOT NULL,
  device_name text,
  platform text,
  app_version text,
  status public.device_session_status NOT NULL DEFAULT 'active',
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_reason text
);
CREATE INDEX device_sessions_user_idx ON public.device_sessions(user_id);
GRANT SELECT ON public.device_sessions TO authenticated;
GRANT ALL ON public.device_sessions TO service_role;
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  courier_fee_kobo integer NOT NULL DEFAULT 150000 CHECK (courier_fee_kobo >= 0),
  service_fee_bps integer NOT NULL DEFAULT 1500 CHECK (service_fee_bps BETWEEN 0 AND 10000),
  cash_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.app_settings (id) VALUES (1);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ============ OPERATIONS ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  full_name text NOT NULL,
  phone text,
  vehicle text,
  approval_status public.courier_approval NOT NULL DEFAULT 'pending',
  is_active boolean NOT NULL DEFAULT true,
  availability public.courier_availability NOT NULL DEFAULT 'offline',
  last_lat double precision,
  last_lng double precision,
  last_location_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE public.order_number_seq START 1001;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('LG-' || nextval('public.order_number_seq')::text),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'new',
  payment_method public.payment_method NOT NULL DEFAULT 'paystack',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  delivery_address text NOT NULL DEFAULT '',
  delivery_landmark text,
  delivery_lat double precision,
  delivery_lng double precision,
  customer_instructions text,
  procurement_notes text,
  internal_notes text,
  service_fee_bps integer NOT NULL DEFAULT 1500,
  goods_subtotal_kobo bigint NOT NULL DEFAULT 0,
  service_fee_kobo bigint NOT NULL DEFAULT 0,
  courier_fee_kobo bigint NOT NULL DEFAULT 150000,
  discount_kobo bigint NOT NULL DEFAULT 0 CHECK (discount_kobo >= 0),
  total_kobo bigint NOT NULL DEFAULT 0,
  assigned_courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_created_idx ON public.orders(created_at DESC);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  quantity numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text NOT NULL DEFAULT 'piece',
  target_price_kobo bigint CHECK (target_price_kobo IS NULL OR target_price_kobo >= 0),
  actual_price_kobo bigint CHECK (actual_price_kobo IS NULL OR actual_price_kobo >= 0),
  availability public.item_availability NOT NULL DEFAULT 'pending',
  substitute_name text,
  substitute_price_kobo bigint CHECK (substitute_price_kobo IS NULL OR substitute_price_kobo >= 0),
  approval_status public.approval_status NOT NULL DEFAULT 'not_required',
  procurement_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  from_status public.order_status,
  to_status public.order_status,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON public.order_events(order_id, created_at);
GRANT SELECT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.procurement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
  runner_name text,
  instructions text,
  status public.procurement_status NOT NULL DEFAULT 'assigned',
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.procurement_assignments TO authenticated;
GRANT ALL ON public.procurement_assignments TO service_role;
ALTER TABLE public.procurement_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.courier_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  status public.assignment_status NOT NULL DEFAULT 'assigned',
  package_count integer NOT NULL DEFAULT 1 CHECK (package_count > 0),
  notes text,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX courier_assignments_courier_idx ON public.courier_assignments(courier_id, status);
CREATE UNIQUE INDEX courier_assignments_one_open_per_order ON public.courier_assignments(order_id) WHERE status IN ('assigned','accepted','picked_up');
GRANT SELECT ON public.courier_assignments TO authenticated;
GRANT ALL ON public.courier_assignments TO service_role;
ALTER TABLE public.courier_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.courier_assignments(id) ON DELETE SET NULL,
  courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  is_issue boolean NOT NULL DEFAULT false,
  message text,
  lat double precision,
  lng double precision,
  source text NOT NULL DEFAULT 'courier_app',
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_events_order_idx ON public.delivery_events(order_id, created_at);
GRANT SELECT ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider public.payment_method NOT NULL,
  reference text NOT NULL UNIQUE,
  amount_kobo bigint NOT NULL CHECK (amount_kobo >= 0),
  status public.payment_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  verified_via text,
  verified_by uuid,
  failure_reason text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON public.payments(order_id);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ CORE SECURITY FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.current_auth_session_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT NULLIF(auth.jwt() ->> 'session_id', '')::uuid
$$;

-- Active staff whose current login session is registered and not revoked.
CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles sp
    WHERE sp.user_id = _user_id AND sp.status = 'active'
  ) AND EXISTS (
    SELECT 1 FROM public.device_sessions ds
    WHERE ds.user_id = _user_id
      AND ds.auth_session_id = public.current_auth_session_id()
      AND ds.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_staff(_user_id) AND EXISTS (
    SELECT 1 FROM public.staff_roles sr
    JOIN public.role_permissions rp ON rp.role_id = sr.role_id
    WHERE sr.user_id = _user_id AND rp.permission_key = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.require_permission(_permission text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_permission(auth.uid(), _permission) THEN
    RAISE EXCEPTION 'permission_denied: %', _permission USING ERRCODE = '42501';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _entity_type text, _entity_id text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_details, '{}'::jsonb))
$$;

-- ============ RLS POLICIES ============
-- staff: own profile always (so a suspended user can see why); others need staff.manage
CREATE POLICY "Own staff profile" ON public.staff_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Managers view staff" ON public.staff_profiles FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'staff.manage') OR public.has_permission(auth.uid(), 'procurement.assign'));

CREATE POLICY "Staff read roles" ON public.roles FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));
CREATE POLICY "Staff read permissions" ON public.permissions FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));
CREATE POLICY "Staff read role permissions" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));
CREATE POLICY "Own roles or managers" ON public.staff_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'staff.manage'));

CREATE POLICY "Own sessions or managers" ON public.device_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_permission(auth.uid(), 'staff.manage'));

CREATE POLICY "Audit viewers" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'audit.view'));

CREATE POLICY "Staff read settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Customer viewers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'customers.view'));

CREATE POLICY "Courier viewers" ON public.couriers FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'couriers.view') OR public.has_permission(auth.uid(), 'deliveries.view'));

CREATE POLICY "Order viewers" ON public.orders FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.view'));
CREATE POLICY "Order item viewers" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.view'));
CREATE POLICY "Order event viewers" ON public.order_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.view'));
CREATE POLICY "Procurement viewers" ON public.procurement_assignments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'orders.view'));
CREATE POLICY "Assignment viewers" ON public.courier_assignments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'deliveries.view') OR public.has_permission(auth.uid(), 'couriers.view'));
CREATE POLICY "Delivery event viewers" ON public.delivery_events FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'deliveries.view'));
CREATE POLICY "Payment viewers" ON public.payments FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'payments.view'));
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_active_staff(auth.uid()));

-- ============ SEED PERMISSIONS & ROLES ============
INSERT INTO public.permissions(key, category, description) VALUES
  ('dashboard.view','Dashboard','View the operations dashboard'),
  ('orders.view','Orders','View orders and shopping lists'),
  ('orders.update_status','Orders','Change order status'),
  ('orders.edit_notes','Orders','Edit internal order notes'),
  ('customers.view','Customers','View customer names and contact details'),
  ('procurement.record','Procurement','Record prices, availability and substitutions'),
  ('procurement.assign','Procurement','Assign procurement work'),
  ('couriers.view','Couriers','View couriers and availability'),
  ('couriers.assign','Couriers','Assign orders to couriers'),
  ('deliveries.view','Deliveries','Monitor deliveries'),
  ('deliveries.update','Deliveries','Record delivery issues and updates'),
  ('payments.view','Payments','View payments and references'),
  ('payments.record_cash','Payments','Confirm cash received'),
  ('payments.verify','Payments','Re-check payments with Paystack'),
  ('staff.manage','Administration','Create, suspend and manage staff accounts'),
  ('settings.manage','Administration','Change fees and global settings'),
  ('audit.view','Administration','View the audit log');

INSERT INTO public.roles(key, name, description, is_system) VALUES
  ('office_manager','Office Manager','Full access to daily operations', false),
  ('order_manager','Order Manager','Manages orders end-to-end', false),
  ('procurement_staff','Procurement Staff','Market buying and price recording', false),
  ('courier_coordinator','Courier Coordinator','Assigns couriers and monitors deliveries', false),
  ('finance_staff','Finance / Payments Staff','Payments and reconciliation', false),
  ('read_only_operations','Read-only Operations','View-only access', false),
  ('administrator','Administrator','Staff accounts, roles and global settings', true);

INSERT INTO public.role_permissions(role_id, permission_key)
SELECT r.id, p.key FROM public.roles r CROSS JOIN public.permissions p
WHERE (r.key = 'office_manager' AND p.key NOT IN ('staff.manage','settings.manage'))
   OR (r.key = 'administrator' AND p.key IN ('dashboard.view','staff.manage','settings.manage','audit.view'))
   OR (r.key = 'order_manager' AND p.key IN ('dashboard.view','orders.view','orders.update_status','orders.edit_notes','customers.view','couriers.view','deliveries.view','payments.view'))
   OR (r.key = 'procurement_staff' AND p.key IN ('dashboard.view','orders.view','procurement.record','procurement.assign'))
   OR (r.key = 'courier_coordinator' AND p.key IN ('dashboard.view','orders.view','customers.view','couriers.view','couriers.assign','deliveries.view','deliveries.update'))
   OR (r.key = 'finance_staff' AND p.key IN ('dashboard.view','orders.view','customers.view','payments.view','payments.record_cash','payments.verify'))
   OR (r.key = 'read_only_operations' AND p.key IN ('dashboard.view','orders.view','couriers.view','deliveries.view','payments.view'));

-- ============ BOOTSTRAP FIRST ACCOUNT ============
CREATE OR REPLACE FUNCTION public.bootstrap_first_staff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff_profiles) THEN
    INSERT INTO public.staff_profiles(user_id, email, full_name)
    VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email,''), '@', 1)));
    INSERT INTO public.staff_roles(user_id, role_id)
    SELECT NEW.id, id FROM public.roles WHERE key IN ('office_manager','administrator');
    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (NEW.id, 'staff.bootstrap_first_admin', 'staff', NEW.id::text, '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_bootstrap
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_staff();

-- ============ SESSION RPCs ============
CREATE OR REPLACE FUNCTION public.register_device_session(_device_id text, _device_name text, _platform text, _app_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sid uuid := public.current_auth_session_id();
  _profile public.staff_profiles;
  _existing public.device_sessions;
BEGIN
  IF _uid IS NULL OR _sid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_signed_in');
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

CREATE OR REPLACE FUNCTION public.end_device_session()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.device_sessions SET status = 'signed_out', ended_at = now(), ended_reason = 'user_sign_out'
  WHERE auth_session_id = public.current_auth_session_id() AND user_id = auth.uid() AND status = 'active';
  INSERT INTO public.audit_logs(actor_id, action) VALUES (auth.uid(), 'auth.sign_out');
END $$;

CREATE OR REPLACE FUNCTION public.touch_device_session()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _status public.device_session_status; _staff public.staff_status;
BEGIN
  SELECT status INTO _staff FROM public.staff_profiles WHERE user_id = auth.uid();
  IF _staff IS NULL THEN RETURN 'not_staff'; END IF;
  IF _staff = 'suspended' THEN RETURN 'suspended'; END IF;
  UPDATE public.device_sessions SET last_seen_at = now()
  WHERE auth_session_id = public.current_auth_session_id() AND user_id = auth.uid()
  RETURNING status INTO _status;
  IF _status IS NULL THEN RETURN 'unregistered'; END IF;
  RETURN _status::text;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _p public.staff_profiles;
BEGIN
  SELECT * INTO _p FROM public.staff_profiles WHERE user_id = _uid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'user_id', _p.user_id, 'email', _p.email, 'full_name', _p.full_name, 'phone', _p.phone,
    'status', _p.status, 'suspended_reason', _p.suspended_reason,
    'session_active', public.is_active_staff(_uid),
    'roles', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', r.key, 'name', r.name) ORDER BY r.name)
      FROM public.staff_roles sr JOIN public.roles r ON r.id = sr.role_id WHERE sr.user_id = _uid), '[]'::jsonb),
    'permissions', COALESCE((SELECT jsonb_agg(DISTINCT rp.permission_key)
      FROM public.staff_roles sr JOIN public.role_permissions rp ON rp.role_id = sr.role_id WHERE sr.user_id = _uid), '[]'::jsonb)
  );
END $$;

CREATE OR REPLACE FUNCTION public.update_my_profile(_full_name text, _phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_staff(auth.uid()) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501'; END IF;
  IF _full_name IS NULL OR length(trim(_full_name)) < 2 OR length(_full_name) > 120 THEN RAISE EXCEPTION 'invalid_name'; END IF;
  IF _phone IS NOT NULL AND length(_phone) > 30 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
  UPDATE public.staff_profiles SET full_name = trim(_full_name), phone = NULLIF(trim(_phone), ''), updated_at = now() WHERE user_id = auth.uid();
  PERFORM public.write_audit('staff.update_own_profile', 'staff', auth.uid()::text, '{}'::jsonb);
END $$;

-- ============ TOTALS ============
CREATE OR REPLACE FUNCTION public.item_line_kobo(i public.order_items)
RETURNS bigint LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN i.availability = 'found' THEN COALESCE(i.actual_price_kobo, 0)
    WHEN i.availability = 'substituted' AND i.approval_status IN ('approved','not_required') THEN COALESCE(i.substitute_price_kobo, 0)
    WHEN i.availability = 'pending' THEN COALESCE(i.target_price_kobo, 0)
    ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.recompute_order_totals(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sub bigint; _o public.orders;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT COALESCE(SUM(public.item_line_kobo(i)), 0) INTO _sub FROM public.order_items i WHERE i.order_id = _order_id;
  UPDATE public.orders SET
    goods_subtotal_kobo = _sub,
    service_fee_kobo = ROUND(_sub * _o.service_fee_bps / 10000.0),
    total_kobo = GREATEST(0, _sub + ROUND(_sub * _o.service_fee_bps / 10000.0) + _o.courier_fee_kobo - _o.discount_kobo),
    updated_at = now()
  WHERE id = _order_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_items_recompute()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_order_totals(COALESCE(NEW.order_id, OLD.order_id));
  RETURN NULL;
END $$;
CREATE TRIGGER order_items_recompute AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trg_items_recompute();

-- snapshot fees from settings on order creation
CREATE OR REPLACE FUNCTION public.trg_orders_snapshot_fees()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _s public.app_settings;
BEGIN
  SELECT * INTO _s FROM public.app_settings WHERE id = 1;
  NEW.service_fee_bps := _s.service_fee_bps;
  NEW.courier_fee_kobo := _s.courier_fee_kobo;
  NEW.total_kobo := NEW.courier_fee_kobo - NEW.discount_kobo;
  IF NEW.payment_method = 'cash' AND NOT _s.cash_enabled THEN
    RAISE EXCEPTION 'cash_disabled';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_snapshot_fees BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_orders_snapshot_fees();

-- ============ NOTIFICATIONS FAN-OUT ============
CREATE OR REPLACE FUNCTION public.notify_staff(_permission text, _kind text, _title text, _body text, _entity_type text, _entity_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications(user_id, kind, title, body, entity_type, entity_id)
  SELECT DISTINCT sp.user_id, _kind, _title, _body, _entity_type, _entity_id
  FROM public.staff_profiles sp
  JOIN public.staff_roles sr ON sr.user_id = sp.user_id
  JOIN public.role_permissions rp ON rp.role_id = sr.role_id
  WHERE sp.status = 'active' AND rp.permission_key = _permission
$$;

CREATE OR REPLACE FUNCTION public.trg_orders_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_staff('orders.view', 'order.new', 'New order ' || NEW.order_number, NULL, 'order', NEW.id);
    INSERT INTO public.order_events(order_id, event_type, to_status, message) VALUES (NEW.id, 'created', NEW.status, 'Order received');
  ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status IN ('paid','failed') THEN
    PERFORM public.notify_staff('payments.view', 'payment.' || NEW.payment_status::text,
      'Payment ' || CASE WHEN NEW.payment_status = 'paid' THEN 'confirmed' ELSE 'failed' END || ' — ' || NEW.order_number, NULL, 'order', NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_orders_notify();

CREATE OR REPLACE FUNCTION public.trg_delivery_events_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _num text;
BEGIN
  SELECT order_number INTO _num FROM public.orders WHERE id = NEW.order_id;
  IF NEW.is_issue THEN
    PERFORM public.notify_staff('deliveries.view', 'delivery.issue', 'Delivery issue — ' || _num, NEW.message, 'order', NEW.order_id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER delivery_events_notify AFTER INSERT ON public.delivery_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_delivery_events_notify();

-- ============ OPERATIONAL RPCs ============
CREATE OR REPLACE FUNCTION public.update_order_status(_order_id uuid, _status public.order_status, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders;
BEGIN
  PERFORM public.require_permission('orders.update_status');
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF _o.status IN ('completed','cancelled') THEN RAISE EXCEPTION 'order_closed'; END IF;
  IF _status = _o.status THEN RETURN; END IF;
  IF _status = 'cancelled' AND (_note IS NULL OR length(trim(_note)) < 3) THEN RAISE EXCEPTION 'cancel_reason_required'; END IF;
  IF _status = 'completed' AND _o.payment_status <> 'paid' THEN RAISE EXCEPTION 'payment_not_verified'; END IF;
  IF _status IN ('courier_assigned') THEN RAISE EXCEPTION 'use_courier_assignment'; END IF;
  UPDATE public.orders SET status = _status, updated_at = now(),
    completed_at = CASE WHEN _status = 'completed' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN _status = 'cancelled' THEN now() ELSE cancelled_at END,
    cancel_reason = CASE WHEN _status = 'cancelled' THEN _note ELSE cancel_reason END
  WHERE id = _order_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, from_status, to_status, message)
  VALUES (_order_id, auth.uid(), 'status_changed', _o.status, _status, _note);
  PERFORM public.write_audit('order.status_changed', 'order', _order_id::text, jsonb_build_object('from', _o.status, 'to', _status));
END $$;

CREATE OR REPLACE FUNCTION public.update_order_notes(_order_id uuid, _internal_notes text, _procurement_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_permission(auth.uid(), 'orders.edit_notes') OR public.has_permission(auth.uid(), 'procurement.record')) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  IF length(COALESCE(_internal_notes,'')) > 4000 OR length(COALESCE(_procurement_notes,'')) > 4000 THEN RAISE EXCEPTION 'notes_too_long'; END IF;
  UPDATE public.orders SET
    internal_notes = CASE WHEN public.has_permission(auth.uid(), 'orders.edit_notes') THEN _internal_notes ELSE internal_notes END,
    procurement_notes = CASE WHEN public.has_permission(auth.uid(), 'procurement.record') THEN _procurement_notes ELSE procurement_notes END,
    updated_at = now()
  WHERE id = _order_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, message) VALUES (_order_id, auth.uid(), 'notes_updated', NULL);
END $$;

CREATE OR REPLACE FUNCTION public.record_item_procurement(_item_id uuid, _availability public.item_availability, _actual_price_kobo bigint, _substitute_name text, _substitute_price_kobo bigint, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _i public.order_items; _o public.orders;
BEGIN
  PERFORM public.require_permission('procurement.record');
  SELECT * INTO _i FROM public.order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _i.order_id;
  IF _o.status IN ('completed','cancelled','out_for_delivery') THEN RAISE EXCEPTION 'order_locked'; END IF;
  IF _availability = 'found' AND (_actual_price_kobo IS NULL OR _actual_price_kobo < 0) THEN RAISE EXCEPTION 'actual_price_required'; END IF;
  IF _availability = 'substituted' AND (_substitute_name IS NULL OR length(trim(_substitute_name)) = 0 OR _substitute_price_kobo IS NULL OR _substitute_price_kobo < 0) THEN
    RAISE EXCEPTION 'substitute_details_required';
  END IF;
  UPDATE public.order_items SET
    availability = _availability,
    actual_price_kobo = CASE WHEN _availability = 'found' THEN _actual_price_kobo ELSE NULL END,
    substitute_name = CASE WHEN _availability = 'substituted' THEN trim(_substitute_name) ELSE NULL END,
    substitute_price_kobo = CASE WHEN _availability = 'substituted' THEN _substitute_price_kobo ELSE NULL END,
    approval_status = CASE WHEN _availability = 'substituted' THEN 'pending'::public.approval_status ELSE 'not_required'::public.approval_status END,
    procurement_note = _note,
    updated_at = now()
  WHERE id = _item_id;
  IF _o.status IN ('new','awaiting_confirmation','awaiting_procurement') THEN
    UPDATE public.orders SET status = 'processing' WHERE id = _o.id;
    INSERT INTO public.order_events(order_id, actor_id, event_type, from_status, to_status, message)
    VALUES (_o.id, auth.uid(), 'status_changed', _o.status, 'processing', 'Procurement started');
  END IF;
  INSERT INTO public.order_events(order_id, actor_id, event_type, message)
  VALUES (_o.id, auth.uid(), 'item_' || _availability::text, _i.name);
  PERFORM public.write_audit('procurement.item_recorded', 'order_item', _item_id::text,
    jsonb_build_object('availability', _availability, 'actual', _actual_price_kobo, 'substitute', _substitute_name, 'substitute_price', _substitute_price_kobo));
END $$;

CREATE OR REPLACE FUNCTION public.set_substitution_approval(_item_id uuid, _approval public.approval_status, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _i public.order_items;
BEGIN
  PERFORM public.require_permission('procurement.record');
  IF _approval NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid_approval'; END IF;
  SELECT * INTO _i FROM public.order_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND OR _i.availability <> 'substituted' THEN RAISE EXCEPTION 'not_a_substitution'; END IF;
  UPDATE public.order_items SET approval_status = _approval, updated_at = now() WHERE id = _item_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, message)
  VALUES (_i.order_id, auth.uid(), 'substitution_' || _approval::text, _i.name || COALESCE(' — ' || _note, ''));
  PERFORM public.write_audit('procurement.substitution_' || _approval::text, 'order_item', _item_id::text, jsonb_build_object('note', _note));
END $$;

CREATE OR REPLACE FUNCTION public.assign_procurement(_order_id uuid, _assigned_to uuid, _runner_name text, _instructions text, _status public.procurement_status DEFAULT 'assigned')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _status = 'assigned' OR _assigned_to IS NOT NULL OR _runner_name IS NOT NULL THEN
    PERFORM public.require_permission('procurement.assign');
  ELSE
    PERFORM public.require_permission('procurement.record');
  END IF;
  IF _assigned_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff_profiles WHERE user_id = _assigned_to AND status = 'active') THEN
    RAISE EXCEPTION 'staff_not_active';
  END IF;
  INSERT INTO public.procurement_assignments(order_id, assigned_to, runner_name, instructions, status, assigned_by)
  VALUES (_order_id, _assigned_to, NULLIF(trim(_runner_name), ''), _instructions, _status, auth.uid())
  ON CONFLICT (order_id) DO UPDATE SET
    assigned_to = EXCLUDED.assigned_to, runner_name = EXCLUDED.runner_name,
    instructions = EXCLUDED.instructions, status = EXCLUDED.status, updated_at = now();
  INSERT INTO public.order_events(order_id, actor_id, event_type, message)
  VALUES (_order_id, auth.uid(), 'procurement_' || _status::text, COALESCE(_runner_name, ''));
  PERFORM public.write_audit('procurement.assignment', 'order', _order_id::text, jsonb_build_object('assigned_to', _assigned_to, 'runner', _runner_name, 'status', _status));
END $$;

CREATE OR REPLACE FUNCTION public.assign_courier(_courier_id uuid, _order_ids uuid[], _package_counts integer[], _notes text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.couriers; _oid uuid; _o public.orders; _n integer := 0; _idx integer := 0; _pc integer;
BEGIN
  PERFORM public.require_permission('couriers.assign');
  IF _order_ids IS NULL OR array_length(_order_ids, 1) IS NULL THEN RAISE EXCEPTION 'no_orders_selected'; END IF;
  IF array_length(_order_ids, 1) > 50 THEN RAISE EXCEPTION 'too_many_orders'; END IF;
  SELECT * INTO _c FROM public.couriers WHERE id = _courier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'courier_not_found'; END IF;
  IF _c.approval_status <> 'approved' OR NOT _c.is_active THEN RAISE EXCEPTION 'courier_not_eligible'; END IF;
  FOREACH _oid IN ARRAY _order_ids LOOP
    _idx := _idx + 1;
    _pc := GREATEST(1, COALESCE(_package_counts[_idx], 1));
    SELECT * INTO _o FROM public.orders WHERE id = _oid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
    IF _o.status <> 'awaiting_courier' THEN RAISE EXCEPTION 'order_not_ready: %', _o.order_number; END IF;
    INSERT INTO public.courier_assignments(order_id, courier_id, package_count, notes, assigned_by)
    VALUES (_oid, _courier_id, _pc, _notes, auth.uid());
    UPDATE public.orders SET status = 'courier_assigned', assigned_courier_id = _courier_id, updated_at = now() WHERE id = _oid;
    INSERT INTO public.order_events(order_id, actor_id, event_type, from_status, to_status, message)
    VALUES (_oid, auth.uid(), 'courier_assigned', _o.status, 'courier_assigned', _c.full_name || ' (' || _pc || ' package' || CASE WHEN _pc > 1 THEN 's' ELSE '' END || ')');
    _n := _n + 1;
  END LOOP;
  PERFORM public.write_audit('courier.assigned', 'courier', _courier_id::text, jsonb_build_object('orders', _order_ids, 'packages', _package_counts));
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_courier_assignment(_assignment_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.courier_assignments;
BEGIN
  PERFORM public.require_permission('couriers.assign');
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'reason_required'; END IF;
  SELECT * INTO _a FROM public.courier_assignments WHERE id = _assignment_id FOR UPDATE;
  IF NOT FOUND OR _a.status NOT IN ('assigned','accepted') THEN RAISE EXCEPTION 'assignment_not_cancellable'; END IF;
  UPDATE public.courier_assignments SET status = 'cancelled', updated_at = now(), notes = COALESCE(notes || E'\n', '') || 'Cancelled: ' || _reason WHERE id = _assignment_id;
  UPDATE public.orders SET status = 'awaiting_courier', assigned_courier_id = NULL, updated_at = now() WHERE id = _a.order_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, from_status, to_status, message)
  VALUES (_a.order_id, auth.uid(), 'courier_unassigned', 'courier_assigned', 'awaiting_courier', _reason);
  PERFORM public.write_audit('courier.assignment_cancelled', 'courier_assignment', _assignment_id::text, jsonb_build_object('reason', _reason));
END $$;

CREATE OR REPLACE FUNCTION public.report_delivery_issue(_order_id uuid, _message text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.courier_assignments;
BEGIN
  PERFORM public.require_permission('deliveries.update');
  IF _message IS NULL OR length(trim(_message)) < 3 OR length(_message) > 1000 THEN RAISE EXCEPTION 'message_required'; END IF;
  SELECT * INTO _a FROM public.courier_assignments WHERE order_id = _order_id ORDER BY assigned_at DESC LIMIT 1;
  INSERT INTO public.delivery_events(order_id, assignment_id, courier_id, event_type, is_issue, message, source, actor_id)
  VALUES (_order_id, _a.id, _a.courier_id, 'issue_reported', true, trim(_message), 'office', auth.uid());
  PERFORM public.write_audit('delivery.issue_reported', 'order', _order_id::text, jsonb_build_object('message', _message));
END $$;

CREATE OR REPLACE FUNCTION public.record_cash_payment(_order_id uuid, _amount_kobo bigint, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders; _s public.app_settings; _pid uuid;
BEGIN
  PERFORM public.require_permission('payments.record_cash');
  SELECT * INTO _s FROM public.app_settings WHERE id = 1;
  IF NOT _s.cash_enabled THEN RAISE EXCEPTION 'cash_disabled'; END IF;
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF _o.payment_method <> 'cash' THEN RAISE EXCEPTION 'not_cash_order'; END IF;
  IF _o.payment_status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;
  IF _amount_kobo IS NULL OR _amount_kobo <> _o.total_kobo THEN RAISE EXCEPTION 'amount_mismatch'; END IF;
  INSERT INTO public.payments(order_id, provider, reference, amount_kobo, status, verified_at, verified_via, verified_by, raw)
  VALUES (_order_id, 'cash', 'CASH-' || _o.order_number || '-' || to_char(now(), 'YYYYMMDDHH24MISS'), _amount_kobo, 'paid', now(), 'staff_cash_receipt', auth.uid(), jsonb_build_object('note', _note))
  RETURNING id INTO _pid;
  UPDATE public.orders SET payment_status = 'paid', updated_at = now() WHERE id = _order_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, message) VALUES (_order_id, auth.uid(), 'cash_received', _note);
  PERFORM public.write_audit('payment.cash_recorded', 'payment', _pid::text, jsonb_build_object('order', _order_id, 'amount', _amount_kobo));
  RETURN _pid;
END $$;

CREATE OR REPLACE FUNCTION public.dashboard_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  PERFORM public.require_permission('dashboard.view');
  SELECT jsonb_build_object(
    'total', count(*),
    'new', count(*) FILTER (WHERE status = 'new'),
    'awaiting_confirmation', count(*) FILTER (WHERE status = 'awaiting_confirmation'),
    'awaiting_procurement', count(*) FILTER (WHERE status = 'awaiting_procurement'),
    'processing', count(*) FILTER (WHERE status = 'processing'),
    'awaiting_courier', count(*) FILTER (WHERE status = 'awaiting_courier'),
    'courier_assigned', count(*) FILTER (WHERE status = 'courier_assigned'),
    'out_for_delivery', count(*) FILTER (WHERE status = 'out_for_delivery'),
    'completed', count(*) FILTER (WHERE status = 'completed'),
    'cancelled', count(*) FILTER (WHERE status = 'cancelled'),
    'paid_total_kobo', COALESCE(sum(total_kobo) FILTER (WHERE payment_status = 'paid'), 0),
    'unpaid_total_kobo', COALESCE(sum(total_kobo) FILTER (WHERE payment_status IN ('pending','awaiting_verification') AND status <> 'cancelled'), 0),
    'paid_count', count(*) FILTER (WHERE payment_status = 'paid'),
    'failed_payments', count(*) FILTER (WHERE payment_status = 'failed'),
    'pending_substitutions', (SELECT count(*) FROM public.order_items WHERE approval_status = 'pending'),
    'open_issues', (SELECT count(*) FROM public.delivery_events de WHERE de.is_issue AND de.created_at > now() - interval '48 hours'),
    'available_couriers', (SELECT count(*) FROM public.couriers WHERE approval_status = 'approved' AND is_active AND availability = 'available')
  ) INTO _r FROM public.orders;
  RETURN _r;
END $$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(_ids uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL AND (_ids IS NULL OR id = ANY(_ids))
$$;

-- Lock down function execution
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.current_auth_session_id(), public.is_active_staff(uuid), public.has_permission(uuid, text),
  public.register_device_session(text, text, text, text), public.end_device_session(), public.touch_device_session(),
  public.get_my_access(), public.update_my_profile(text, text),
  public.update_order_status(uuid, public.order_status, text), public.update_order_notes(uuid, text, text),
  public.record_item_procurement(uuid, public.item_availability, bigint, text, bigint, text),
  public.set_substitution_approval(uuid, public.approval_status, text),
  public.assign_procurement(uuid, uuid, text, text, public.procurement_status),
  public.assign_courier(uuid, uuid[], integer[], text), public.cancel_courier_assignment(uuid, text),
  public.report_delivery_issue(uuid, text), public.record_cash_payment(uuid, bigint, text),
  public.dashboard_summary(), public.mark_notifications_read(uuid[])
TO authenticated;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, text, jsonb), public.recompute_order_totals(uuid),
  public.notify_staff(text, text, text, text, text, uuid), public.require_permission(text) FROM authenticated;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders, public.order_items, public.courier_assignments,
  public.delivery_events, public.payments, public.device_sessions, public.staff_profiles, public.notifications, public.couriers;
