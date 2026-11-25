-- ========================================================
-- MIGRATION 2027-01-01 : INITIALISATION TABLE ROSES 2027
-- MDLE Lycée Jean Perrin
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.roses_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('Europe/Paris'::text, now()) NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_class TEXT NOT NULL,
  red_roses_count INTEGER NOT NULL DEFAULT 0,
  pink_roses_count INTEGER NOT NULL DEFAULT 0,
  has_message BOOLEAN NOT NULL DEFAULT false,
  message_text TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('sumup_online', 'mdle_counter')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired')),
  sumup_checkout_id TEXT,
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  reminders_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  reminders_opt_out BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX IF NOT EXISTS idx_roses_orders_created_at ON public.roses_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roses_orders_payment_status ON public.roses_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_roses_orders_recipient_class ON public.roses_orders(recipient_class);
CREATE INDEX IF NOT EXISTS idx_roses_orders_sumup_checkout ON public.roses_orders(sumup_checkout_id);
CREATE INDEX IF NOT EXISTS idx_roses_orders_unsubscribe_token ON public.roses_orders(unsubscribe_token);

ALTER TABLE public.roses_orders ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roses_orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roses_orders', pol.policyname);
  END LOOP;
END
$$;

REVOKE ALL ON public.roses_orders FROM anon, authenticated;
