'use client'

import React, { useState } from 'react'

type RoseColor = 'rouge' | 'rose'

type OrderResult = {
  id: string
  created_at: string
  recipient_name: string
  recipient_class: string
  red_roses_count: number
  pink_roses_count: number
  has_message: boolean
  message_text: string | null
  is_anonymous: boolean
  sender_name: string | null
  total_amount: number
  payment_method: 'sumup_online' | 'mdle_counter'
  payment_status: 'pending' | 'paid'
  sumup_checkout_id: string | null
}

const PRICE_PER_ROSE = 2.00
const PRICE_MOT_DOUX = 0.50

const CLASSES_LIST = [
  'Seconde 1',
  'Seconde 2',
  'Seconde 3',
  'Seconde 4',
  'Seconde 5',
  'Première 1',
  'Première 2',
  'Première 3',
  'Première 4 - HGGSP',
  'Terminale 1 - Maths',
  'Terminale 2',
  'Terminale 3 - SES',
  'Terminale 4',
  'Salle des Professeurs',
  'Vie Scolaire',
  'Secrétariat / CDI',
]

export default function StorePage() {
  // Quantité et couleurs individuelles
  const [roseCount, setRoseCount] = useState<number>(3)
  const [roseColors, setRoseColors] = useState<RoseColor[]>(['rouge', 'rouge', 'rose'])

  // Informations destinataire
  const [recipientName, setRecipientName] = useState('')
  const [recipientClass, setRecipientClass] = useState('')

  // Mot doux
  const [hasMotDoux, setHasMotDoux] = useState(false)
  const [motDouxText, setMotDouxText] = useState('')

  // Anonymat & expéditeur
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [senderName, setSenderName] = useState('')

  // Méthode de paiement
  const [paymentMethod, setPaymentMethod] = useState<'sumup_online' | 'mdle_counter'>('sumup_online')

  // État de soumission et modal
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<OrderResult | null>(null)
  const [paymentDone, setPaymentDone] = useState(false)

  // Calcul du montant total
  const redCount = roseColors.filter((c) => c === 'rouge').length
  const pinkCount = roseColors.filter((c) => c === 'rose').length
  const totalRoses = roseCount
  const rosesTotal = totalRoses * PRICE_PER_ROSE
  const motDouxTotal = hasMotDoux ? PRICE_MOT_DOUX : 0
  const grandTotal = rosesTotal + motDouxTotal
  const grandTotalFormatted = grandTotal.toFixed(2).replace('.', ',') + ' €'

  // Gestion de la quantité
  const updateCount = (newCount: number) => {
    if (newCount < 1 || newCount > 20) return
    setRoseCount(newCount)
    if (newCount > roseColors.length) {
      const added: RoseColor[] = Array.from(
        { length: newCount - roseColors.length },
        (_, i) => ((roseColors.length + i) % 2 === 0 ? 'rouge' : 'rose')
      )
      setRoseColors([...roseColors, ...added])
    } else {
      setRoseColors(roseColors.slice(0, newCount))
    }
  }

  const setColorAt = (index: number, color: RoseColor) => {
    const updated = [...roseColors]
    updated[index] = color
    setRoseColors(updated)
  }

  const setAllColors = (color: RoseColor) => {
    setRoseColors(Array(roseCount).fill(color))
  }

  const setRandomColors = () => {
    setRoseColors(
      Array.from({ length: roseCount }, () => (Math.random() > 0.5 ? 'rouge' : 'rose'))
    )
  }

  // Ouverture du modal de validation
  const handleOpenCheckout = () => {
    setErrorMessage('')
    if (!recipientName.trim()) {
      setErrorMessage('Veuillez indiquer le nom et prénom du destinataire.')
      const el = document.getElementById('recipient-name')
      el?.focus()
      return
    }
    if (!recipientClass.trim()) {
      setErrorMessage('Veuillez indiquer la classe ou la salle du destinataire.')
      const el = document.getElementById('recipient-class')
      el?.focus()
      return
    }
    setIsModalOpen(true)
  }

  // Envoi réel de la commande à l'API
  const handleConfirmOrder = async (simulateOnlinePayment = false) => {
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName.trim(),
          recipient_class: recipientClass.trim(),
          red_roses_count: redCount,
          pink_roses_count: pinkCount,
          has_message: hasMotDoux,
          message_text: hasMotDoux ? motDouxText.trim() : null,
          is_anonymous: isAnonymous,
          sender_name: isAnonymous ? null : senderName.trim(),
          payment_method: paymentMethod,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’enregistrement de la commande.')
      }

      setCreatedOrder(data.order)

      if (paymentMethod === 'sumup_online' && simulateOnlinePayment) {
        // Simulation ou validation directe de paiement en ligne
        setPaymentDone(true)
      } else if (paymentMethod === 'mdle_counter') {
        // Enregistrement de la réservation comptoir
        setPaymentDone(true)
      } else {
        setPaymentDone(true)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
      setErrorMessage(msg)
      alert(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setIsModalOpen(false)
    setPaymentDone(false)
    setCreatedOrder(null)
    setRecipientName('')
    setRecipientClass('')
    setMotDouxText('')
    setHasMotDoux(false)
    setSenderName('')
    setIsAnonymous(true)
    setRoseCount(3)
    setRoseColors(['rouge', 'rouge', 'rose'])
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-[1200px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-primary">MDLE</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant font-medium hidden sm:inline-block">•</span>
              <span className="font-body-md text-body-md text-on-surface-variant hidden sm:inline-block">Lycée Jean Perrin</span>
            </div>
            <span className="hidden lg:inline-flex items-center px-space-sm py-space-xs rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider">
              Opération Saint-Valentin
            </span>
          </div>
          <nav className="flex items-center gap-space-xs p-space-xs rounded-full bg-surface-container-low/60">
            <a
              href="#commander"
              className="px-space-md py-space-xs font-label-md transition-colors bg-primary text-on-primary rounded-full shadow-sm"
            >
              Commander
            </a>
            <a
              href="#faq"
              className="px-space-md py-space-xs rounded-full font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              L&apos;Opération
            </a>
            <a
              href="/admin"
              className="px-space-md py-space-xs rounded-full font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Bureau</span>
            </a>
          </nav>
          <div className="flex items-center gap-space-md">
            <span className="hidden md:inline-block font-label-sm text-label-sm text-tertiary-container bg-tertiary-fixed px-space-sm py-space-xs rounded-full font-semibold">
              14 Fév. 2025
            </span>
            <img
              alt="Logo MDLE"
              className="w-8 h-8 rounded-full object-cover shadow-[0_1px_4px_rgba(0,0,0,0.08)] bg-white p-0.5"
              src="/logo-mdle.png"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-80px)]">
        <div className="flex flex-col w-full">
          <div className="relative w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-md md:py-space-xl">
            {/* Subtle Ambient Glow Orbs */}
            <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-48 right-12 w-80 h-80 bg-tertiary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Hero Header Banner with MDLE Brand Signature */}
            <section className="mb-space-xl">
              <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-3xl p-space-lg md:p-space-xl shadow-xl shadow-surface-container-highest/20 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-space-lg md:gap-space-xl">
                  {/* MDLE Emblem */}
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-primary to-tertiary-fixed-dim rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500" />
                    <img
                      alt="Logo MDLE Lycée Jean Perrin"
                      className="relative w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-md bg-surface-container-lowest p-1"
                      src="/logo-mdle.png"
                    />
                  </div>
                  {/* Titles & Subheading */}
                  <div className="flex-1 text-center md:text-left space-y-space-xs">
                    <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      Édition Officielle 2025
                    </div>
                    <h1 className="font-headline-lg md:font-display-lg text-headline-lg md:text-display-lg text-on-surface tracking-tight leading-tight">
                      Vente de Roses <span className="text-primary font-display-lg">Saint-Valentin</span>
                    </h1>
                    <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                      Faites livrer une rose en classe le vendredi 14 février par les délégués de la MDLE. Amour secret, admiration ou amitié pure.
                    </p>
                    {/* Price & Feature Badges */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-space-sm pt-space-xs">
                      <span className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md shadow-sm">
                        <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          local_florist
                        </span>
                        2,00 € / rose fraîche
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md shadow-sm">
                        <span className="material-symbols-outlined text-[16px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                          history_edu
                        </span>
                        +0,50 € / mot doux scellé
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Livraison en classe assurée
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Error banner if validation failed */}
            {errorMessage && (
              <div className="mb-space-md p-space-md rounded-2xl bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Main Two-Column Workflow */}
            <div id="commander" className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              {/* LEFT COLUMN: Interactive Configuration Flow (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-space-lg">
                {/* 1. ROSE QUANTITY & COLOR CUSTOMIZER */}
                <section className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-space-lg md:p-space-xl shadow-lg shadow-surface-container-highest/15 space-y-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <span className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-on-surface">
                          Nombre &amp; Couleurs des Roses
                        </h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Personnalisez chaque fleur de votre bouquet
                        </p>
                      </div>
                    </div>
                    {/* Stepper Container */}
                    <div className="flex items-center gap-space-sm bg-surface-container-low px-space-sm py-1.5 rounded-full shadow-inner">
                      <button
                        aria-label="Retirer une rose"
                        onClick={() => updateCount(roseCount - 1)}
                        className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-container transition shadow-sm active:scale-95 disabled:opacity-40"
                        disabled={roseCount <= 1}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="font-headline-md text-headline-md text-on-surface w-8 text-center tabular-nums">
                        {roseCount}
                      </span>
                      <button
                        aria-label="Ajouter une rose"
                        onClick={() => updateCount(roseCount + 1)}
                        className="w-9 h-9 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center hover:bg-surface-container transition shadow-sm active:scale-95 disabled:opacity-40"
                        disabled={roseCount >= 20}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick presets pills */}
                  <div className="flex items-center gap-space-xs pt-space-xs flex-wrap">
                    <span className="font-label-sm text-label-sm text-on-surface-variant pr-1">Raccourcis :</span>
                    <button
                      onClick={() => setAllColors('rouge')}
                      className="px-space-md py-1 rounded-full bg-surface-container-low hover:bg-primary-fixed hover:text-on-primary-fixed font-label-md text-label-md text-on-surface transition active:scale-95"
                      type="button"
                    >
                      Toutes Rouges ❤️
                    </button>
                    <button
                      onClick={() => setAllColors('rose')}
                      className="px-space-md py-1 rounded-full bg-surface-container-low hover:bg-secondary-container hover:text-on-secondary-container font-label-md text-label-md text-on-surface transition active:scale-95"
                      type="button"
                    >
                      Toutes Roses 🌸
                    </button>
                    <button
                      onClick={setRandomColors}
                      className="px-space-md py-1 rounded-full bg-surface-container-low hover:bg-tertiary-fixed hover:text-on-tertiary-fixed font-label-md text-label-md text-on-surface transition active:scale-95"
                      type="button"
                    >
                      Mélange Aléatoire ✨
                    </button>
                  </div>

                  {/* Dynamic Roses Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-md pt-space-sm">
                    {roseColors.map((color, idx) => (
                      <div
                        key={idx}
                        className="p-space-sm bg-surface-container-low rounded-2xl flex flex-col gap-2 transition hover:bg-surface-container"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                            Rose #{idx + 1}
                          </span>
                          <span
                            className={`w-3 h-3 rounded-full ${
                              color === 'rouge' ? 'bg-primary' : 'bg-pink-400'
                            } shadow-xs`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-lowest rounded-xl">
                          <button
                            type="button"
                            onClick={() => setColorAt(idx, 'rouge')}
                            className={`py-1.5 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1 transition ${
                              color === 'rouge'
                                ? 'bg-primary text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <span>❤️</span>
                            <span>Rouge</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorAt(idx, 'rose')}
                            className={`py-1.5 rounded-lg font-label-sm text-label-sm flex items-center justify-center gap-1 transition ${
                              color === 'rose'
                                ? 'bg-pink-600 text-white font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <span>🌸</span>
                            <span>Rose</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 2. RECIPIENT INFORMATION (Destinataire) */}
                <section className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-space-lg md:p-space-xl shadow-lg shadow-surface-container-highest/15 space-y-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Destinataire &amp; Classe
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        L&apos;élève ou professeur qui recevra votre attention
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                    {/* Nom et prénom */}
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="recipient-name">
                        <span>Nom &amp; Prénom du destinataire</span>
                        <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="recipient-name"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full bg-surface-container-low/70 focus:bg-surface-container-lowest text-on-surface rounded-2xl px-space-md py-3 font-body-md text-body-md transition focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                          placeholder="ex. Léa Martin ou M. Dupont"
                          type="text"
                          required
                        />
                        <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          person
                        </span>
                      </div>
                    </div>
                    {/* Classe ou statut */}
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-on-surface flex items-center gap-1" htmlFor="recipient-class">
                        <span>Classe / Salle</span>
                        <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="recipient-class"
                          value={recipientClass}
                          onChange={(e) => setRecipientClass(e.target.value)}
                          className="w-full bg-surface-container-low/70 focus:bg-surface-container-lowest text-on-surface rounded-2xl px-space-md py-3 font-body-md text-body-md transition focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                          list="classes-list"
                          placeholder="ex. Terminale 2, 1ère 4, Salle des Profs..."
                          type="text"
                          required
                        />
                        <datalist id="classes-list">
                          {CLASSES_LIST.map((cls) => (
                            <option key={cls} value={cls} />
                          ))}
                        </datalist>
                        <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                          school
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Discretion Guarantee Callout */}
                  <div className="p-space-md rounded-2xl bg-surface-container flex items-start gap-space-sm text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
                      sentiment_satisfied
                    </span>
                    <div className="text-body-sm">
                      <span className="font-label-md font-bold">Engagement MDLE :</span> Distribution minutieuse assurée en toute discrétion et bienveillance entre 8h00 et 16h30 le vendredi 14 février 2025.
                    </div>
                  </div>
                </section>

                {/* 3. CUSTOM MESSAGE ("Mot Doux") & ANONYMITY */}
                <section className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-space-lg md:p-space-xl shadow-lg shadow-surface-container-highest/15 space-y-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Message Calligraphié &amp; Anonymat
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Un mot manuscrit scellé à la cire et remis avec la rose
                      </p>
                    </div>
                  </div>

                  {/* Card Toggle for Mot Doux */}
                  <div className="bg-surface-container-low/60 rounded-2xl p-space-md flex items-center justify-between transition hover:bg-surface-container-low">
                    <div className="flex items-center gap-space-sm">
                      <span className="w-10 h-10 rounded-full bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">mail</span>
                      </span>
                      <div>
                        <div className="font-label-lg text-label-lg text-on-surface font-semibold">
                          Ajouter un mot doux calligraphié (+0,50 €)
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          Rédigé sur papier texturé avec cachet MDLE officiel
                        </div>
                      </div>
                    </div>
                    {/* Custom Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="toggle-mot-doux"
                        type="checkbox"
                        checked={hasMotDoux}
                        onChange={(e) => setHasMotDoux(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-secondary-fixed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>

                  {/* Collapsible Textarea for Message */}
                  {hasMotDoux && (
                    <div className="transition-all duration-300">
                      <div className="p-space-md rounded-2xl bg-tertiary-fixed/20 space-y-space-xs relative">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1 font-semibold">
                            <span className="material-symbols-outlined text-[16px]">edit_note</span>
                            Votre texte (max 200 caractères)
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {motDouxText.length} / 200
                          </span>
                        </div>
                        <textarea
                          id="mot-doux-text"
                          value={motDouxText}
                          onChange={(e) => setMotDouxText(e.target.value.slice(0, 200))}
                          className="w-full bg-surface-container-lowest/90 text-on-surface rounded-xl p-space-sm font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-sm resize-none"
                          maxLength={200}
                          placeholder="Écrivez votre message secret, tendre ou amical ici..."
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Anonymity Toggle Card */}
                  <div className="bg-surface-container-low/60 rounded-2xl p-space-md space-y-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <span className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                        </span>
                        <div>
                          <div className="font-label-lg text-label-lg text-on-surface font-semibold">
                            Offrir en tout anonymat
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">
                            Ne révélez pas votre nom sur l&apos;étiquette de livraison
                          </div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          id="toggle-anonymous"
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-secondary-fixed rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                      </label>
                    </div>

                    {/* Dynamic State depending on anonymity */}
                    {isAnonymous ? (
                      <div className="px-space-md py-2 rounded-xl bg-surface-container-lowest font-body-sm text-body-sm text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-tertiary">lock</span>
                        <span>
                          <strong>Anonymat Garanti :</strong> Le destinataire recevra uniquement la mention{' '}
                          <em>&quot;Un admirateur ou une admiratrice secrète&quot;</em>.
                        </span>
                      </div>
                    ) : (
                      <div className="pt-space-xs">
                        <label className="font-label-md text-label-md text-on-surface mb-1 block font-semibold" htmlFor="sender-name">
                          Votre prénom et nom (affiché sur la carte)
                        </label>
                        <input
                          id="sender-name"
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          className="w-full bg-surface-container-lowest text-on-surface rounded-xl px-space-md py-2.5 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                          placeholder="ex. Thomas Roux (T°3)"
                          type="text"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* 4. PAYMENT METHOD SELECTOR */}
                <section className="bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl p-space-lg md:p-space-xl shadow-lg shadow-surface-container-highest/15 space-y-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-8 h-8 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">
                      4
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Mode de Règlement</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Directement en ligne ou au foyer du lycée
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                    {/* Method 1: SumUp Online */}
                    <div
                      onClick={() => setPaymentMethod('sumup_online')}
                      className={`cursor-pointer rounded-2xl p-space-md transition-all relative block shadow-sm hover:shadow-md ${
                        paymentMethod === 'sumup_online'
                          ? 'bg-surface-container ring-2 ring-primary/40'
                          : 'bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="material-symbols-outlined text-primary text-[24px]">contactless</span>
                          <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            En ligne sécurisé
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="payment_method"
                          value="sumup_online"
                          checked={paymentMethod === 'sumup_online'}
                          onChange={() => setPaymentMethod('sumup_online')}
                          className="accent-primary w-4 h-4 mt-1"
                        />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                        Paiement instantané certifié par <strong>SumUp</strong>. Validation immédiate de votre commande.
                      </p>
                      <div className="flex items-center gap-space-xs mt-space-sm flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          Apple Pay
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          Google Pay
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          CB
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          Visa
                        </span>
                      </div>
                    </div>

                    {/* Method 2: Counter MDLE */}
                    <div
                      onClick={() => setPaymentMethod('mdle_counter')}
                      className={`cursor-pointer rounded-2xl p-space-md transition-all relative block shadow-sm hover:shadow-md ${
                        paymentMethod === 'mdle_counter'
                          ? 'bg-surface-container ring-2 ring-primary/40'
                          : 'bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="material-symbols-outlined text-tertiary text-[24px]">storefront</span>
                          <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Au Foyer MDLE
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="payment_method"
                          value="mdle_counter"
                          checked={paymentMethod === 'mdle_counter'}
                          onChange={() => setPaymentMethod('mdle_counter')}
                          className="accent-primary w-4 h-4 mt-1"
                        />
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-sm">
                        Réglez en <strong>espèces</strong> ou <strong>CB sans contact</strong> lors des pauses récré ou entre 12h et 13h30.
                      </p>
                      <div className="flex items-center gap-space-xs mt-space-sm">
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          Espèces
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs font-semibold">
                          TPE au Foyer
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: Sticky Live Order Summary & Apple-style CTA (4 cols) */}
              <aside className="lg:col-span-4 sticky top-20 flex flex-col gap-space-md">
                {/* Summary Box */}
                <div className="bg-surface-container-lowest/95 backdrop-blur-2xl rounded-3xl p-space-lg shadow-xl shadow-surface-container-highest/20 space-y-space-md">
                  <div className="flex items-center justify-between pb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">shopping_bag</span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Récapitulatif</h3>
                    </div>
                    <span className="font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed px-2 py-0.5 rounded-full font-semibold">
                      14 Février
                    </span>
                  </div>

                  {/* Detailed dynamic breakdown */}
                  <div className="space-y-space-sm font-body-md text-body-md">
                    <div className="flex items-center justify-between text-on-surface">
                      <span>
                        {totalRoses}x Rose{totalRoses > 1 ? 's' : ''} fraîche{totalRoses > 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {(totalRoses * PRICE_PER_ROSE).toFixed(2).replace('.', ',')} €
                      </span>
                    </div>

                    {/* Color mini chips in summary */}
                    <div className="flex flex-wrap gap-1 pb-1">
                      {redCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                          {redCount}x Rouge{redCount > 1 ? 's' : ''} ❤️
                        </span>
                      )}
                      {pinkCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-900 font-label-sm text-label-sm font-semibold">
                          {pinkCount}x Rose{pinkCount > 1 ? 's' : ''} 🌸
                        </span>
                      )}
                    </div>

                    {hasMotDoux && (
                      <div className="flex items-center justify-between text-on-surface">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-tertiary">drafts</span>
                          Mot doux calligraphié
                        </span>
                        <span className="font-semibold tabular-nums">+0,50 €</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                      <span>Livraison en classe</span>
                      <span className="text-on-surface font-medium">Offerte par la MDLE</span>
                    </div>
                  </div>

                  {/* Total Due Row */}
                  <div className="pt-space-sm mt-space-sm bg-surface-container-low/50 p-space-md rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                        Total à régler
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">
                        TTC au profit des projets MDLE
                      </div>
                    </div>
                    <div className="font-display-lg text-display-lg text-primary tabular-nums font-bold">
                      {grandTotalFormatted}
                    </div>
                  </div>

                  {/* Main CTA Trigger Button */}
                  <button
                    onClick={handleOpenCheckout}
                    disabled={isSubmitting}
                    className="w-full py-4 px-space-lg rounded-full bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-space-sm transition-all duration-200 active:scale-95 group cursor-pointer disabled:opacity-60"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">
                      lock
                    </span>
                    <span>
                      {paymentMethod === 'sumup_online'
                        ? `Commander et payer (${grandTotalFormatted})`
                        : `Réserver sans payer (${grandTotalFormatted})`}
                    </span>
                  </button>

                  {/* Safe badges & MDLE Guarantee */}
                  <div className="text-center space-y-1 pt-space-xs">
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                      100% des bénéfices financent les sorties et événements lycéens.
                    </p>
                  </div>
                </div>

                {/* Secondary Info Card: Lycée Perrin MDLE FAQ */}
                <div id="faq" className="bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-space-md shadow-sm space-y-space-xs">
                  <div className="font-label-md text-label-md text-on-surface flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">help_center</span>
                    Comment se passe la distribution ?
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Les délégués de la MDLE passeront discrètement avec l&apos;autorisation du professeur dans chaque classe le vendredi 14 février. Les roses sont conservées chez notre fleuriste partenaire dans une fraîcheur absolue jusqu&apos;au matin-même.
                  </p>
                </div>
              </aside>
            </div>

            {/* Minimal Discreet Admin Access at the bottom */}
            <div className="mt-space-xl pt-space-lg text-center">
              <a
                href="/admin"
                className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-full bg-surface-container-low/60 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition font-label-sm text-label-sm opacity-60 hover:opacity-100"
              >
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Espace bureau &amp; délégués MDLE</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* SUMUP / CHECKOUT POPUP MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-inverse-surface/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setIsModalOpen(false)
          }}
        >
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-space-lg md:p-space-xl shadow-2xl relative">
            {/* Close Button */}
            {!isSubmitting && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-container-high transition"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}

            {!paymentDone ? (
              <>
                {/* Modal Header */}
                <div className="flex flex-col items-center text-center space-y-1 mb-space-md">
                  <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-1">
                    <span className="material-symbols-outlined text-[24px]">favorite</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Confirmation de Commande
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Lycée Jean Perrin • MDLE Opération Roses 2025
                  </p>
                </div>

                {/* Amount breakdown in modal */}
                <div className="bg-surface-container-low rounded-2xl p-space-md space-y-space-xs mb-space-md">
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Destinataire :</span>
                    <span className="font-medium text-on-surface">
                      {recipientName} ({recipientClass})
                    </span>
                  </div>
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Articles :</span>
                    <span className="font-medium text-on-surface">
                      {totalRoses} rose{totalRoses > 1 ? 's' : ''} ({redCount} rouge{redCount > 1 ? 's' : ''}, {pinkCount} rose{pinkCount > 1 ? 's' : ''})
                      {hasMotDoux ? ' + mot doux' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant">
                    <span>Expéditeur :</span>
                    <span className="font-medium text-on-surface">
                      {isAnonymous ? 'Anonyme 🤫' : senderName || 'Non précisé'}
                    </span>
                  </div>
                  <div className="flex justify-between font-headline-sm text-headline-sm text-on-surface pt-1 border-t border-surface-container-high">
                    <span className="font-bold">Montant Total</span>
                    <span className="text-primary font-bold">{grandTotalFormatted}</span>
                  </div>
                </div>

                {/* Dynamic actions according to selected payment method */}
                {paymentMethod === 'sumup_online' ? (
                  <div className="space-y-space-sm">
                    <button
                      onClick={() => handleConfirmOrder(true)}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-space-md rounded-2xl bg-black text-white font-label-lg text-label-lg flex items-center justify-center gap-2 hover:opacity-90 transition active:scale-98 cursor-pointer disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">contactless</span>
                      <span>
                        {isSubmitting ? 'Traitement en cours...' : 'Payer avec '}
                        <strong>Apple Pay / Google Pay</strong>
                      </span>
                    </button>
                    <button
                      onClick={() => handleConfirmOrder(true)}
                      disabled={isSubmitting}
                      className="w-full py-3 px-space-md rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">credit_card</span>
                      <span>Carte Bancaire (Passerelle SumUp)</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-space-sm text-center">
                    <div className="p-space-md rounded-2xl bg-tertiary-fixed/30 text-on-tertiary-fixed text-left space-y-1">
                      <div className="font-label-md font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                        Rendez-vous au foyer MDLE
                      </div>
                      <p className="font-body-sm text-body-sm">
                        Présentez votre prénom aux délégués au foyer du lycée avant le <strong>jeudi 13 février 17h</strong> pour régler en pièces, billets ou carte bancaire.
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmOrder(false)}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-space-md rounded-2xl bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 hover:bg-primary-container transition active:scale-98 cursor-pointer disabled:opacity-50 font-bold"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">task_alt</span>
                      <span>
                        {isSubmitting ? 'Enregistrement...' : 'Valider ma réservation sans payer'}
                      </span>
                    </button>
                  </div>
                )}
                <p className="text-center font-label-sm text-label-sm text-on-surface-variant mt-space-md">
                  MDLE Perrin • Transaction chiffrée SSL 256 bits
                </p>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-space-lg space-y-space-sm animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto flex items-center justify-center text-primary mb-2">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>
                <h4 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Commande Enregistrée !
                </h4>
                {createdOrder && (
                  <div className="inline-block px-3 py-1 rounded-full bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant font-mono">
                    Réf : #{createdOrder.id.slice(0, 8).toUpperCase()}
                  </div>
                )}
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mx-auto">
                  {paymentMethod === 'sumup_online'
                    ? 'Merci pour votre paiement en ligne ! La livraison aura lieu discrètement en classe le vendredi 14 février 2025.'
                    : 'Votre réservation est validée ! N’oubliez pas de passer au Foyer MDLE régler votre commande avant le 13 février 17h.'}
                </p>
                <div className="pt-space-md">
                  <button
                    onClick={handleResetForm}
                    className="w-full py-3 px-space-xl rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition font-bold"
                    type="button"
                  >
                    Passer une autre commande
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-surface-container-lowest/90 py-space-lg shadow-[0_-1px_6px_rgba(0,0,0,0.02)] mt-12">
        <div className="max-w-[1200px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
            <span className="font-label-md text-label-md text-on-surface font-bold">MDLE Perrin</span>
            <span>© 2025 Maison Des Lycéens</span>
            <span className="hidden sm:inline">• Tous droits réservés</span>
          </div>
          <div className="flex items-center gap-space-lg font-label-sm text-label-sm text-on-surface-variant">
            <a className="hover:text-on-surface transition-colors" href="#faq">
              Règlement de livraison
            </a>
            <a
              className="flex items-center gap-space-xs py-space-xs px-space-sm rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface hover:text-on-surface transition-all"
              href="/admin"
              title="Accès Délégués & Administration"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Espace MDLE</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
