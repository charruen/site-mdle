'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Project, calculateSubmissionTotal } from '@/lib/projects'
import { ArrowLeft, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react'

export default function DynamicProjectReservationPage() {
  const routeParams = useParams()
  const slug = (routeParams?.slug as string) || ''

  const [project, setProject] = useState<Project | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form State
  const [buyerFirstname, setBuyerFirstname] = useState('')
  const [buyerLastname, setBuyerLastname] = useState('')
  const [buyerClass, setBuyerClass] = useState('')

  const [receiverFirstname, setReceiverFirstname] = useState('')
  const [receiverLastname, setReceiverLastname] = useState('')
  const [receiverClass, setReceiverClass] = useState('')

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasMessage, setHasMessage] = useState(false)
  const [message, setMessage] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<'ESPECES' | 'CARTE'>('ESPECES')
  const [paymentName, setPaymentName] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const initDefaultOptions = (proj: Project) => {
    const defaults: Record<string, string> = {}
    if (proj.form_config.options) {
      proj.form_config.options.forEach(opt => {
        if (opt.choices && opt.choices.length > 0) {
          defaults[opt.id] = opt.choices[0].name
        }
      })
    }
    setSelectedOptions(defaults)
  }

  useEffect(() => {
    if (!slug) return

    async function fetchProject() {
      setPageLoading(true)
      setNotFound(false)
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(slug)}`)
        if (!response.ok) {
          setNotFound(true)
          return
        }

        const { project: projectData } = await response.json() as { project: Project }
        setProject(projectData)
        initDefaultOptions(projectData)
      } catch {
        setNotFound(true)
      } finally {
        setPageLoading(false)
      }
    }

    void fetchProject()
  }, [slug])

  const handleOptionChange = (optionId: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionId]: value }))
  }

  const config = project?.form_config || {}
  const totalPrice = calculateSubmissionTotal(config, selectedOptions, quantity)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(project.slug)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerFirstname,
          buyerLastname,
          buyerClass,
          receiverFirstname,
          receiverLastname,
          receiverClass,
          selectedOptions,
          quantity,
          isAnonymous,
          hasMessage,
          message,
          paymentMethod,
          paymentName,
        }),
      })

      const result = await response.json() as { error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'Une erreur est survenue lors de la soumission. Réessaie.')
      }

      setSubmitted(true)
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Une erreur est survenue lors de la soumission. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 text-[#1B2A4A]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold">Chargement de la page de réservation...</p>
        </div>
      </div>
    )
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#1B2A4A]/10 p-8 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black">Projet introuvable</h1>
          <p className="text-xs text-[#1B2A4A]/60">
            L’opération ou le projet <strong>« {slug} »</strong> n’existe pas ou a été désactivé par la MDLE.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#1B2A4A] text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-[#F26D5B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
          </Link>
        </div>
      </div>
    )
  }

  if (!project.is_active) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#1B2A4A]/10 p-8 rounded-3xl text-center space-y-4 shadow-xl">
          <div className="text-4xl">⏳</div>
          <h1 className="text-2xl font-black">Opération Terminée</h1>
          <p className="text-xs text-[#1B2A4A]/60">
            Les réservations pour <strong>{project.title}</strong> sont actuellement fermées.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#1B2A4A] text-white font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-[#F26D5B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#1B2A4A]/10 p-8 md:p-10 rounded-3xl text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F26D5B]">Confirmation</span>
            <h2 className="text-2xl font-black mt-1">Réservation Enregistrée !</h2>
          </div>

          <p className="text-sm text-[#1B2A4A]/70 leading-relaxed bg-[#FAFAF8] p-4 rounded-2xl border border-[#1B2A4A]/5">
            {config.confirmation_text || 'Merci ! Ta commande à bien été enregistrée par la MDLE.'}
          </p>

          <div className="p-4 bg-[#1B2A4A]/5 rounded-2xl flex items-center justify-between text-sm font-bold">
            <span>Montant à régler :</span>
            <span className="text-xl font-black text-[#F26D5B]">{totalPrice.toFixed(2)} €</span>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setSubmitted(false)
                setBuyerFirstname('')
                setBuyerLastname('')
                setBuyerClass('')
                setReceiverFirstname('')
                setReceiverLastname('')
                setReceiverClass('')
                setMessage('')
                setHasMessage(false)
                setIsAnonymous(false)
                setQuantity(1)
                setPaymentMethod('ESPECES')
                setPaymentName('')
              }}
              className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl text-xs hover:bg-[#F26D5B] transition-colors shadow-md"
            >
              Passer une autre commande
            </button>
            <Link
              href="/"
              className="w-full bg-white border border-[#1B2A4A]/10 text-[#1B2A4A] font-bold py-3 rounded-xl text-xs hover:bg-gray-50 transition-colors"
            >
              Retour à l’accueil MDLE
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] p-4 md:p-10 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header avec lien retour */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#F26D5B] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Accueil MDLE
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-[#F26D5B] bg-[#F26D5B]/10 px-3 py-1 rounded-full">
            {project.badge_tag || 'MDLE Jean Perrin'}
          </span>
        </div>

        {/* Formulaire Principal */}
        <form onSubmit={handleSubmit} className="bg-white border border-[#1B2A4A]/10 p-6 md:p-10 rounded-3xl shadow-xl space-y-6">
          
          <div className="border-b border-[#1B2A4A]/10 pb-5 space-y-1">
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <span>{project.emoji}</span> {project.title}
            </h1>
            {project.description && (
              <p className="text-xs text-[#1B2A4A]/60 leading-relaxed">{project.description}</p>
            )}
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Section Informations Acheteur / Participant */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#1B2A4A] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#F26D5B]" />
              {config.buyer_label || 'Vos informations'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Votre Prénom"
                value={buyerFirstname}
                onChange={(e) => setBuyerFirstname(e.target.value)}
                className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                required
              />
              <input
                type="text"
                placeholder="Votre Nom"
                value={buyerLastname}
                onChange={(e) => setBuyerLastname(e.target.value)}
                className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                required
              />
            </div>
            <input
              type="text"
              placeholder="Votre Classe (ex: 1ère 3, Tle 1...)"
              value={buyerClass}
              onChange={(e) => setBuyerClass(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
              required
            />
          </div>

          {/* Section Destinataire (Si applicable) */}
          {config.has_receiver && (
            <>
              <hr className="border-[#1B2A4A]/10" />
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#1B2A4A]">
                  🎁 {config.receiver_label || 'Destinataire'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Prénom du receveur"
                    value={receiverFirstname}
                    onChange={(e) => setReceiverFirstname(e.target.value)}
                    className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nom du receveur"
                    value={receiverLastname}
                    onChange={(e) => setReceiverLastname(e.target.value)}
                    className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Sa Classe (ex: 2nd 4...)"
                  value={receiverClass}
                  onChange={(e) => setReceiverClass(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                  required
                />
              </div>
            </>
          )}

          <hr className="border-[#1B2A4A]/10" />

          {/* Section Options & Produits */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#1B2A4A]">🎟️ Choisis tes offres</h3>

            {config.options && config.options.map(opt => (
              <div key={opt.id} className="space-y-1">
                <label className="block text-xs text-[#1B2A4A]/60 font-semibold">{opt.label}</label>
                <select
                  value={selectedOptions[opt.id] || ''}
                  onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold text-[#1B2A4A]"
                >
                  {opt.choices.map((choice, index) => (
                    <option key={index} value={choice.name}>
                      {choice.name} — {choice.price.toFixed(2).replace('.', ',')} €
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Quantité */}
            {config.allow_quantity && (
              <div className="space-y-1">
                <label className="block text-xs text-[#1B2A4A]/60 font-semibold">
                  {config.quantity_label || 'Quantité'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold"
                />
              </div>
            )}

            {/* Case Anonyme */}
            {config.allow_anonymous && (
              <label className="flex items-center gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-[#F26D5B]"
                />
                <span className="text-xs font-bold text-[#1B2A4A]">
                  {config.anonymous_label || '🤫 Envoi Anonyme'}
                </span>
              </label>
            )}

            {/* Petit mot personnalisé */}
            {config.allow_message && (
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMessage}
                    onChange={(e) => setHasMessage(e.target.checked)}
                    className="w-4 h-4 accent-[#F26D5B]"
                  />
                  <span className="text-xs font-bold text-[#1B2A4A]">
                    {config.message_label || '💌 Ajouter un mot personnalisé'}
                  </span>
                </label>

                {hasMessage && (
                  <textarea
                    placeholder="Écrivez votre message personnalisé ici..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={300}
                    className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                    required={hasMessage}
                  />
                )}
              </div>
            )}
          </div>

          <hr className="border-[#1B2A4A]/10" />

          {/* Section Paiement */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#1B2A4A]">💳 Moyen de paiement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${paymentMethod === 'ESPECES' ? 'border-[#F26D5B] bg-[#F26D5B]/5' : 'border-[#1B2A4A]/10 bg-[#FAFAF8] hover:border-[#1B2A4A]/30'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ESPECES"
                  checked={paymentMethod === 'ESPECES'}
                  onChange={() => setPaymentMethod('ESPECES')}
                  className="w-5 h-5 accent-[#F26D5B]"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#1B2A4A]">Espèces</span>
                  <span className="text-xs text-[#1B2A4A]/60">Paiement au comptoir</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#1B2A4A]/5 bg-gray-50 opacity-60 cursor-not-allowed">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CARTE"
                  disabled
                  className="w-5 h-5"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-[#1B2A4A]">Carte Bancaire <span className="ml-2 text-[10px] bg-[#1B2A4A] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Bientôt</span></span>
                  <span className="text-xs text-[#1B2A4A]/60">Paiement en ligne via SumUp</span>
                </div>
              </label>
            </div>

            {paymentMethod === 'CARTE' && (
              <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-[#1B2A4A]/60">
                  Nom présent sur la carte de paiement (requis pour validation)
                </label>
                <input
                  type="text"
                  placeholder="Ex: M JEAN DUPONT"
                  value={paymentName}
                  onChange={(e) => setPaymentName(e.target.value)}
                  required={paymentMethod === 'CARTE'}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
                />
                <p className="text-[10px] text-[#1B2A4A]/50">
                  Cette information nous permet de faire le lien entre ta commande et le paiement SumUp.
                </p>
              </div>
            )}
          </div>

          {/* Pied de formulaire & Total */}
          <div className="pt-4 border-t border-[#1B2A4A]/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#1B2A4A]/60 font-semibold">Total à régler</p>
              <p className="text-2xl font-black text-[#F26D5B]">{totalPrice.toFixed(2)} €</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold px-6 py-3.5 rounded-xl transition-colors text-sm shadow-md disabled:opacity-50"
            >
              {submitting ? 'Validation en cours...' : 'Valider ma réservation →'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
