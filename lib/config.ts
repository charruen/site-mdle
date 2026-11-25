// ========================================================
// CONFIGURATION CENTRALE — SAINT-VALENTIN 2027 MDLE
// Source unique de vérité pour dates, tarifs, limites et classes
// ========================================================

export const EDITION_YEAR = 2027

// Dates officielles en fuseau Europe/Paris (UTC+1 en janvier/février)
// Début des commandes : Lundi 4 janvier 2027 à 00:00
export const SALES_START = '2027-01-04T00:00:00+01:00'

// Clôture des paiements au foyer MDLE : Vendredi 22 janvier 2027 à 17:30 (fermeture de l'établissement)
export const COUNTER_PAYMENT_DEADLINE = '2027-01-22T17:30:00+01:00'

// Clôture définitive des commandes en ligne : Dimanche 24 janvier 2027 à 23:59:59
export const ONLINE_PAYMENT_DEADLINE = '2027-01-24T23:59:59+01:00'
export const SALES_END = ONLINE_PAYMENT_DEADLINE

// Distribution officielle en classe
export const DELIVERY_DATE = '2027-02-12'
export const DELIVERY_DATE_LABEL = 'Vendredi 12 février 2027'

// Tarifs officiels MDLE
export const PRICE_PER_ROSE = 2.00
export const PRICE_MOT_DOUX = 0.50

// Limite maximale de roses par commande
export const MAX_ROSES = 20

// Horaires et localisation du comptoir Foyer MDLE
export const COUNTER_LOCATION = 'Foyer des élèves (Bâtiment C)'
export const COUNTER_HOURS = 'Tous les midis de 12h00 à 13h45 & récréations'
export const COUNTER_CLOSING_LABEL = 'Vendredi 22 janvier 2027 à 17h30'

// Contact officiel
export const CONTACT_EMAIL = 'contact@mdle-jeanperrin.fr'
export const MDLE_INSTAGRAM = '@mdle_jeanperrin'

// Liste officielle des classes du Lycée Jean Perrin pour le sélecteur
export const OFFICIAL_CLASSES = [
  // Secondes
  '2nde 1',
  '2nde 2',
  '2nde 3',
  '2nde 4',
  '2nde 5',
  '2nde 6',
  '2nde 7',
  '2nde 8',
  '2nde 9',
  // Premières Générales & Technologiques
  '1ère 1',
  '1ère 2',
  '1ère 3',
  '1ère 4',
  '1ère 5',
  '1ère 6',
  '1ère 7',
  '1ère STMG 1',
  '1ère STMG 2',
  '1ère STI2D',
  // Terminales Générales & Technologiques
  'Tle 1',
  'Tle 2',
  'Tle 3',
  'Tle 4',
  'Tle 5',
  'Tle 6',
  'Tle 7',
  'Tle STMG 1',
  'Tle STMG 2',
  'Tle STI2D',
  // Post-Bac & Enseignement Supérieur
  'BTS 1ère année',
  'BTS 2ème année',
  'CPGE 1ère année',
  'CPGE 2ème année',
  // Personnel de l'établissement
  'Professeurs / Personnel administratif / Vie Scolaire',
  // Option libre
  'Autre',
] as const

export type OfficialClass = (typeof OFFICIAL_CLASSES)[number]

/**
 * Permet de forcer l'ouverture des ventes en environnement de développement ou de test.
 */
export function isOrdersOpenOverride(): boolean {
  return process.env.ORDERS_OPEN_OVERRIDE === 'true' || process.env.NEXT_PUBLIC_ORDERS_OPEN_OVERRIDE === 'true'
}

/**
 * Vérifie si la période de vente est en cours.
 */
export function isSalesOpen(now: Date = new Date()): boolean {
  if (isOrdersOpenOverride()) return true
  const start = new Date(SALES_START)
  const end = new Date(SALES_END)
  return now >= start && now <= end
}

/**
 * Vérifie si la période de vente n'a pas encore commencé.
 */
export function isBeforeSales(now: Date = new Date()): boolean {
  if (isOrdersOpenOverride()) return false
  const start = new Date(SALES_START)
  return now < start
}

/**
 * Vérifie si les commandes sont définitivement closes.
 */
export function isSalesClosed(now: Date = new Date()): boolean {
  if (isOrdersOpenOverride()) return false
  const end = new Date(SALES_END)
  return now > end
}

/**
 * Vérifie si le guichet comptoir MDLE est encore ouvert pour les paiements en espèces.
 */
export function isCounterOpen(now: Date = new Date()): boolean {
  if (isOrdersOpenOverride()) return true
  const start = new Date(SALES_START)
  const counterDeadline = new Date(COUNTER_PAYMENT_DEADLINE)
  return now >= start && now <= counterDeadline
}

/**
 * Calcule le temps restant en jours, heures, minutes.
 */
export function getTimeRemaining(targetDateIso: string, now: Date = new Date()) {
  const diff = new Date(targetDateIso).getTime() - now.getTime()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, isPast: false }
}

/**
 * Formatage d'une date ISO en français lisible
 */
export function formatFrenchDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('fr-FR', {
      timeZone: 'Europe/Paris',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}
