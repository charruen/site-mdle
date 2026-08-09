-- ========================================================
-- SCHEMA SUPABASE POUR LA GESTION DYNAMIQUE MDLE (PROJETS)
-- Copiez et exécutez ce script dans Supabase SQL Editor
-- ========================================================

-- 1. Table des Projets et Opérations
CREATE TABLE IF NOT EXISTS public.projects (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '🚀',
    badge_tag TEXT DEFAULT 'Opération MDLE',
    is_active BOOLEAN DEFAULT TRUE,
    has_reservation_form BOOLEAN DEFAULT TRUE,
    form_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des Soumissions / Commandes / Réservations par Projet
CREATE TABLE IF NOT EXISTS public.project_submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
    project_slug TEXT NOT NULL,
    buyer_firstname TEXT NOT NULL,
    buyer_lastname TEXT NOT NULL,
    buyer_class TEXT NOT NULL,
    receiver_firstname TEXT,
    receiver_lastname TEXT,
    receiver_class TEXT,
    selected_options JSONB DEFAULT '{}'::jsonb,
    quantity INTEGER DEFAULT 1,
    is_anonymous BOOLEAN DEFAULT FALSE,
    message TEXT,
    total_price NUMERIC(10, 2) DEFAULT 0.00,
    is_paid BOOLEAN DEFAULT FALSE,
    is_delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_slug ON public.project_submissions(project_slug);

-- Active RLS sur les tables (accès public autorisé pour le site MDLE)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des projets" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Écriture admin des projets" ON public.projects FOR ALL USING (true);

CREATE POLICY "Insertion publique des réservations" ON public.project_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Accès complet réservations" ON public.project_submissions FOR ALL USING (true);

-- 3. Insertion initiale du projet "Vente de Roses (St-Valentin)"
INSERT INTO public.projects (slug, title, description, emoji, badge_tag, is_active, has_reservation_form, form_config)
VALUES (
    'roses',
    'Vente de Roses (Saint-Valentin)',
    'Commandez une rose pour la Saint-Valentin ! Livraison directe dans les classes.',
    '🌹',
    'Opération Saint-Valentin',
    TRUE,
    TRUE,
    '{
        "buyer_label": "Vos informations",
        "has_receiver": true,
        "receiver_label": "Pour qui est la rose ?",
        "options": [
            {
                "id": "color",
                "label": "Couleur de la rose",
                "choices": [
                    { "name": "🔴 Rouge (2,00€)", "price": 2.00 },
                    { "name": "🩷 Rose (2,00€)", "price": 2.00 }
                ]
            }
        ],
        "allow_quantity": true,
        "quantity_label": "Nombre de rose(s)",
        "allow_anonymous": true,
        "anonymous_label": "🤫 Envoi Anonyme (votre nom ne sera pas donné)",
        "allow_message": true,
        "message_label": "💌 Ajouter un mot personnalisé",
        "message_price": 0.50,
        "confirmation_text": "Merci ! Rend-toi au foyer MDLE pour valider et régler ta commande."
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
