CREATE OR REPLACE FUNCTION public.complete_procurement(_order_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders; _pending int; _subs int; _total int;
BEGIN
  PERFORM public.require_permission('procurement.record');
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF _o.status NOT IN ('new','awaiting_confirmation','awaiting_procurement','processing') THEN RAISE EXCEPTION 'order_not_in_procurement'; END IF;
  SELECT count(*), count(*) FILTER (WHERE availability = 'pending'), count(*) FILTER (WHERE availability = 'substituted' AND approval_status = 'pending')
    INTO _total, _pending, _subs FROM public.order_items WHERE order_id = _order_id;
  IF _total = 0 THEN RAISE EXCEPTION 'order_has_no_items'; END IF;
  IF _pending > 0 THEN RAISE EXCEPTION 'items_still_pending'; END IF;
  IF _subs > 0 THEN RAISE EXCEPTION 'substitutions_pending'; END IF;
  INSERT INTO public.procurement_assignments(order_id, status, assigned_by)
  VALUES (_order_id, 'done', auth.uid())
  ON CONFLICT (order_id) DO UPDATE SET status = 'done', updated_at = now();
  UPDATE public.orders SET status = 'awaiting_courier', updated_at = now() WHERE id = _order_id;
  INSERT INTO public.order_events(order_id, actor_id, event_type, from_status, to_status, message)
  VALUES (_order_id, auth.uid(), 'procurement_done', _o.status, 'awaiting_courier', COALESCE(NULLIF(trim(_note), ''), 'Procurement complete'));
  PERFORM public.notify_staff('couriers.assign', 'order.ready', 'Ready for courier — ' || _o.order_number, NULL, 'order', _order_id);
  PERFORM public.write_audit('procurement.completed', 'order', _order_id::text, jsonb_build_object('from', _o.status));
END $$;

REVOKE ALL ON FUNCTION public.complete_procurement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_procurement(uuid, text) TO authenticated;