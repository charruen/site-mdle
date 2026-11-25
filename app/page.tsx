'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Heart,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Coins,
  Send,
  Lock,
  ShieldCheck,
  HelpCircle,
  X,
  ChevronDown,
  Calendar,
  MapPin,
  User,
  Mail,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import {
  EDITION_YEAR,
  SALES_START,
  SALES_END,
  DELIVERY_DATE_LABEL,
  COUNTER_CLOSING_LABEL,
  COUNTER_HOURS,
  COUNTER_LOCATION,
  PRICE_PER_ROSE,
  PRICE_MOT_DOUX,
  MAX_ROSES,
  OFFICIAL_CLASSES,
  CONTACT_EMAIL,
  MDLE_INSTAGRAM,
  isSalesOpen,
  isBeforeSales,
  isSalesClosed,
  isCounterOpen,
  getTimeRemaining,
} from '@/lib/config'

type CreatedOrder = {
  id: string
  total_amount: number
  payment_method: 'sumup_online' | 'mdle_counter'
  payment_status: string
  recipient_name: string
  recipient_class: string
  red_roses_count: number
  pink_roses_count: number
  has_message: boolean
  created_at: string
  sumup_checkout_id?: string | null
}

export default function HomePage() {
  // Quantités
  const [redCount, setRedCount] = useState(1)
  const [pinkCount, setPinkCount] = useState(0)

  // Mot doux
  const [hasMessage, setHasMessage] = useState(false)
  const [messageText, setMessageText] = useState('')

  // Destinataire
  const [recipientName, setRecipientName] = useState('')
  const [recipientClass, setRecipientClass] = useState<string>(OFFICIAL_CLASSES[0])
  const [customClass, setCustomClass] = useState('')

  // Expéditeur
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  // Règlement
  const [paymentMethod, setPaymentMethod] = useState<'sumup_online' | 'mdle_counter'>('sumup_online')

  // Honeypot anti-spam
  const [honeypot, setHoneypot] = useState('')

  // États UI
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<'none' | 'error' | 'success'>('none')
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [paymentCheckStatus, setPaymentCheckStatus] = useState<string>('pending')
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false)

  // Mode testeur activable depuis le portail admin
  const [isTestMode, setIsTestMode] = useState(false)

  // Compte à rebours temps réel
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    let isMounted = true
    fetch('/api/settings/test-mode')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.testMode) {
          setIsTestMode(true)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const salesAreOpen = isSalesOpen(now) || isTestMode
  const beforeSales = isBeforeSales(now) && !isTestMode
  const salesClosed = isSalesClosed(now) && !isTestMode
  const counterIsOpen = isCounterOpen(now) || isTestMode

  // Détermination du mode de règlement effectif
  const effectivePaymentMethod = (!counterIsOpen && paymentMethod === 'mdle_counter') ? 'sumup_online' : paymentMethod

  // Calculs
  const totalRoses = redCount + pinkCount
  const totalAmount = Number(((totalRoses * PRICE_PER_ROSE) + (hasMessage ? PRICE_MOT_DOUX : 0)).toFixed(2))

  // Compte à rebours
  const targetForCountdown = beforeSales ? SALES_START : SALES_END
  const remaining = getTimeRemaining(targetForCountdown, now)

  // Gestion des touches pour la modale accessible (Echap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal !== 'none') {
        setActiveModal('none')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModal])

  // Vérification périodique du statut SumUp quand la modale de succès est ouverte
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    if (activeModal === 'success' && createdOrder?.payment_method === 'sumup_online' && paymentCheckStatus !== 'paid') {
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${createdOrder.id}/status`)
          if (res.ok) {
            const data = await res.json()
            if (data.payment_status === 'paid') {
              setPaymentCheckStatus('paid')
            }
          }
        } catch {
          // Erreur réseau ignorée en arrière-plan
        }
      }, 5000)
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [activeModal, createdOrder, paymentCheckStatus])

  async function checkManualPaymentStatus() {
    if (!createdOrder) return
    setIsCheckingPayment(true)
    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/status`)
      if (res.ok) {
        const data = await res.json()
        setPaymentCheckStatus(data.payment_status)
      }
    } catch {
      // Ignoré
    } finally {
      setIsCheckingPayment(false)
    }
  }

  async function handleSimulatePayment() {
    if (!createdOrder) return
    setIsSimulatingPayment(true)
    try {
      const res = await fetch(`/api/orders/${createdOrder.id}/simulate-payment`, {
        method: 'POST',
      })
      if (res.ok) {
        setPaymentCheckStatus('paid')
      }
    } catch {
      // Ignoré
    } finally {
      setIsSimulatingPayment(false)
    }
  }

  // Soumission du formulaire
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!salesAreOpen) {
      setErrorMessage('La boutique n&apos;est pas ouverte aux commandes actuellement.')
      setActiveModal('error')
      return
    }

    if (totalRoses < 1) {
      setErrorMessage('Veuillez sélectionner au moins une rose.')
      setActiveModal('error')
      return
    }

    if (totalRoses > MAX_ROSES) {
      setErrorMessage(`Le maximum est de ${MAX_ROSES} roses par commande.`)
      setActiveModal('error')
      return
    }

    if (!recipientName.trim()) {
      setErrorMessage('Veuillez renseigner le nom et prénom du destinataire.')
      setActiveModal('error')
      return
    }

    const effectiveClass = recipientClass === 'Autre' ? customClass.trim() : recipientClass
    if (!effectiveClass) {
      setErrorMessage('Veuillez préciser la classe du destinataire.')
      setActiveModal('error')
      return
    }

    if (!senderName.trim()) {
      setErrorMessage('Veuillez renseigner votre prénom et nom.')
      setActiveModal('error')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!senderEmail.trim() || !emailRegex.test(senderEmail.trim())) {
      setErrorMessage('Veuillez renseigner une adresse e-mail valide pour recevoir votre confirmation.')
      setActiveModal('error')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName.trim(),
          recipient_class: effectiveClass,
          red_roses_count: redCount,
          pink_roses_count: pinkCount,
          has_message: hasMessage,
          message_text: hasMessage ? messageText.trim() : null,
          is_anonymous: isAnonymous,
          sender_name: senderName.trim(),
          sender_email: senderEmail.trim(),
          payment_method: effectivePaymentMethod,
          website: honeypot, // Champ anti-spam
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue lors de l’enregistrement de votre commande.')
      }

      setCreatedOrder(data.order)
      setPaymentCheckStatus(data.order.payment_status || 'pending')
      setActiveModal('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.'
      setErrorMessage(msg)
      setActiveModal('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8F7] text-[#231919]">
      {/* Bannière Mode Testeur si activé depuis l'administration */}
      {isTestMode && (
        <div className="bg-amber-500 text-amber-950 font-bold px-4 py-2 text-center text-xs flex items-center justify-center gap-2 shadow-inner z-40">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-900" />
          <span>
            Mode Testeur Actif (Activé par l&apos;Administration MDLE) — Vous pouvez tester l&apos;intégralité du tunnel de commande en direct.
          </span>
        </div>
      )}

      {/* En-tête / Bannière officielle */}
      <header className="bg-white border-b border-[#F6DEDC] sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[#F6DEDC] bg-[#FFF0EF] flex items-center justify-center shrink-0">
              <Image
                src="/logo-mdle.png"
                alt="Logo MDLE"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-[#b7102a] block">
                Maison Des Lycéens • Jean Perrin
              </span>
              <h1 className="text-base sm:text-lg font-bold text-[#231919] leading-tight flex items-center gap-1.5">
                Saint-Valentin {EDITION_YEAR}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFF0EF] text-[#b7102a]">
                  Officiel
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#operation"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#565e74] hover:text-[#b7102a] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              L’opération &amp; FAQ
            </a>
            <Link
              href="/admin"
              className="text-xs font-medium text-[#565e74] hover:text-[#b7102a] px-2.5 py-1.5 rounded-lg hover:bg-[#FFF0EF] transition-colors"
            >
              Espace Bureau
            </Link>
          </div>
        </div>
      </header>

      {/* Bannière d'état et Compte à rebours */}
      <div className="bg-[#b7102a] text-white py-2.5 px-4 text-center text-xs sm:text-sm font-medium shadow-inner">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {beforeSales && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 shrink-0" />
              Ouverture des commandes dans {remaining.days}j {remaining.hours}h {remaining.minutes}m (le 4 janvier 2027)
            </span>
          )}

          {salesClosed && (
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Les commandes sont closes pour l&apos;édition {EDITION_YEAR}. Rendez-vous le {DELIVERY_DATE_LABEL} pour la distribution !
            </span>
          )}

          {salesAreOpen && (
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 shrink-0 text-[#ffb3b1]" />
              <strong>Commandes ouvertes jusqu&apos;au 24 janvier 23h59</strong>
              <span className="hidden sm:inline opacity-80">•</span>
              <span className="bg-[#9b0b21] px-2 py-0.5 rounded-md font-semibold text-xs">
                Il reste {remaining.days}j {remaining.hours}h {remaining.minutes}m
              </span>
            </span>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Hero explicatif */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2.5 bg-[#FFF0EF] rounded-full text-[#b7102a] mb-3">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#231919] tracking-tight">
            Offrez une rose pour la Saint-Valentin
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#565e74] max-w-xl mx-auto">
            Faites livrer des roses rouges ou roses accompagnées d’un mot doux manuscrit, directement en classe le <strong>{DELIVERY_DATE_LABEL}</strong>.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[#565e74]">
            <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-[#F6DEDC]">
              <Calendar className="w-3.5 h-3.5 text-[#b7102a]" /> Distribution : {DELIVERY_DATE_LABEL}
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-[#F6DEDC]">
              <MapPin className="w-3.5 h-3.5 text-[#b7102a]" /> En classe au Lycée Jean Perrin
            </span>
            <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-[#F6DEDC]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#b7102a]" /> Anonymat garanti auprès du destinataire
            </span>
          </div>
        </div>

        {/* Formulaire de commande */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot invisible */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* SECTION 1 : CHOIX DES ROSES */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F6DEDC] shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <div>
                <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider">Étape 1</span>
                <h3 className="text-lg font-bold text-[#231919]">Choix des roses</h3>
              </div>
              <span className="text-xs font-semibold text-[#565e74] bg-[#FFF0EF] px-2.5 py-1 rounded-full">
                {PRICE_PER_ROSE.toFixed(2)} € / rose
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Roses Rouges */}
              <div className="bg-[#FFF8F7] border border-[#F6DEDC] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#ffdad8] flex items-center justify-center text-[#b7102a]">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#231919]">Roses Rouges</h4>
                    <p className="text-xs text-[#565e74]">Symbole de passion</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRedCount((prev) => Math.max(0, prev - 1))}
                    disabled={redCount <= 0 || !salesAreOpen}
                    className="w-8 h-8 rounded-lg bg-white border border-[#F6DEDC] text-[#231919] font-bold flex items-center justify-center disabled:opacity-40 hover:bg-[#FFF0EF] transition-colors"
                    aria-label="Diminuer les roses rouges"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-[#231919]">{redCount}</span>
                  <button
                    type="button"
                    onClick={() => setRedCount((prev) => (totalRoses < MAX_ROSES ? prev + 1 : prev))}
                    disabled={totalRoses >= MAX_ROSES || !salesAreOpen}
                    className="w-8 h-8 rounded-lg bg-white border border-[#F6DEDC] text-[#231919] font-bold flex items-center justify-center disabled:opacity-40 hover:bg-[#FFF0EF] transition-colors"
                    aria-label="Augmenter les roses rouges"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Roses Roses */}
              <div className="bg-[#FFF8F7] border border-[#F6DEDC] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#fce7e6] flex items-center justify-center text-[#db313f]">
                    <Heart className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#231919]">Roses Roses</h4>
                    <p className="text-xs text-[#565e74]">Douceur et affection</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPinkCount((prev) => Math.max(0, prev - 1))}
                    disabled={pinkCount <= 0 || !salesAreOpen}
                    className="w-8 h-8 rounded-lg bg-white border border-[#F6DEDC] text-[#231919] font-bold flex items-center justify-center disabled:opacity-40 hover:bg-[#FFF0EF] transition-colors"
                    aria-label="Diminuer les roses roses"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm text-[#231919]">{pinkCount}</span>
                  <button
                    type="button"
                    onClick={() => setPinkCount((prev) => (totalRoses < MAX_ROSES ? prev + 1 : prev))}
                    disabled={totalRoses >= MAX_ROSES || !salesAreOpen}
                    className="w-8 h-8 rounded-lg bg-white border border-[#F6DEDC] text-[#231919] font-bold flex items-center justify-center disabled:opacity-40 hover:bg-[#FFF0EF] transition-colors"
                    aria-label="Augmenter les roses roses"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-[#565e74] px-1">
              <span>Total : <strong>{totalRoses} rose{totalRoses > 1 ? 's' : ''}</strong> (max {MAX_ROSES})</span>
              <span>Sous-total roses : <strong>{(totalRoses * PRICE_PER_ROSE).toFixed(2)} €</strong></span>
            </div>
          </section>

          {/* SECTION 2 : MOT DOUX */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F6DEDC] shadow-xs">
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <div>
                <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider">Étape 2</span>
                <h3 className="text-lg font-bold text-[#231919]">Mot doux manuscrit (optionnel)</h3>
              </div>
              <span className="text-xs font-semibold text-[#565e74] bg-[#FFF0EF] px-2.5 py-1 rounded-full">
                +{PRICE_MOT_DOUX.toFixed(2)} €
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-[#FFF8F7] transition-colors">
              <input
                type="checkbox"
                checked={hasMessage}
                onChange={(e) => setHasMessage(e.target.checked)}
                disabled={!salesAreOpen}
                className="mt-1 w-4 h-4 text-[#b7102a] border-[#F6DEDC] rounded-sm focus:ring-[#b7102a]"
              />
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-[#231919] block">
                  Ajouter un mot doux manuscrit (+0,50 €)
                </span>
                <span className="text-[#565e74]">
                  Votre message sera soigneusement retranscrit à la main sur une carte spéciale MDLE et attaché à la rose.
                </span>
              </div>
            </label>

            {hasMessage && (
              <div className="mt-4 pt-3 border-t border-[#F6DEDC]">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="message_text" className="text-xs font-bold text-[#231919]">
                    Votre message (200 caractères max) :
                  </label>
                  <span className={`text-xs ${messageText.length > 180 ? 'text-[#ba1a1a] font-bold' : 'text-[#565e74]'}`}>
                    {messageText.length} / 200
                  </span>
                </div>
                <textarea
                  id="message_text"
                  rows={3}
                  maxLength={200}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={!salesAreOpen}
                  placeholder="Écris ton mot ici... (déclaration, mot d'amitié, compliment, blague...)"
                  className="w-full text-sm p-3 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] placeholder:text-[#8f6f6e] focus:bg-white transition-colors"
                />
              </div>
            )}
          </section>

          {/* SECTION 3 : DESTINATAIRE */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F6DEDC] shadow-xs">
            <div className="border-b border-[#F6DEDC] pb-3 mb-4">
              <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider">Étape 3</span>
              <h3 className="text-lg font-bold text-[#231919]">Destinataire au Lycée</h3>
              <p className="text-xs text-[#565e74]">
                Ces informations permettent au bureau MDLE de distribuer la rose dans la bonne salle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recipient_name" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Prénom et nom du destinataire <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#565e74] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="recipient_name"
                    type="text"
                    required
                    maxLength={100}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    disabled={!salesAreOpen}
                    placeholder="Ex: Camille Dupont"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] placeholder:text-[#8f6f6e] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="recipient_class" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Classe ou statut <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="recipient_class"
                    required
                    value={recipientClass}
                    onChange={(e) => setRecipientClass(e.target.value)}
                    disabled={!salesAreOpen}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] focus:bg-white appearance-none"
                  >
                    {OFFICIAL_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#565e74] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {recipientClass === 'Autre' && (
              <div className="mt-3">
                <label htmlFor="custom_class" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Précisez la salle, le service ou la localisation <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  id="custom_class"
                  type="text"
                  required
                  maxLength={50}
                  value={customClass}
                  onChange={(e) => setCustomClass(e.target.value)}
                  disabled={!salesAreOpen}
                  placeholder="Ex: Salle des professeurs, Vie scolaire, Bâtiment B..."
                  className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] placeholder:text-[#8f6f6e] focus:bg-white"
                />
              </div>
            )}
          </section>

          {/* SECTION 4 : EXPÉDITEUR & ANONYMAT */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F6DEDC] shadow-xs">
            <div className="border-b border-[#F6DEDC] pb-3 mb-4">
              <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider">Étape 4</span>
              <h3 className="text-lg font-bold text-[#231919]">Tes coordonnées</h3>
              <p className="text-xs text-[#565e74]">
                Obligatoire pour le suivi de la commande et la réception de ton reçu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sender_name" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Ton prénom et nom <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#565e74] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="sender_name"
                    type="text"
                    required
                    maxLength={100}
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    disabled={!salesAreOpen}
                    placeholder="Ex: Thomas Martin"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] placeholder:text-[#8f6f6e] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sender_email" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Ton adresse e-mail <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#565e74] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="sender_email"
                    type="email"
                    required
                    maxLength={150}
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    disabled={!salesAreOpen}
                    placeholder="Ex: thomas.martin@gmail.com"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] text-[#231919] placeholder:text-[#8f6f6e] focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-[#565e74] mt-1">
                  Tu recevras ton reçu et ta référence de commande par e-mail.
                </p>
              </div>
            </div>

            {/* Toggle Anonymat strict */}
            <div className="mt-4 pt-4 border-t border-[#F6DEDC]">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#FFF8F7] border border-[#F6DEDC]">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  disabled={!salesAreOpen}
                  className="mt-1 w-4 h-4 text-[#b7102a] border-[#F6DEDC] rounded-sm focus:ring-[#b7102a]"
                />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-[#231919] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#b7102a]" />
                    Rester anonyme pour le destinataire
                  </span>
                  <span className="text-[#565e74] block mt-0.5 text-xs">
                    Ton nom est connu uniquement du bureau MDLE, jamais du destinataire si tu choisis l&apos;anonymat.
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* SECTION 5 : MODE DE RÈGLEMENT */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F6DEDC] shadow-xs">
            <div className="border-b border-[#F6DEDC] pb-3 mb-4">
              <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider">Étape 5</span>
              <h3 className="text-lg font-bold text-[#231919]">Mode de règlement</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carte bancaire en ligne */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${effectivePaymentMethod === 'sumup_online'
                  ? 'border-[#b7102a] bg-[#FFF8F7]'
                  : 'border-[#F6DEDC] bg-white hover:bg-[#FFF8F7]'
                  }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="sumup_online"
                  checked={effectivePaymentMethod === 'sumup_online'}
                  onChange={() => setPaymentMethod('sumup_online')}
                  disabled={!salesAreOpen}
                  className="mt-1 w-4 h-4 text-[#b7102a] focus:ring-[#b7102a]"
                />
                <div>
                  <span className="font-bold text-sm text-[#231919] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#b7102a]" />
                    Carte Bancaire en ligne
                  </span>
                  <p className="text-xs text-[#565e74] mt-1">
                    Paiement sécurisé par carte (SumUp). Validation immédiate de votre commande.
                  </p>
                </div>
              </label>

              {/* Foyer MDLE Comptoir */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${!counterIsOpen
                  ? 'opacity-50 cursor-not-allowed border-[#F6DEDC] bg-gray-50'
                  : effectivePaymentMethod === 'mdle_counter'
                    ? 'border-[#b7102a] bg-[#FFF8F7] cursor-pointer'
                    : 'border-[#F6DEDC] bg-white hover:bg-[#FFF8F7] cursor-pointer'
                  }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="mdle_counter"
                  checked={effectivePaymentMethod === 'mdle_counter'}
                  onChange={() => counterIsOpen && setPaymentMethod('mdle_counter')}
                  disabled={!counterIsOpen || !salesAreOpen}
                  className="mt-1 w-4 h-4 text-[#b7102a] focus:ring-[#b7102a]"
                />
                <div>
                  <span className="font-bold text-sm text-[#231919] flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#b7102a]" />
                    Règlement au Foyer MDLE
                  </span>
                  <p className="text-xs text-[#565e74] mt-1">
                    Espèces ou CB au comptoir ({COUNTER_LOCATION}).
                    <br />
                    <strong>Date limite : {COUNTER_CLOSING_LABEL}</strong>.
                  </p>
                  {!counterIsOpen && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-[#ba1a1a]">
                      Comptoir clôturé. Règlement en ligne uniquement.
                    </span>
                  )}
                </div>
              </label>
            </div>
          </section>

          {/* RÉCAPITULATIF & SOUMISSION DESKTOP */}
          <div className="bg-white rounded-2xl p-6 border border-[#F6DEDC] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-[#565e74] block">Montant total de votre commande :</span>
              <div className="text-2xl font-black text-[#b7102a]">{totalAmount.toFixed(2)} €</div>
              <span className="text-xs text-[#565e74]">
                {totalRoses} rose{totalRoses > 1 ? 's' : ''} {hasMessage ? '+ mot doux' : ''}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !salesAreOpen || totalRoses < 1}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full font-bold text-sm text-white bg-[#b7102a] hover:bg-[#9b0b21] active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Valider ma commande ({totalAmount.toFixed(2)} €)
                </>
              )}
            </button>
          </div>
        </form>

        {/* SECTION "L'OPÉRATION" (FAQ & DÉTAILS) */}
        <section id="operation" className="mt-16 bg-white rounded-2xl p-6 sm:p-8 border border-[#F6DEDC]">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold text-[#b7102a] uppercase tracking-wider block mb-1">
              Tout savoir
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-[#231919]">
              L&apos;opération Saint-Valentin {EDITION_YEAR}
            </h3>
            <p className="text-xs sm:text-sm text-[#565e74] mt-1">
              Organisée par les élèves bénévoles de la Maison Des Lycéens et Étudiants du Lycée Jean Perrin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#231919]">
            <div className="p-4 bg-[#FFF8F7] rounded-xl border border-[#F6DEDC]">
              <h4 className="font-bold flex items-center gap-2 text-[#b7102a] mb-2">
                <Calendar className="w-4 h-4" /> Quelles sont les dates clés ?
              </h4>
              <ul className="text-xs text-[#565e74] space-y-1.5">
                <li>• <strong>4 janvier 2027</strong> : Ouverture officielle des commandes.</li>
                <li>• <strong>{COUNTER_CLOSING_LABEL}</strong> : Clôture impérative des paiements en espèces au Foyer MDLE.</li>
                <li>• <strong>Dimanche 24 janvier 2027 à 23h59</strong> : Clôture définitive des commandes en ligne.</li>
                <li>• <strong>{DELIVERY_DATE_LABEL}</strong> : Distribution des roses directement en classe.</li>
              </ul>
            </div>

            <div className="p-4 bg-[#FFF8F7] rounded-xl border border-[#F6DEDC]">
              <h4 className="font-bold flex items-center gap-2 text-[#b7102a] mb-2">
                <Coins className="w-4 h-4" /> Tarifs et options
              </h4>
              <p className="text-xs text-[#565e74] leading-relaxed">
                Le prix est fixé à <strong>{PRICE_PER_ROSE.toFixed(2)} € par rose</strong> (rouge ou rose au choix).
                L&apos;option mot doux manuscrit est à <strong>+{PRICE_MOT_DOUX.toFixed(2)} €</strong>. Chaque mot est rédigé avec soin sur une carte spéciale MDLE.
              </p>
            </div>

            <div className="p-4 bg-[#FFF8F7] rounded-xl border border-[#F6DEDC]">
              <h4 className="font-bold flex items-center gap-2 text-[#b7102a] mb-2">
                <CreditCard className="w-4 h-4" /> Comment régler sa commande ?
              </h4>
              <p className="text-xs text-[#565e74] leading-relaxed">
                Deux options au choix : soit directement par <strong>Carte Bancaire en ligne</strong> via la plateforme sécurisée SumUp, soit en <strong>espèces ou carte au Foyer MDLE</strong> ({COUNTER_LOCATION}) aux récréations et le midi ({COUNTER_HOURS}).
              </p>
            </div>

            <div className="p-4 bg-[#FFF8F7] rounded-xl border border-[#F6DEDC]">
              <h4 className="font-bold flex items-center gap-2 text-[#b7102a] mb-2">
                <Lock className="w-4 h-4" /> Comment fonctionne l&apos;anonymat ?
              </h4>
              <p className="text-xs text-[#565e74] leading-relaxed">
                Si vous cochez l&apos;option d&apos;anonymat, la carte remise au destinataire ne portera <strong>aucune mention de votre identité</strong>. Seuls les membres responsables du bureau MDLE ont accès à votre nom dans le cadre de la gestion administrative.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#F6DEDC] text-center text-xs text-[#565e74]">
            Une question ou besoin d&apos;aide ? Contactez la MDLE par e-mail à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#b7102a] font-semibold underline">
              {CONTACT_EMAIL}
            </a>{' '}
            ou via Instagram{' '}
            <a
              href={`https://instagram.com/${MDLE_INSTAGRAM}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#b7102a] hover:underline"
            >
              @{MDLE_INSTAGRAM}
            </a>.
          </div>
        </section>
      </main>

      {/* Barre collante mobile (Sticky Bottom Bar) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#F6DEDC] p-3 z-20 shadow-lg flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#565e74] block">Total :</span>
          <span className="text-lg font-black text-[#b7102a]">{totalAmount.toFixed(2)} €</span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !salesAreOpen || totalRoses < 1}
          className="px-6 py-2.5 rounded-full font-bold text-xs text-white bg-[#b7102a] hover:bg-[#9b0b21] active:scale-95 disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Commander
            </>
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#F6DEDC] py-8 px-4 text-center text-xs text-[#565e74] mt-12 mb-16 sm:mb-0">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-medium text-[#231919]">
            Maison Des Lycéens et Étudiants du Lycée Jean Perrin — Association Loi 1901
          </p>
          <p>
            Édition Saint-Valentin {EDITION_YEAR} • Distribution officielle en classe le {DELIVERY_DATE_LABEL}
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px]">
            <Link href="/admin" className="hover:text-[#b7102a] underline">
              Connexion Administration MDLE
            </Link>
            <span>•</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#b7102a] underline">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* MODALE D'ERREUR ACCESSIBLE */}
      {/* ======================================================== */}
      {activeModal === 'error' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveModal('none')}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ffdad6] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 id="error-modal-title" className="text-lg font-bold text-[#231919] mb-2">
              Action requise
            </h3>
            <p className="text-sm text-[#565e74] mb-6 leading-relaxed">
              {errorMessage || 'Une erreur est survenue lors de l’opération.'}
            </p>
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-[#231919] text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE DE SUCCÈS & PAIEMENT ACCESSIBLE */}
      {/* ======================================================== */}
      {activeModal === 'success' && createdOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
          onClick={() => setActiveModal('none')}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#F6DEDC] my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFF0EF] text-[#b7102a] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="success-modal-title" className="text-base font-bold text-[#231919]">
                    Commande enregistrée !
                  </h3>
                  <span className="text-xs text-[#565e74]">
                    Réf : <strong>#{createdOrder.id.slice(0, 8).toUpperCase()}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-[#565e74] hover:text-[#231919] p-1 rounded-lg"
                aria-label="Fermer la modale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Récapitulatif commande */}
            <div className="bg-[#FFF8F7] rounded-xl p-4 border border-[#F6DEDC] text-xs sm:text-sm space-y-1.5 mb-6">
              <div className="flex justify-between">
                <span className="text-[#565e74]">Destinataire :</span>
                <span className="font-semibold text-[#231919]">
                  {createdOrder.recipient_name} ({createdOrder.recipient_class})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565e74]">Roses :</span>
                <span className="font-semibold text-[#231919]">
                  {createdOrder.red_roses_count + createdOrder.pink_roses_count} rose(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#565e74]">Mot doux manuscrit :</span>
                <span className="font-semibold text-[#231919]">
                  {createdOrder.has_message ? 'Oui (+0,50 €)' : 'Non'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#F6DEDC] text-base font-bold">
                <span>Total à régler :</span>
                <span className="text-[#b7102a]">{createdOrder.total_amount.toFixed(2)} €</span>
              </div>
            </div>

            {/* Cas 1 : Règlement Comptoir MDLE */}
            {createdOrder.payment_method === 'mdle_counter' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FFF0EF] border border-[#F6DEDC] rounded-xl">
                  <h4 className="font-bold text-sm text-[#b7102a] mb-1 flex items-center gap-1.5">
                    <Coins className="w-4 h-4" /> Prochaine étape : Règlement au Foyer
                  </h4>
                  <p className="text-xs text-[#231919] leading-relaxed">
                    Ta commande est réservée ! Rendez-vous au <strong>{COUNTER_LOCATION}</strong> muni de ta référence <strong>#{createdOrder.id.slice(0, 8).toUpperCase()}</strong> et de ton nom pour régler en espèces ou par carte bancaire.
                  </p>
                  <p className="text-xs font-bold text-[#ba1a1a] mt-2">
                    ⚠️ Date limite impérative : {COUNTER_CLOSING_LABEL}.
                  </p>
                </div>

                <p className="text-xs text-[#565e74] text-center">
                  Un e-mail récapitulatif contenant ta référence vient de t&apos;être envoyé.
                </p>

                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="w-full py-3 bg-[#b7102a] text-white rounded-xl text-sm font-bold hover:bg-[#9b0b21] transition-colors"
                >
                  J&apos;ai noté ma référence
                </button>
              </div>
            )}

            {/* Cas 2 : Carte Bancaire SumUp */}
            {createdOrder.payment_method === 'sumup_online' && (
              <div className="space-y-4">
                {paymentCheckStatus === 'paid' ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-green-800">Paiement confirmé par carte bancaire !</h4>
                    <p className="text-xs text-green-700 mt-1">
                      Votre commande est 100% validée. Elle sera remise en classe le {DELIVERY_DATE_LABEL}.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="p-4 bg-[#FFF0EF] border border-[#F6DEDC] rounded-xl mb-4">
                      <h4 className="font-bold text-sm text-[#b7102a] mb-1 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" /> Finalisation du règlement par Carte Bancaire
                      </h4>
                      <p className="text-xs text-[#231919] leading-relaxed">
                        Pour régler en ligne de façon sécurisée, accédez au formulaire SumUp ci-dessous. Dès réception de la confirmation, votre statut sera automatiquement mis à jour.
                      </p>
                    </div>

                    {/* Boutons de paiement SumUp réel ou simulation en Mode Testeur */}
                    {createdOrder.sumup_checkout_id && (
                      <div className="space-y-3">
                        {!createdOrder.sumup_checkout_id.startsWith('test_chk_') &&
                        !createdOrder.sumup_checkout_id.startsWith('dev_') ? (
                          <a
                            href={`https://checkout.sumup.com/pay/${createdOrder.sumup_checkout_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 bg-[#b7102a] hover:bg-[#9b0b21] text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 shadow-sm transition-all"
                          >
                            <CreditCard className="w-4 h-4" />
                            Payer {createdOrder.total_amount.toFixed(2)} € sur SumUp
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : null}

                        {/* Option de simulation immédiate en mode testeur */}
                        {(isTestMode ||
                          createdOrder.sumup_checkout_id.startsWith('test_chk_') ||
                          createdOrder.sumup_checkout_id.startsWith('dev_')) && (
                          <button
                            type="button"
                            onClick={handleSimulatePayment}
                            disabled={isSimulatingPayment}
                            className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 shadow-sm transition-all"
                          >
                            <Sparkles className="w-4 h-4" />
                            {isSimulatingPayment ? 'Validation du test...' : 'Simuler un paiement CB validé (Test)'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={checkManualPaymentStatus}
                          disabled={isCheckingPayment}
                          className="w-full py-2.5 bg-white border border-[#F6DEDC] text-[#231919] hover:bg-[#FFF8F7] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                          Vérifier la confirmation de paiement
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="w-full py-2.5 text-xs font-semibold text-[#565e74] hover:text-[#231919] text-center"
                >
                  Fermer cette fenêtre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
