-- ========================================================
-- SCHÉMA SUPABASE — VENTE DE ROSES SAINT-VALENTIN MDLE
-- Lycée Jean Perrin
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
  sender_name TEXT,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('sumup_online', 'mdle_counter')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  sumup_checkout_id TEXT
);

-- Index pour accélérer les tris et recherches
CREATE INDEX IF NOT EXISTS idx_roses_orders_created_at ON public.roses_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roses_orders_payment_status ON public.roses_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_roses_orders_sumup_checkout ON public.roses_orders(sumup_checkout_id);

-- Activation de Row Level Security (RLS)
ALTER TABLE public.roses_orders ENABLE ROW LEVEL SECURITY;

-- Suppression des anciennes politiques si existantes
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

-- Révocation des droits directs pour anon et authenticated
REVOKE SELECT, UPDATE, DELETE ON public.roses_orders FROM anon, authenticated;
GRANT INSERT ON public.roses_orders TO anon, authenticated;

-- Politique d'insertion publique autorisée pour les élèves passant commande
CREATE POLICY "Insertion publique des commandes de roses"
  ON public.roses_orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Remarque : La lecture, modification et suppression sont réservées au service_role
-- via les routes API admin protégées (/api/admin/roses), qui bypassent RLS par définition.
