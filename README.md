# 🌹 Opération Saint-Valentin 2027 — MDLE Lycée Jean Perrin

Application web moderne, performante et sécurisée pour la vente et la gestion des roses de la Saint-Valentin organisée par la Maison Des Lycéens et des Étudiants (MDLE) du Lycée Jean Perrin.

---

## 🎯 Fonctionnalités Clés

- **Boutique Élèves Intuitive & Mobile First :**
  - Sélecteur de roses simplifié (Roses Rouges et Roses Roses, jusqu'à 20 roses max).
  - Option mot doux manuscrit (+0,50 €) avec compteur de caractères en direct (200 car. max).
  - Choix obligatoire de la classe du destinataire parmi la liste officielle du Lycée Jean Perrin.
  - Saisie obligatoire de l'e-mail de l'expéditeur pour l'envoi du reçu et du suivi.
  - Option d'anonymat garanti vis-à-vis du destinataire (le nom de l'expéditeur reste connu uniquement du bureau MDLE).
  - Bannière d'urgence et compte à rebours dynamique calculé en fuseau `Europe/Paris`.
  - Modales accessibles au clavier (touche Échap, focus trap, rôle dialog, pas d'`alert()`).

- **Paiements Sécurisés :**
  - **Carte Bancaire en ligne (SumUp) :** Intégration officielle SumUp Checkout API (cartes bancaires) avec vérification de statut et webhook sécurisé.
  - **Règlement au Foyer MDLE :** Réservation avec paiement en espèces ou CB au comptoir avant la date limite du vendredi 22 janvier 2027 à 17h30.

- **Système de Relances & Cron Automatisé :**
  - E-mails transactionnels via **Resend** (confirmation de commande, rappels automatiques, annulation).
  - Tâche planifiée (`/api/cron/reminders`) configurée via `vercel.json` (tous les jours à 16h00 UTC / 17h00 Paris).
  - Dégressivité intelligente : relances à J-14, J-10, J-7, J-5, J-3, J-2, J-1 et Jour J.
  - Protection contre le spam : max 1 relance par commande par jour calendaire Paris.
  - Lien de désinscription conforme RGPD (`/api/orders/unsubscribe?token=...`).
  - Simulation (Dry-Run) disponible depuis le tableau de bord admin.

- **Tableau de Bord Bureau MDLE (`/admin`) :**
  - Authentification sécurisée : comparaison en temps constant (`timingSafeEqual`), signature HMAC avec `ADMIN_SESSION_SECRET`, limitation anti-brute force (5 essais / 15 min / IP).
  - Recherche instantanée par élève destinataire, expéditeur réel, classe ou référence.
  - Gestion du statut de livraison en classe avec barre de progression en direct.
  - Édition des commandes et suppression sécurisée sans popups intrusives.
  - **Feuille d'émargement pour la distribution (@media print) :** Saut de page automatique par classe. Le nom réel des expéditeurs anonymes est strictement masqué ("Anonyme").
  - Export CSV complet incluant les métadonnées de paiement et de relance.

---

## 📅 Calendrier Officiel 2027 (Source unique : `lib/config.ts`)

| Étape | Date & Heure (Europe/Paris) | Détails |
|---|---|---|
| **Ouverture des commandes** | Lundi 4 janvier 2027 à 00:00 | Début des réservations en ligne et comptoir |
| **Clôture Règlement Comptoir** | Vendredi 22 janvier 2027 à 17:30 | Fin des paiements espèces au Foyer MDLE |
| **Clôture Ventes en Ligne** | Dimanche 24 janvier 2027 à 23:59:59 | Arrêt définitif des commandes |
| **Distribution officielle** | Vendredi 12 février 2027 | Passage dans les classes par le bureau MDLE |

---

## 🛠️ Stack Technique

- **Framework :** Next.js 16 (App Router, Turbopack, TypeScript)
- **Styles :** Tailwind CSS v4 avec palette chaude Saint-Valentin (contraste AA vérifié)
- **Base de données :** Supabase (PostgreSQL avec RLS activé, transactions sécurisées `service_role`)
- **Paiements :** API SumUp Checkout (Carte Bancaire)
- **E-mails :** Resend API
- **Icônes :** Lucide React

---

## ⚙️ Variables d'Environnement (`.env.local`)

Copiez `.env.example` vers `.env.local` et renseignez les valeurs :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1Ni...

# Sécurité Administrateur MDLE
ADMIN_PASSWORD=mot_de_passe_robuste_bureau
ADMIN_SESSION_SECRET=cle_secrete_aleatoire_64_caracteres_signature

# SumUp (Paiement en ligne par carte)
SUMUP_API_KEY=sup_sk_...
SUMUP_MERCHANT_CODE=...

# Resend (E-mails & Relances)
RESEND_API_KEY=re_...
EMAIL_FROM=MDLE Lycée Jean Perrin <roses@mdle-jeanperrin.fr>

# Cron de relances planifiées
CRON_SECRET=votre_cle_secrete_cron

# Mode test (Optionnel)
# ORDERS_OPEN_OVERRIDE=true
# REMINDERS_TEST_EMAIL=votre-email@exemple.fr
```

---

## 🚀 Installation & Développement Local

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   L'application est accessible sur [http://localhost:3000](http://localhost:3000).

3. **Vérification du code et build de production :**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🗄️ Initialisation de la Base de Données

Exécutez le script SQL présent dans `schema.sql` (ou `supabase/migrations/20270101_init_roses_2027.sql`) dans l'éditeur SQL de votre projet Supabase.

La table `public.roses_orders` dispose de **Row Level Security (RLS)** : tous les accès directs depuis le client (`anon` / `authenticated`) sont révoqués. Toutes les lectures et écritures transitent exclusivement par les route handlers Next.js via le `service_role`.
