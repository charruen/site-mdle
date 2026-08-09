'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, Lock, LogOut, ExternalLink, Copy, Check, Sparkles, X, Settings2, DollarSign } from 'lucide-react'
import { Project, PRESET_TEMPLATES, ProjectFormConfig } from '@/lib/projects'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  // Gestion des tables
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [tableMissingWarning, setTableMissingWarning] = useState(false)

  // Formulaire Produit
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Boissons')
  const [newPrice, setNewPrice] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Formulaire Événement
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventPrice, setEventPrice] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventPaymentLink, setEventPaymentLink] = useState('')

  // Modale Création de Projet
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projectTitle, setProjectTitle] = useState('')
  const [projectSlug, setProjectSlug] = useState('')
  const [projectEmoji, setProjectEmoji] = useState('🚀')
  const [projectBadgeTag, setProjectBadgeTag] = useState('Opération MDLE')
  const [projectDescription, setProjectDescription] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('gift')
  const [customFormConfig, setCustomFormConfig] = useState<ProjectFormConfig>(PRESET_TEMPLATES[0].form_config)

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [creatingProject, setCreatingProject] = useState(false)

  useEffect(() => {
    const authStatus = localStorage.getItem('mdle_admin_auth')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
      fetchData()
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(false)
    setLoginLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })

      if (res.ok) {
        setIsAuthenticated(true)
        localStorage.setItem('mdle_admin_auth', 'true')
        setPasswordInput('')
        fetchData()
      } else {
        setPasswordError(true)
      }
    } catch {
      setPasswordError(true)
    } finally {
      setLoginLoading(false)
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

    try {
      const { data: projectData, error: projError } = await supabase.from('projects').select('*').order('id')
      if (!projError && projectData) {
        setProjects(projectData)
        setTableMissingWarning(false)
      } else {
        setTableMissingWarning(true)
      }
    } catch {
      setTableMissingWarning(true)
    }

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
      {
        title: eventTitle,
        date: eventDate,
        location: eventLocation,
        price: eventPrice,
        description: eventDescription,
        payment_link: eventPaymentLink
      }
    ])
    if (!error) {
      setEventTitle('')
      setEventDate('')
      setEventLocation('')
      setEventPrice('')
      setEventDescription('')
      setEventPaymentLink('')
      fetchData()
    }
  }

  const handleDeleteEvent = async (id: number) => {
    await supabase.from('events').delete().eq('id', id)
    fetchData()
  }

  // GESTION DES PROJETS DYNAMIQUES & OPTIONS
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const tmpl = PRESET_TEMPLATES.find(t => t.id === templateId)
    if (tmpl) {
      setProjectEmoji(tmpl.emoji)
      setProjectBadgeTag(tmpl.badge_tag)
      // Duplication profonde pour édition indépendante
      setCustomFormConfig(JSON.parse(JSON.stringify(tmpl.form_config)))
    }
  }

  const handleTitleChange = (val: string) => {
    setProjectTitle(val)
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
    setProjectSlug(generatedSlug)
  }

  // Helpers de gestion dynamique des options et tarifs
  const handleAddOptionGroup = () => {
    const newOpts = [...(customFormConfig.options || [])]
    newOpts.push({
      id: `opt_${Date.now()}`,
      label: 'Choix / Tarifs',
      choices: [
        { name: 'Entrée Standard (5,00€)', price: 5.00 },
        { name: 'Entrée + Boisson (7,00€)', price: 7.00 }
      ]
    })
    setCustomFormConfig({ ...customFormConfig, options: newOpts })
  }

  const handleRemoveOptionGroup = (optIdx: number) => {
    const newOpts = [...(customFormConfig.options || [])]
    newOpts.splice(optIdx, 1)
    setCustomFormConfig({ ...customFormConfig, options: newOpts })
  }

  const handleAddChoice = (optIdx: number) => {
    const newOpts = [...(customFormConfig.options || [])]
    if (!newOpts[optIdx]) return
    newOpts[optIdx].choices.push({ name: 'Nouvelle option (5,00€)', price: 5.00 })
    setCustomFormConfig({ ...customFormConfig, options: newOpts })
  }

  const handleUpdateChoice = (optIdx: number, choiceIdx: number, field: 'name' | 'price', val: any) => {
    const newOpts = [...(customFormConfig.options || [])]
    if (!newOpts[optIdx] || !newOpts[optIdx].choices[choiceIdx]) return
    if (field === 'name') {
      newOpts[optIdx].choices[choiceIdx].name = val
    } else {
      newOpts[optIdx].choices[choiceIdx].price = parseFloat(val) || 0
    }
    setCustomFormConfig({ ...customFormConfig, options: newOpts })
  }

  const handleRemoveChoice = (optIdx: number, choiceIdx: number) => {
    const newOpts = [...(customFormConfig.options || [])]
    if (!newOpts[optIdx]) return
    newOpts[optIdx].choices.splice(choiceIdx, 1)
    setCustomFormConfig({ ...customFormConfig, options: newOpts })
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectTitle || !projectSlug) return

    setCreatingProject(true)
    const { error } = await supabase.from('projects').insert([
      {
        title: projectTitle,
        slug: projectSlug,
        emoji: projectEmoji || '🚀',
        badge_tag: projectBadgeTag || 'Opération MDLE',
        description: projectDescription,
        is_active: true,
        has_reservation_form: true,
        form_config: customFormConfig
      }
    ])

    if (!error) {
      setShowCreateModal(false)
      setProjectTitle('')
      setProjectSlug('')
      setProjectDescription('')
      fetchData()
    } else {
      alert("Erreur lors de la création du projet. Vérifiez que la table 'projects' existe dans Supabase (script schema.sql).")
    }
    setCreatingProject(false)
  }

  const toggleProjectActive = async (id: number, currentStatus: boolean) => {
    await supabase.from('projects').update({ is_active: !currentStatus }).eq('id', id)
    fetchData()
  }

  const handleDeleteProject = async (id: number, title: string) => {
    if (confirm(`Supprimer définitivement le projet "${title}" et toutes ses réservations ?`)) {
      await supabase.from('projects').delete().eq('id', id)
      fetchData()
    }
  }

  const copyPublicLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/p/${slug}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
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
              disabled={loginLoading}
              className="w-full bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-md disabled:opacity-50"
            >
              {loginLoading ? 'Vérification...' : 'Se connecter'}
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
            <p className="text-xs text-[#1B2A4A]/60 mt-1">Gestion de la cafétéria, de l'agenda et des projets de réservation</p>
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
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold">
                  <option value="Boissons">Boissons</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Formules">Formules</option>
                </select>
                <input type="text" placeholder="Prix (ex: 1,50€)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
              </div>
              <textarea
                rows={2}
                placeholder="Description courte (optionnel)"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm resize-y whitespace-pre-line"
              />
              <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter à la Carte
              </button>
            </form>

            <div className="space-y-2">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{item.title} — <span className="text-[#F26D5B]">{item.price}</span></p>
                    {item.description && (
                      <p className="text-xs text-[#1B2A4A]/70 whitespace-pre-line mt-1">{item.description}</p>
                    )}
                    <span className="text-[10px] font-bold uppercase text-[#1B2A4A]/40 mt-1 block">{item.category}</span>
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
                <input type="text" placeholder="Prix (ex: 5,00€ ou Gratuit)" value={eventPrice} onChange={e => setEventPrice(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Lieu (ex: Foyer)" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
                <input type="url" placeholder="Lien SumUp / Réservation (optionnel)" value={eventPaymentLink} onChange={e => setEventPaymentLink(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
              </div>

              <textarea
                rows={3}
                placeholder="Description de l'événement (multilignes acceptées)"
                value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm resize-y whitespace-pre-line"
              />

              <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Publier l'événement
              </button>
            </form>

            <div className="space-y-2">
              {events.map(event => (
                <div key={event.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">
                      {event.title}
                      {event.price && <span className="ml-2 font-bold text-[#F26D5B]">({event.price})</span>}
                    </p>
                    <p className="text-xs text-[#1B2A4A]/60">{event.date} • {event.location || 'Lieu non spécifié'}</p>
                    {event.description && (
                      <p className="text-xs text-[#1B2A4A]/80 whitespace-pre-line mt-2 bg-[#FAFAF8] p-2 rounded-lg border border-[#1B2A4A]/5">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION PROJETS / OPÉRATIONS SPÉCIALES DYNAMIQUES */}
        <div className="mt-12 pt-8 border-t border-[#1B2A4A]/10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">🚀 Projets & Opérations Dynamiques</h2>
              <p className="text-xs text-[#1B2A4A]/60">Créez et gérez vos opérations de réservation/vente avec formulaires sur-mesure et options d'entrées/tarifs.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-[#F26D5B] text-white hover:bg-[#1B2A4A] px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
            >
              <Plus className="w-4 h-4" /> Créer un nouveau Projet
            </button>
          </div>

          {tableMissingWarning && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-amber-900 text-xs font-medium space-y-1">
              <p className="font-bold">⚠️ Note de configuration Supabase :</p>
              <p>Pour activer la sauvegarde dynamique complète des projets, veuillez exécuter le script SQL <code>schema.sql</code> dans votre tableau de bord Supabase (SQL Editor).</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {projects.length === 0 && (
              <div className="col-span-full bg-white border border-[#1B2A4A]/10 p-8 rounded-2xl text-center space-y-2">
                <p className="text-sm font-bold text-[#1B2A4A]">Aucun projet créé pour l'instant.</p>
                <p className="text-xs text-[#1B2A4A]/60">Cliquez sur "Créer un nouveau Projet" ci-dessus pour lancer votre première opération.</p>
              </div>
            )}

            {/* Cartes Dynamiques des Projets */}
            {projects.map(proj => (
              <div key={proj.id} className="bg-white border border-[#1B2A4A]/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-3xl">{proj.emoji || '🚀'}</span>
                    <button
                      onClick={() => toggleProjectActive(proj.id, proj.is_active)}
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full transition ${proj.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {proj.is_active ? 'Actif' : 'Masqué'}
                    </button>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F26D5B]">
                    {proj.badge_tag}
                  </span>
                  <h3 className="font-bold text-base text-[#1B2A4A] mt-0.5">{proj.title}</h3>
                  {proj.description && (
                    <p className="text-xs text-[#1B2A4A]/60 mt-1 line-clamp-2">{proj.description}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#1B2A4A]/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`/admin/projects/${proj.id}`}
                      className="text-xs font-bold text-white bg-[#1B2A4A] hover:bg-[#F26D5B] px-3.5 py-2 rounded-xl transition shadow-sm"
                    >
                      📊 Consulter Commandes
                    </a>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyPublicLink(proj.slug)}
                        title="Copier le lien du formulaire public"
                        className="p-2 text-[#1B2A4A]/60 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition"
                      >
                        {copiedSlug === proj.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`/p/${proj.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ouvrir le formulaire public"
                        className="p-2 text-[#1B2A4A]/60 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteProject(proj.id, proj.title)}
                        title="Supprimer le projet"
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>

      {/* MODALE DE CRÉATION DE PROJET DYNAMIQUE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2A4A]/60 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-[#1B2A4A]/10 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F26D5B]" />
                  <h2 className="text-xl font-black text-[#1B2A4A]">Nouveau Projet / Opération</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-[#1B2A4A]/60 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-6">

                {/* 1. Choix du modèle */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/70">
                    1. Sélectionner un modèle de départ (Template)
                  </label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PRESET_TEMPLATES.map(tmpl => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleTemplateSelect(tmpl.id)}
                        className={`p-3 rounded-2xl text-left border transition text-xs flex items-start gap-3 ${selectedTemplateId === tmpl.id
                          ? 'border-[#F26D5B] bg-[#F26D5B]/5 ring-2 ring-[#F26D5B]/20'
                          : 'border-[#1B2A4A]/10 hover:border-[#1B2A4A]/30'
                          }`}
                      >
                        <span className="text-xl">{tmpl.emoji}</span>
                        <div>
                          <p className="font-bold text-[#1B2A4A]">{tmpl.name}</p>
                          <p className="text-[10px] text-[#1B2A4A]/60 mt-0.5">{tmpl.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Infos générales */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/70">
                    2. Informations Générales
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Titre du projet (ex: Bal de Fin d'Année)"
                        value={projectTitle}
                        onChange={e => handleTitleChange(e.target.value)}
                        className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Emoji (ex: 🎟️)"
                        value={projectEmoji}
                        onChange={e => setProjectEmoji(e.target.value)}
                        className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#1B2A4A]/50 mb-1">Identifiant URL (Slug)</label>
                      <input
                        type="text"
                        placeholder="ex: bal-fin-annee"
                        value={projectSlug}
                        onChange={e => setProjectSlug(e.target.value)}
                        className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-xs font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#1B2A4A]/50 mb-1">Tag / Badge</label>
                      <input
                        type="text"
                        placeholder="ex: Inscription Bal"
                        value={projectBadgeTag}
                        onChange={e => setProjectBadgeTag(e.target.value)}
                        className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <textarea
                    placeholder="Description du projet (ex: Réservez votre entrée pour le bal...)"
                    value={projectDescription}
                    onChange={e => setProjectDescription(e.target.value)}
                    className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm h-20"
                  />
                </div>

                {/* 3. Éditeur Dynamique de Variantes / Tarifs / Types de Paiement */}
                <div className="space-y-3 pt-2 bg-[#FAFAF8] p-4 rounded-2xl border border-[#1B2A4A]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B2A4A] flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-[#F26D5B]" /> Tarifs, Types d'Entrée & Options de Paiement
                    </span>
                    <button
                      type="button"
                      onClick={handleAddOptionGroup}
                      className="text-[11px] font-bold text-white bg-[#1B2A4A] hover:bg-[#F26D5B] px-3 py-1.5 rounded-lg transition"
                    >
                      + Ajouter un groupe d'options
                    </button>
                  </div>

                  {(!customFormConfig.options || customFormConfig.options.length === 0) ? (
                    <p className="text-xs text-[#1B2A4A]/50 italic">Aucun choix de tarif défini. Cliquez ci-dessus pour ajouter vos prix/entrées.</p>
                  ) : (
                    <div className="space-y-4">
                      {customFormConfig.options.map((optGroup, optIdx) => (
                        <div key={optGroup.id || optIdx} className="bg-white border border-[#1B2A4A]/10 p-3.5 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={optGroup.label}
                              onChange={e => {
                                const newOpts = [...(customFormConfig.options || [])]
                                newOpts[optIdx].label = e.target.value
                                setCustomFormConfig({ ...customFormConfig, options: newOpts })
                              }}
                              className="text-xs font-bold bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-lg p-2 flex-1"
                              placeholder="Nom du groupe (ex: Type d'entrée, Couleur...)"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionGroup(optIdx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Supprimer ce groupe"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Liste des choix et tarifs */}
                          <div className="space-y-2 pl-2">
                            <p className="text-[10px] font-bold text-[#1B2A4A]/50 uppercase">Choix & Prix unitaires :</p>
                            {optGroup.choices.map((choice, choiceIdx) => (
                              <div key={choiceIdx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={choice.name}
                                  onChange={e => handleUpdateChoice(optIdx, choiceIdx, 'name', e.target.value)}
                                  placeholder="Nom de l'option (ex: Entrée Classique (5,00€))"
                                  className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-lg p-2 text-xs font-semibold flex-1"
                                />
                                <div className="w-28 flex items-center gap-1 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-lg px-2 py-1.5">
                                  <span className="text-xs text-[#1B2A4A]/60">€</span>
                                  <input
                                    type="number"
                                    step="0.50"
                                    value={choice.price}
                                    onChange={e => handleUpdateChoice(optIdx, choiceIdx, 'price', e.target.value)}
                                    className="w-full bg-transparent text-xs font-bold text-right focus:outline-none"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChoice(optIdx, choiceIdx)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddChoice(optIdx)}
                              className="text-[10px] font-bold text-[#F26D5B] hover:underline mt-1 inline-block"
                            >
                              + Ajouter une option de paiement / choix
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Réglages des cases à cocher du Formulaire */}
                <div className="space-y-3 pt-2 bg-[#FAFAF8] p-4 rounded-2xl border border-[#1B2A4A]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B2A4A] flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-[#F26D5B]" /> Options additionnelles du Formulaire
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                    <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customFormConfig.has_receiver}
                        onChange={e => setCustomFormConfig({ ...customFormConfig, has_receiver: e.target.checked })}
                        className="accent-[#F26D5B]"
                      />
                      <span>Demander le destinataire</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customFormConfig.allow_quantity}
                        onChange={e => setCustomFormConfig({ ...customFormConfig, allow_quantity: e.target.checked })}
                        className="accent-[#F26D5B]"
                      />
                      <span>Sélecteur de quantité</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customFormConfig.allow_anonymous}
                        onChange={e => setCustomFormConfig({ ...customFormConfig, allow_anonymous: e.target.checked })}
                        className="accent-[#F26D5B]"
                      />
                      <span>Option Envoi Anonyme</span>
                    </label>
                    <label className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#1B2A4A]/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!customFormConfig.allow_message}
                        onChange={e => setCustomFormConfig({ ...customFormConfig, allow_message: e.target.checked })}
                        className="accent-[#F26D5B]"
                      />
                      <span>Option Mot Doux (+0.50€)</span>
                    </label>
                  </div>
                </div>

                {/* Bouton de confirmation */}
                <div className="pt-3 flex justify-end gap-3 border-t border-[#1B2A4A]/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-3 rounded-xl border border-[#1B2A4A]/10 text-xs font-bold hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-md disabled:opacity-50"
                  >
                    {creatingProject ? 'Création...' : 'Créer et Publier le Projet 🚀'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}