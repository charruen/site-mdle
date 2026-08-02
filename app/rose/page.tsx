'use client'

import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function RoseOrderForm() {
  const [buyerFirstname, setBuyerFirstname] = useState('')
  const [buyerLastname, setBuyerLastname] = useState('')
  const [buyerClass, setBuyerClass] = useState('')

  const [receiverFirstname, setReceiverFirstname] = useState('')
  const [receiverLastname, setReceiverLastname] = useState('')
  const [receiverClass, setReceiverClass] = useState('')

  const [color, setColor] = useState<'Rouge' | 'Rose'>('Rouge')
  const [quantity, setQuantity] = useState(1)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [hasMessage, setHasMessage] = useState(false)
  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Calcul du prix total (2€ / rose + 0.50€ pour le mot doux)
  const totalPrice = quantity * 2 + (hasMessage ? 0.5 : 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from('rose_orders').insert([
      {
        buyer_firstname: buyerFirstname,
        buyer_lastname: buyerLastname,
        buyer_class: buyerClass,
        receiver_firstname: receiverFirstname,
        receiver_lastname: receiverLastname,
        receiver_class: receiverClass,
        color,
        quantity,
        is_anonymous: isAnonymous,
        message: hasMessage ? message : null,
        total_price: totalPrice,
        is_paid: false,
        is_delivered: false,
      },
    ])

    if (!error) {
      setSubmitted(true)
    } else {
      alert('Une erreur est survenue lors de la commande.')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#1B2A4A]/10 rounded-3xl text-center space-y-4 shadow-xl">
        <div className="text-4xl">🌹</div>
        <h2 className="text-2xl font-black text-[#1B2A4A]">Commande enregistrée !</h2>
        <p className="text-sm text-[#1B2A4A]/70">
          Merci ! Merci de te rendre au stand de la MDLE au foyer pour effectuer le règlement de <strong className="text-[#F26D5B]">{totalPrice.toFixed(2)} €</strong> et valider définitivement ta réservation.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 bg-[#1B2A4A] text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:bg-[#F26D5B] transition-colors"
        >
          Passer une autre commande
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto my-10 bg-white p-8 rounded-3xl border border-[#1B2A4A]/10 shadow-lg space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#F26D5B]">Opération Saint-Valentin</span>
        <h2 className="text-3xl font-black text-[#1B2A4A]">Commandez une Rose 🌹</h2>
      </div>

      {/* Informations Acheteur */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-[#1B2A4A] flex items-center gap-2">
          👤 Vos informations <span className="text-[10px] bg-[#1B2A4A]/5 px-2 py-0.5 rounded-full text-[#1B2A4A]/60 font-medium">(Restent confidentielles)</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Votre Prénom"
            value={buyerFirstname}
            onChange={(e) => setBuyerFirstname(e.target.value)}
            className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
            required
          />
          <input
            type="text"
            placeholder="Votre Nom"
            value={buyerLastname}
            onChange={(e) => setBuyerLastname(e.target.value)}
            className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
            required
          />
        </div>
        <input
          type="text"
          placeholder="Votre Classe (ex: 1ère 3)"
          value={buyerClass}
          onChange={(e) => setBuyerClass(e.target.value)}
          className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
          required
        />
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Informations Destinataire */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#1B2A4A]">🎁 Pour qui est la rose ?</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Prénom du receveur"
            value={receiverFirstname}
            onChange={(e) => setReceiverFirstname(e.target.value)}
            className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
            required
          />
          <input
            type="text"
            placeholder="Nom du receveur"
            value={receiverLastname}
            onChange={(e) => setReceiverLastname(e.target.value)}
            className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
            required
          />
        </div>
        <input
          type="text"
          placeholder="Sa Classe (ex: Tle 1)"
          value={receiverClass}
          onChange={(e) => setReceiverClass(e.target.value)}
          className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
          required
        />
      </div>

      <hr className="border-[#1B2A4A]/10" />

      {/* Options de la rose */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#1B2A4A]">🎨 Choix des options</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#1B2A4A]/60 font-semibold mb-1">Couleur</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value as 'Rouge' | 'Rose')}
              className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold"
            >
              <option value="Rouge">🔴 Rouge (2,00€)</option>
              <option value="Rose">🩷 Rose (2,00€)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#1B2A4A]/60 font-semibold mb-1">Nombre de rose(s)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Option Anonyme */}
        <label className="flex items-center gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 accent-[#F26D5B]"
          />
          <span className="text-xs font-bold text-[#1B2A4A]">🤫 Envoi Anonyme (votre nom ne sera pas donné au receveur)</span>
        </label>

        {/* Option Petit mot */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 bg-[#FAFAF8] rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasMessage}
              onChange={(e) => setHasMessage(e.target.checked)}
              className="w-4 h-4 accent-[#F26D5B]"
            />
            <span className="text-xs font-bold text-[#1B2A4A]">💌 Ajouter un mot personnalisé (+ 0,50 €)</span>
          </label>

          {hasMessage && (
            <textarea
              placeholder="Écrivez votre message doux ici..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={250}
              className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
              required={hasMessage}
            />
          )}
        </div>
      </div>

      {/* Résumé & Bouton */}
      <div className="pt-4 border-t border-[#1B2A4A]/10 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#1B2A4A]/60 font-semibold">Total à régler</p>
          <p className="text-2xl font-black text-[#F26D5B]">{totalPrice.toFixed(2)} €</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm shadow-md disabled:opacity-50"
        >
          {loading ? 'Validation...' : 'Commander 🌹'}
        </button>
      </div>
    </form>
  )
}