'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Lock, LogOut } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mot de passe d'administration (modifiable si besoin)
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'mdle2026'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  // Gestion des tables
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Formulaire Produit
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Boissons')
  const [newPrice, setNewPrice] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Formulaire Événement
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventPaymentLink, setEventPaymentLink] = useState('')

  useEffect(() => {
    // Vérifier si la session est mémorisée localement
    const authStatus = localStorage.getItem('mdle_admin_auth')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
      fetchData()
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem('mdle_admin_auth', 'true')
      setPasswordError(false)
      fetchData()
    } else {
      setPasswordError(true)
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('mdle_admin_auth')
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: menuData } = await supabase.from('menu_items').select('*').order('id')
    const { data: eventData } = await supabase.from('events').select('*').order('id')
    if (menuData) setMenuItems(menuData)
    if (eventData) setEvents(eventData)
    setLoading(false)
  }

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newPrice) return
    const { error } = await supabase.from('menu_items').insert([
      { title: newTitle, category: newCategory, price: newPrice, description: newDescription, is_available: true }
    ])
    if (!error) {
      setNewTitle('')
      setNewPrice('')
      setNewDescription('')
      fetchData()
    }
  }

  const toggleAvailability = async (id: number, currentStatus: boolean) => {
    await supabase.from('menu_items').update({ is_available: !currentStatus }).eq('id', id)
    fetchData()
  }

  const handleDeleteMenuItem = async (id: number) => {
    await supabase.from('menu_items').delete().eq('id', id)
    fetchData()
  }

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle || !eventDate) return
    const { error } = await supabase.from('events').insert([
      { title: eventTitle, date: eventDate, location: eventLocation, description: eventDescription, payment_link: eventPaymentLink }
    ])
    if (!error) {
      setEventTitle('')
      setEventDate('')
      setEventLocation('')
      setEventDescription('')
      setEventPaymentLink('')
      fetchData()
    }
  }

  const handleDeleteEvent = async (id: number) => {
    await supabase.from('events').delete().eq('id', id)
    fetchData()
  }

  // ÉCRAN DE CONNEXION S'IL N'EST PAS AUTHENTIFIÉ
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-4">
        <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-8 max-w-md w-full shadow-xl">
          <div className="w-12 h-12 bg-[#1B2A4A] text-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-center mb-2">Espace Administration</h1>
          <p className="text-xs text-[#1B2A4A]/60 text-center mb-6">
            Accès réservé aux membres du bureau de la MDLE.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F26D5B]"
              />
              {passwordError && (
                <p className="text-red-500 text-xs mt-1.5 font-bold text-center">Mot de passe incorrect.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    )
  }

  // TABLEAU DE BORD ADMIN
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-[#1B2A4A]/10">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Panneau de Gestion MDLE</h1>
            <p className="text-xs text-[#1B2A4A]/60 mt-1">Gestion de la cafétéria et de l'agenda en temps réel</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>

        {/* CONTENU PANNEAU : GESTION CARTE & AGENDA */}
        <div className="grid lg:grid-cols-2 gap-10">
          {/* SECTION MENU */}
          <div className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">🍔 Gestion de la Carte</h2>
            <form onSubmit={handleAddMenuItem} className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-3">
              <input type="text" placeholder="Nom de l'article" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
              <div className="grid grid-cols-2 gap-3">
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm">
                  <option value="Boissons">Boissons</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Formules">Formules</option>
                </select>
                <input type="text" placeholder="Prix (ex: 1,50€)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
              </div>
              <input type="text" placeholder="Description courte (optionnel)" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter à la Carte
              </button>
            </form>

            <div className="space-y-2">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{item.title} — <span className="text-[#F26D5B]">{item.price}</span></p>
                    <span className="text-[10px] font-bold uppercase text-[#1B2A4A]/40">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAvailability(item.id, item.is_available)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {item.is_available ? 'Disponible' : 'Rupture'}
                    </button>
                    <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION AGENDA */}
          <div className="space-y-6">
            <h2 className="text-xl font-black flex items-center gap-2">📅 Gestion de l'Agenda</h2>
            <form onSubmit={handleAddEvent} className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-3">
              <input type="text" placeholder="Titre de l'événement" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Date (ex: 25 Sept)" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
                <input type="text" placeholder="Lieu (ex: Foyer)" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              </div>
              <input type="text" placeholder="Description" value={eventDescription} onChange={e => setEventDescription(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              <input type="url" placeholder="Lien SumUp (optionnel)" value={eventPaymentLink} onChange={e => setEventPaymentLink(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Publier l'événement
              </button>
            </form>

            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{event.title}</p>
                    <p className="text-xs text-[#1B2A4A]/60">{event.date} • {event.location || 'Lieu non spécifié'}</p>
                  </div>
                  <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}