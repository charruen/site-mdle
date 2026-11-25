-- ========================================================
-- SCHÉMA SUPABASE — VENTE DE ROSES SAINT-VALENTIN MDLE 2027
-- Lycée Jean Perrin
-- Script idempotent : fonctionne que les tables existent ou non
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Table des commandes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roses_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT timezone('Europe/Paris'::text, now()) NOT NULL,

  -- Destinataire
  recipient_name TEXT NOT NULL,
  recipient_class TEXT NOT NULL,

  -- Commande
  red_roses_count INTEGER NOT NULL DEFAULT 0,
  pink_roses_count INTEGER NOT NULL DEFAULT 0,
  has_message BOOLEAN NOT NULL DEFAULT false,
  message_text TEXT,

  -- Expéditeur (sender_name TOUJOURS stocké, même si is_anonymous est vrai)
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,

  -- Montant et règlement
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  sumup_checkout_id TEXT,

  -- Suivi de distribution
  delivered BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,

  -- Système d'e-mails et de relances automatiques
  reminders_count INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  reminders_opt_out BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid()
);

-- Ajout des colonnes manquantes si la table existait déjà sans elles
ALTER TABLE public.roses_orders
  ADD COLUMN IF NOT EXISTS sender_email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivered BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminders_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminders_opt_out BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Contraintes CHECK idempotentes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.roses_orders'::regclass
      AND conname = 'roses_orders_payment_method_check'
  ) THEN
    ALTER TABLE public.roses_orders
      ADD CONSTRAINT roses_orders_payment_method_check
      CHECK (payment_method IN ('sumup_online', 'mdle_counter'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.roses_orders'::regclass
      AND conname = 'roses_orders_payment_status_check'
  ) THEN
    ALTER TABLE public.roses_orders
      ADD CONSTRAINT roses_orders_payment_status_check
      CHECK (payment_status IN ('pending', 'paid', 'expired'));
  END IF;
END
$$;

-- Index
CREATE INDEX IF NOT EXISTS idx_roses_orders_created_at ON public.roses_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roses_orders_payment_status ON public.roses_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_roses_orders_recipient_class ON public.roses_orders(recipient_class);
CREATE INDEX IF NOT EXISTS idx_roses_orders_sumup_checkout ON public.roses_orders(sumup_checkout_id);
CREATE INDEX IF NOT EXISTS idx_roses_orders_unsubscribe_token ON public.roses_orders(unsubscribe_token);

-- ── Table des paramètres système (Mode testeur, etc.) ────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('Europe/Paris'::text, now()) NOT NULL
);

-- ── Row Level Security (RLS) ──────────────────────────────────────────────────
ALTER TABLE public.roses_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Suppression de toutes les anciennes policies
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('roses_orders', 'app_settings')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END
$$;

-- Révocation de TOUS les accès directs pour anon et authenticated
-- Les données transitent EXCLUSIVEMENT par le backend Next.js via service_role
REVOKE ALL ON public.roses_orders FROM anon, authenticated;
REVOKE ALL ON public.app_settings FROM anon, authenticated;
