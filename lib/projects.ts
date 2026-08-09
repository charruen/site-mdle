export interface ChoiceOption {
  name: string
  price: number
}

export interface FormOption {
  id: string
  label: string
  choices: ChoiceOption[]
}

export interface ProjectFormConfig {
  buyer_label?: string
  has_receiver?: boolean
  receiver_label?: string
  options?: FormOption[]
  allow_quantity?: boolean
  quantity_label?: string
  base_price?: number
  allow_anonymous?: boolean
  anonymous_label?: string
  allow_message?: boolean
  message_label?: string
  message_price?: number
  confirmation_text?: string
}

export interface Project {
  id: number
  slug: string
  title: string
  description: string | null
  emoji: string
  badge_tag: string
  is_active: boolean
  has_reservation_form: boolean
  form_config: ProjectFormConfig
  created_at?: string
}

export interface ProjectSubmission {
  id: number
  project_id: number
  project_slug: string
  buyer_firstname: string
  buyer_lastname: string
  buyer_class: string
  receiver_firstname?: string | null
  receiver_lastname?: string | null
  receiver_class?: string | null
  selected_options?: Record<string, string>
  quantity: number
  is_anonymous?: boolean
  message?: string | null
  total_price: number
  is_paid: boolean
  is_delivered: boolean
  created_at?: string
}

// Modeles pre-definis de création rapide de projet
export const PRESET_TEMPLATES = [
  {
    id: 'gift',
    name: '🌹 Vente / Cadeau (ex: Roses, Chocolats)',
    description: 'Comprend des infos acheteur, destinataire, choix de variante, option mot doux et anonymat.',
    emoji: '🌹',
    badge_tag: 'Opération Spéciale',
    form_config: {
      buyer_label: 'Vos informations',
      has_receiver: true,
      receiver_label: 'Pour qui est la commande ?',
      options: [
        {
          id: 'variant',
          label: 'Variante / Couleur',
          choices: [
            { name: '🔴 Rouge (2,00€)', price: 2.00 },
            { name: '🩷 Rose (2,00€)', price: 2.00 }
          ]
        }
      ],
      allow_quantity: true,
      quantity_label: 'Quantité',
      allow_anonymous: true,
      anonymous_label: '🤫 Envoi Anonyme (nom masque pour le receveur)',
      allow_message: true,
      message_label: '💌 Ajouter un mot personnalisé',
      message_price: 0.50,
      confirmation_text: 'Merci ! Rend-toi au foyer MDLE pour effectuer ton reglement et valider ta commande.'
    }
  },
  {
    id: 'goodies',
    name: '👕 Goodies & Vêtements (ex: Sweat MDLE, Gourde)',
    description: 'Idéal pour vendre du merch avec sélection de taille, couleur et quantité.',
    emoji: '👕',
    badge_tag: 'Boutique MDLE',
    form_config: {
      buyer_label: 'Informations de l\'acheteur',
      has_receiver: false,
      options: [
        {
          id: 'size',
          label: 'Choix de la taille',
          choices: [
            { name: 'Taille S (25,00€)', price: 25.00 },
            { name: 'Taille M (25,00€)', price: 25.00 },
            { name: 'Taille L (25,00€)', price: 25.00 },
            { name: 'Taille XL (25,00€)', price: 25.00 }
          ]
        }
      ],
      allow_quantity: true,
      quantity_label: 'Nombre d\'articles',
      allow_anonymous: false,
      allow_message: false,
      confirmation_text: 'Commande enregistrée ! Le paiement et la remise s\'effectueront au foyer MDLE.'
    }
  },
  {
    id: 'event',
    name: '🎟️ Inscription & Événement (ex: Tournoi E-Sport, Bal)',
    description: 'Formulaire de réservation avec option de billet/entrée et message d\'information.',
    emoji: '🎟️',
    badge_tag: 'Inscription',
    form_config: {
      buyer_label: 'Informations du participant',
      has_receiver: false,
      options: [
        {
          id: 'ticket',
          label: 'Type d\'entrée',
          choices: [
            { name: 'Entrée Classique (3,00€)', price: 3.00 },
            { name: 'Entrée + Boisson (5,00€)', price: 5.00 }
          ]
        }
      ],
      allow_quantity: true,
      quantity_label: 'Nombre de places',
      allow_anonymous: false,
      allow_message: false,
      confirmation_text: 'Réservation validée ! Presente-toi au foyer MDLE pour la validation définitive.'
    }
  },
  {
    id: 'custom',
    name: '⚙️ Formulaire Personnalisé sur-mesure',
    description: 'Configurez vous-même l\'ensemble des options et des tarifs.',
    emoji: '⭐',
    badge_tag: 'Projet MDLE',
    form_config: {
      buyer_label: 'Vos coordonnées',
      has_receiver: false,
      options: [],
      allow_quantity: true,
      quantity_label: 'Quantité',
      allow_anonymous: false,
      allow_message: false,
      confirmation_text: 'Réservation bien enregistrée par la MDLE !'
    }
  }
]

// Calcul dynamique du prix total pour une soumission
export function calculateSubmissionTotal(
  config: ProjectFormConfig,
  selectedOptions: Record<string, string>,
  quantity: number,
  hasMessage: boolean
): number {
  let unitPrice = config.base_price || 0

  if (config.options && config.options.length > 0) {
    for (const opt of config.options) {
      const selectedChoiceName = selectedOptions[opt.id]
      if (selectedChoiceName) {
        const found = opt.choices.find(c => c.name === selectedChoiceName)
        if (found) {
          unitPrice += found.price
        }
      }
    }
  }

  const baseTotal = unitPrice * (quantity > 0 ? quantity : 1)
  const extraMessage = hasMessage && config.allow_message ? (config.message_price || 0) : 0

  return baseTotal + extraMessage
}
