'use client'

import React, { useCallback, useEffect, useState } from 'react'
import {
  Plus, Trash2, Lock, LogOut, ExternalLink, Copy, Check, Sparkles, X,
  Pencil, LayoutDashboard, Coffee, CalendarDays, Rocket, Settings, ChevronRight, Bell, BellOff,
  UserRound, Clock, Save,
} from 'lucide-react'
import { Project, PRESET_TEMPLATES, ProjectFormConfig } from '@/lib/projects'

// ---- Types ----
type MenuItem = { id: number; title: string; category: string; price: string; description: string | null; is_available: boolean }
type EventItem = { id: number; title: string; date: string; location: string | null; price: string | null; description: string | null; payment_link: string | null }
type BureauMember = { role: string; name: string; emoji: string }
type OpeningHour = { day: string; hours: string }
type SiteSettings = { marquee_text: string; marquee_active: boolean; opening_hours: OpeningHour[]; bureau_members: BureauMember[] }

type ActiveTab = 'overview' | 'menu' | 'agenda' | 'projects' | 'settings'

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    marquee_text: '',
    marquee_active: false,
    opening_hours: [],
    bureau_members: [],
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Menu item form
  const [editingMenuItemId, setEditingMenuItemId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('Boissons')
  const [newPrice, setNewPrice] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Event form
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventPrice, setEventPrice] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventPaymentLink, setEventPaymentLink] = useState('')

  // Project creation modal
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

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, settingsRes] = await Promise.all([
        fetch('/api/admin/manage', { cache: 'no-store' }),
        fetch('/api/admin/settings', { cache: 'no-store' }),
      ])
      if (dashRes.status === 401) { setIsAuthenticated(false); return }
      if (dashRes.ok) {
        const data = await dashRes.json()
        setMenuItems(data.menuItems)
        setEvents(data.events)
        setProjects(data.projects)
      }
      if (settingsRes.ok) {
        const s = await settingsRes.json()
        setSiteSettings(s)
      }
    } catch { /* pas critique */ }
  }, [])

  useEffect(() => {
    async function checkSession() {
      const r = await fetch('/api/admin/session', { cache: 'no-store' })
      if (r.ok) { setIsAuthenticated(true); await fetchData() }
    }
    void checkSession()
  }, [fetchData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(false)
    setLoginLoading(true)
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: passwordInput }) })
      if (!r.ok) { setPasswordError(true); return }
      setIsAuthenticated(true)
      setPasswordInput('')
      await fetchData()
    } catch { setPasswordError(true) }
    finally { setLoginLoading(false) }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setIsAuthenticated(false)
  }

  const adminMutation = async (method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>, query?: string) => {
    const r = await fetch(`/api/admin/manage${query ?? ''}`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    if (!r.ok) { const j = await r.json() as { error?: string }; throw new Error(j.error || 'Opération impossible.') }
    await fetchData()
  }

  // --- Menu ---
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newPrice) return
    try { await adminMutation('POST', { resource: 'menu_items', data: { title: newTitle, category: newCategory, price: newPrice, description: newDescription, is_available: true } }); cancelEditMenuItem() }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const startEditMenuItem = (item: MenuItem) => { setEditingMenuItemId(item.id); setNewTitle(item.title || ''); setNewCategory(item.category || 'Boissons'); setNewPrice(item.price || ''); setNewDescription(item.description || '') }
  const cancelEditMenuItem = () => { setEditingMenuItemId(null); setNewTitle(''); setNewCategory('Boissons'); setNewPrice(''); setNewDescription('') }
  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMenuItemId || !newTitle || !newPrice) return
    try { await adminMutation('PATCH', { resource: 'menu_items', id: editingMenuItemId, data: { title: newTitle, category: newCategory, price: newPrice, description: newDescription, is_available: true } }); cancelEditMenuItem() }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const toggleAvailability = async (id: number, current: boolean) => {
    const item = menuItems.find(m => m.id === id)
    if (!item) return
    try { await adminMutation('PATCH', { resource: 'menu_items', id, data: { ...item, is_available: !current } }) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const handleDeleteMenuItem = async (id: number) => {
    try { await adminMutation('DELETE', undefined, `?resource=menu_items&id=${id}`) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  // --- Events ---
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventTitle || !eventDate) return
    try { await adminMutation('POST', { resource: 'events', data: { title: eventTitle, date: eventDate, location: eventLocation, price: eventPrice, description: eventDescription, payment_link: eventPaymentLink } }); cancelEditEvent() }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const startEditEvent = (ev: EventItem) => { setEditingEventId(ev.id); setEventTitle(ev.title || ''); setEventDate(ev.date || ''); setEventLocation(ev.location || ''); setEventPrice(ev.price || ''); setEventDescription(ev.description || ''); setEventPaymentLink(ev.payment_link || '') }
  const cancelEditEvent = () => { setEditingEventId(null); setEventTitle(''); setEventDate(''); setEventLocation(''); setEventPrice(''); setEventDescription(''); setEventPaymentLink('') }
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEventId || !eventTitle || !eventDate) return
    try { await adminMutation('PATCH', { resource: 'events', id: editingEventId, data: { title: eventTitle, date: eventDate, location: eventLocation, price: eventPrice, description: eventDescription, payment_link: eventPaymentLink } }); cancelEditEvent() }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const handleDeleteEvent = async (id: number) => {
    try { await adminMutation('DELETE', undefined, `?resource=events&id=${id}`) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  // --- Projects ---
  const handleTemplateSelect = (tid: string) => {
    setSelectedTemplateId(tid)
    const t = PRESET_TEMPLATES.find(t => t.id === tid)
    if (t) { setProjectEmoji(t.emoji); setProjectBadgeTag(t.badge_tag); setCustomFormConfig(JSON.parse(JSON.stringify(t.form_config))) }
  }
  const handleTitleChange = (val: string) => {
    setProjectTitle(val)
    setProjectSlug(val.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
  }
  const handleAddOptionGroup = () => {
    const opts = [...(customFormConfig.options || [])]
    opts.push({ id: `offer_${Date.now()}`, label: 'Offres disponibles', choices: [{ name: 'Nouvelle offre', price: 0 }] })
    setCustomFormConfig({ ...customFormConfig, options: opts })
  }
  const handleRemoveOptionGroup = (i: number) => { const o = [...(customFormConfig.options || [])]; o.splice(i, 1); setCustomFormConfig({ ...customFormConfig, options: o }) }
  const handleAddChoice = (i: number) => { const o = [...(customFormConfig.options || [])]; if (!o[i]) return; o[i].choices.push({ name: 'Nouvelle offre', price: 0 }); setCustomFormConfig({ ...customFormConfig, options: o }) }
  const handleUpdateChoice = (oi: number, ci: number, field: 'name' | 'price', val: string) => { const o = [...(customFormConfig.options || [])]; if (!o[oi]?.choices[ci]) return; if (field === 'name') o[oi].choices[ci].name = val; else o[oi].choices[ci].price = parseFloat(val) || 0; setCustomFormConfig({ ...customFormConfig, options: o }) }
  const handleRemoveChoice = (oi: number, ci: number) => { const o = [...(customFormConfig.options || [])]; if (!o[oi]) return; o[oi].choices.splice(ci, 1); setCustomFormConfig({ ...customFormConfig, options: o }) }
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectTitle || !projectSlug) return
    setCreatingProject(true)
    try {
      await adminMutation('POST', { resource: 'projects', data: { title: projectTitle, slug: projectSlug, emoji: projectEmoji || '🚀', badge_tag: projectBadgeTag || 'Opération MDLE', description: projectDescription, is_active: true, has_reservation_form: true, form_config: customFormConfig } })
      setShowCreateModal(false); setProjectTitle(''); setProjectSlug(''); setProjectDescription('')
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
    finally { setCreatingProject(false) }
  }
  const toggleProjectActive = async (id: number, current: boolean) => {
    const p = projects.find(p => p.id === id)
    if (!p) return
    try { await adminMutation('PATCH', { resource: 'projects', id, data: { ...p, is_active: !current } }) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const handleDeleteProject = async (id: number, title: string) => {
    if (confirm(`Supprimer définitivement le projet « ${title} » et toutes ses réservations ?`))
      try { await adminMutation('DELETE', undefined, `?resource=projects&id=${id}`) }
      catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const copyPublicLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  // --- Site Settings ---
  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      const r = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(siteSettings) })
      if (!r.ok) throw new Error('Erreur sauvegarde')
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
    finally { setSettingsSaving(false) }
  }
  const updateBureauMember = (i: number, field: keyof BureauMember, val: string) => {
    const members = [...siteSettings.bureau_members]
    members[i] = { ...members[i], [field]: val }
    setSiteSettings({ ...siteSettings, bureau_members: members })
  }
  const addBureauMember = () => setSiteSettings({ ...siteSettings, bureau_members: [...siteSettings.bureau_members, { role: 'Nouveau poste', name: 'Prénom', emoji: '🌟' }] })
  const removeBureauMember = (i: number) => { const m = [...siteSettings.bureau_members]; m.splice(i, 1); setSiteSettings({ ...siteSettings, bureau_members: m }) }
  const updateHour = (i: number, field: keyof OpeningHour, val: string) => {
    const hours = [...siteSettings.opening_hours]
    hours[i] = { ...hours[i], [field]: val }
    setSiteSettings({ ...siteSettings, opening_hours: hours })
  }
  const addHourRow = () => setSiteSettings({ ...siteSettings, opening_hours: [...siteSettings.opening_hours, { day: 'Nouveau jour', hours: '9h - 17h' }] })
  const removeHourRow = (i: number) => { const h = [...siteSettings.opening_hours]; h.splice(i, 1); setSiteSettings({ ...siteSettings, opening_hours: h }) }

  // ===== CONNEXION =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-4">
        <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-8 max-w-sm w-full shadow-xl">
          <div className="w-14 h-14 bg-[#1B2A4A] text-white rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-center mb-1">Administration</h1>
          <p className="text-xs text-[#1B2A4A]/50 text-center mb-7">Espace réservé aux membres du bureau MDLE.</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input type="password" placeholder="Mot de passe" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26D5B]" />
            {passwordError && <p className="text-red-500 text-xs text-center font-bold">Mot de passe incorrect.</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-50">
              {loginLoading ? 'Vérification...' : 'Entrer'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ===== NAV ITEMS =====
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'menu', label: 'Cafétéria', icon: <Coffee className="w-4 h-4" />, badge: menuItems.filter(m => !m.is_available).length || undefined },
    { id: 'agenda', label: 'Agenda', icon: <CalendarDays className="w-4 h-4" />, badge: events.length || undefined },
    { id: 'projects', label: 'Projets & Ventes', icon: <Rocket className="w-4 h-4" />, badge: projects.filter(p => p.is_active).length || undefined },
    { id: 'settings', label: 'Configuration Site', icon: <Settings className="w-4 h-4" /> },
  ]

  // ===== DASHBOARD =====
  return (
    <div className="min-h-screen bg-[#F0EEE9] text-[#1B2A4A] font-sans flex">

      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 w-64 bg-[#1B2A4A] text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:shrink-0`}>
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Panneau Admin</p>
          <h1 className="text-lg font-black tracking-tight">MDLE <span className="text-[#F26D5B]">Jean Perrin</span></h1>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false) }}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === item.id ? 'bg-[#F26D5B] text-white shadow-md' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="flex items-center gap-3">{item.icon}{item.label}</span>
              {item.badge !== undefined && <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="px-3 py-5 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#F0EEE9]/90 backdrop-blur-md border-b border-[#1B2A4A]/10 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-white/50 transition">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-black">{navItems.find(n => n.id === activeTab)?.label}</h2>
              <p className="text-[10px] text-[#1B2A4A]/50">Administration MDLE</p>
            </div>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#F26D5B] transition">
            <ExternalLink className="w-3.5 h-3.5" /> Voir le site
          </a>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto">

          {/* ====== OVERVIEW ====== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Produits actifs', value: menuItems.filter(m => m.is_available).length, sub: `${menuItems.filter(m => !m.is_available).length} en rupture`, color: 'bg-[#2E8B7A]/10 text-[#2E8B7A]', icon: '☕' },
                  { label: 'Événements', value: events.length, sub: 'à venir / en cours', color: 'bg-[#F2A63C]/10 text-[#F2A63C]', icon: '📅' },
                  { label: 'Projets actifs', value: projects.filter(p => p.is_active).length, sub: `${projects.filter(p => !p.is_active).length} masqué(s)`, color: 'bg-[#F26D5B]/10 text-[#F26D5B]', icon: '🚀' },
                  { label: 'Bandeau', value: siteSettings.marquee_active ? 'ON' : 'OFF', sub: siteSettings.marquee_active ? 'Actif sur le site' : 'Désactivé', color: siteSettings.marquee_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500', icon: siteSettings.marquee_active ? '📢' : '🔕' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl p-5 border border-[#1B2A4A]/8 shadow-sm">
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xl mb-3 ${stat.color}`}>{stat.icon}</div>
                    <p className="text-2xl font-black">{stat.value}</p>
                    <p className="text-xs font-bold text-[#1B2A4A] mt-0.5">{stat.label}</p>
                    <p className="text-[10px] text-[#1B2A4A]/50 mt-0.5">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* Ruptures de stock */}
              {menuItems.filter(m => !m.is_available).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <p className="text-sm font-black text-amber-900 mb-3">⚠️ Produits en rupture de stock</p>
                  <div className="flex flex-wrap gap-2">
                    {menuItems.filter(m => !m.is_available).map(m => (
                      <div key={m.id} className="flex items-center gap-2 bg-white border border-amber-200 px-3 py-1.5 rounded-full text-xs font-bold text-amber-800">
                        {m.title}
                        <button onClick={() => toggleAvailability(m.id, m.is_available)} className="text-emerald-600 hover:text-emerald-800 transition">✓ Restorer</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projets actifs */}
              <div className="bg-white rounded-2xl p-5 border border-[#1B2A4A]/8 shadow-sm">
                <p className="text-sm font-black mb-3">🚀 Projets en cours</p>
                {projects.filter(p => p.is_active).length === 0
                  ? <p className="text-xs text-[#1B2A4A]/50">Aucun projet actif. Crée-en un dans l'onglet "Projets & Ventes".</p>
                  : <div className="space-y-2">{projects.filter(p => p.is_active).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-[#FAFAF8] rounded-xl border border-[#1B2A4A]/8 text-sm">
                      <span className="font-bold">{p.emoji} {p.title}</span>
                      <a href={`/admin/projects/${p.id}`} className="text-xs font-bold text-[#F26D5B] hover:underline">Voir commandes →</a>
                    </div>
                  ))}</div>
                }
              </div>
            </div>
          )}

          {/* ====== MENU ====== */}
          {activeTab === 'menu' && (
            <div className="max-w-2xl space-y-6">
              <form onSubmit={editingMenuItemId ? handleUpdateMenuItem : handleAddMenuItem} className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-3">
                {editingMenuItemId && (
                  <div className="flex items-center justify-between bg-[#F26D5B]/10 p-3 rounded-xl text-xs text-[#F26D5B] font-bold border border-[#F26D5B]/20">
                    <span>✏️ Modification en cours</span>
                    <button type="button" onClick={cancelEditMenuItem} className="underline hover:text-[#1B2A4A]">Annuler</button>
                  </div>
                )}
                <input type="text" placeholder="Nom de l'article" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold">
                    {['Boissons', 'Snacks sucrés', 'Snacks salés', 'Formules', '✨ Ventes Saisonnières'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input type="text" placeholder="Prix (ex: 1,50€)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
                </div>
                <textarea rows={2} placeholder="Description courte (optionnel)" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm resize-y" />
                <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                  {editingMenuItemId ? <><Check className="w-4 h-4" /> Enregistrer</> : <><Plus className="w-4 h-4" /> Ajouter à la Carte</>}
                </button>
              </form>

              <div className="space-y-2">
                {menuItems.length === 0 && <p className="text-sm text-[#1B2A4A]/50 text-center py-6">Aucun produit. Ajoutes-en un ci-dessus.</p>}
                {menuItems.map(item => (
                  <div key={item.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{item.title} — <span className="text-[#F26D5B]">{item.price}</span></p>
                      {item.description && <p className="text-xs text-[#1B2A4A]/60 mt-0.5">{item.description}</p>}
                      <span className="text-[10px] font-bold uppercase text-[#1B2A4A]/30 mt-0.5 block">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => startEditMenuItem(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => toggleAvailability(item.id, item.is_available)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${item.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {item.is_available ? 'Disponible' : 'Rupture'}
                      </button>
                      <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====== AGENDA ====== */}
          {activeTab === 'agenda' && (
            <div className="max-w-2xl space-y-6">
              <form onSubmit={editingEventId ? handleUpdateEvent : handleAddEvent} className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-3">
                {editingEventId && (
                  <div className="flex items-center justify-between bg-[#F26D5B]/10 p-3 rounded-xl text-xs text-[#F26D5B] font-bold border border-[#F26D5B]/20">
                    <span>✏️ Modification de l'événement</span>
                    <button type="button" onClick={cancelEditEvent} className="underline">Annuler</button>
                  </div>
                )}
                <input type="text" placeholder="Titre de l'événement" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Date (ex: 25 Sept)" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" required />
                  <input type="text" placeholder="Prix (ex: 5€ ou Gratuit)" value={eventPrice} onChange={e => setEventPrice(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Lieu (ex: Foyer)" value={eventLocation} onChange={e => setEventLocation(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
                  <input type="url" placeholder="Lien SumUp / Réservation" value={eventPaymentLink} onChange={e => setEventPaymentLink(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm" />
                </div>
                <textarea rows={3} placeholder="Description (optionnel)" value={eventDescription} onChange={e => setEventDescription(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm resize-y" />
                <button type="submit" className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition text-sm flex items-center justify-center gap-2">
                  {editingEventId ? <><Check className="w-4 h-4" /> Enregistrer</> : <><Plus className="w-4 h-4" /> Publier l'événement</>}
                </button>
              </form>

              <div className="space-y-2">
                {events.length === 0 && <p className="text-sm text-[#1B2A4A]/50 text-center py-6">Aucun événement. Crée-en un ci-dessus.</p>}
                {events.map(ev => (
                  <div key={ev.id} className="bg-white border border-[#1B2A4A]/10 p-4 rounded-xl flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{ev.title}{ev.price && <span className="ml-2 text-[#F26D5B]">({ev.price})</span>}</p>
                      <p className="text-xs text-[#1B2A4A]/60">{ev.date} • {ev.location || 'Lieu non spécifié'}</p>
                      {ev.description && <p className="text-xs text-[#1B2A4A]/70 mt-1 bg-[#FAFAF8] p-2 rounded-lg border border-[#1B2A4A]/5">{ev.description}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => startEditEvent(ev)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====== PROJETS ====== */}
          {activeTab === 'projects' && (
            <div className="max-w-5xl space-y-6">
              <div className="flex justify-end">
                <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-[#F26D5B] text-white hover:bg-[#1B2A4A] px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md">
                  <Plus className="w-4 h-4" /> Nouveau Projet
                </button>
              </div>
              {projects.length === 0 && <div className="text-center py-16 text-[#1B2A4A]/50 text-sm">Aucun projet créé. Commence par en créer un !</div>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-white border border-[#1B2A4A]/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-3xl">{proj.emoji || '🚀'}</span>
                        <button onClick={() => toggleProjectActive(proj.id, proj.is_active)} className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full transition ${proj.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                          {proj.is_active ? 'Actif' : 'Masqué'}
                        </button>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F26D5B]">{proj.badge_tag}</span>
                      <h3 className="font-bold text-base mt-0.5">{proj.title}</h3>
                      {proj.description && <p className="text-xs text-[#1B2A4A]/60 mt-1 line-clamp-2">{proj.description}</p>}
                    </div>
                    <div className="pt-3 border-t border-[#1B2A4A]/5 flex items-center justify-between gap-2">
                      <a href={`/admin/projects/${proj.id}`} className="text-xs font-bold text-white bg-[#1B2A4A] hover:bg-[#F26D5B] px-3.5 py-2 rounded-xl transition shadow-sm">📊 Commandes</a>
                      <div className="flex items-center gap-1">
                        <button onClick={() => copyPublicLink(proj.slug)} className="p-2 text-[#1B2A4A]/60 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition">
                          {copiedSlug === proj.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a href={`/p/${proj.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-[#1B2A4A]/60 hover:text-[#1B2A4A] hover:bg-gray-100 rounded-lg transition"><ExternalLink className="w-4 h-4" /></a>
                        <button onClick={() => handleDeleteProject(proj.id, proj.title)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====== CONFIGURATION DU SITE ====== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">

              {/* Bandeau d'annonce */}
              <div className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {siteSettings.marquee_active ? <Bell className="w-5 h-5 text-[#F26D5B]" /> : <BellOff className="w-5 h-5 text-[#1B2A4A]/40" />}
                    <h3 className="font-black text-base">Bandeau d'annonce</h3>
                  </div>
                  <button
                    onClick={() => setSiteSettings({ ...siteSettings, marquee_active: !siteSettings.marquee_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${siteSettings.marquee_active ? 'bg-[#F26D5B]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${siteSettings.marquee_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-[#1B2A4A]/50">S'affiche sur la page d'accueil si activé. Utilise-le pour les fermetures exceptionnelles, annonces urgentes, etc.</p>
                <input
                  type="text"
                  value={siteSettings.marquee_text}
                  onChange={e => setSiteSettings({ ...siteSettings, marquee_text: e.target.value })}
                  placeholder="Ex: ⚠️ Le foyer est fermé ce jeudi"
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm"
                />
              </div>

              {/* Membres du Bureau */}
              <div className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <UserRound className="w-5 h-5 text-[#1B2A4A]/60" />
                  <h3 className="font-black text-base">Membres du Bureau</h3>
                </div>
                <p className="text-xs text-[#1B2A4A]/50">Ces informations s'affichent dans la section "Infos pratiques" du site.</p>
                <div className="space-y-2">
                  {siteSettings.bureau_members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={m.emoji} onChange={e => updateBureauMember(i, 'emoji', e.target.value)} className="w-14 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm text-center" placeholder="🌟" />
                      <input type="text" value={m.role} onChange={e => updateBureauMember(i, 'role', e.target.value)} className="flex-1 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 text-xs" placeholder="Rôle" />
                      <input type="text" value={m.name} onChange={e => updateBureauMember(i, 'name', e.target.value)} className="flex-1 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm font-semibold" placeholder="Prénom" />
                      <button onClick={() => removeBureauMember(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addBureauMember} className="flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#1B2A4A] transition py-2">
                  <Plus className="w-4 h-4" /> Ajouter un membre
                </button>
              </div>

              {/* Horaires d'ouverture */}
              <div className="bg-white border border-[#1B2A4A]/10 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1B2A4A]/60" />
                  <h3 className="font-black text-base">Horaires d'ouverture</h3>
                </div>
                <p className="text-xs text-[#1B2A4A]/50">Modifie les horaires affichés dans la section "Infos pratiques".</p>
                <div className="space-y-2">
                  {siteSettings.opening_hours.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={h.day} onChange={e => updateHour(i, 'day', e.target.value)} className="flex-1 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm font-semibold" placeholder="Lundi" />
                      <input type="text" value={h.hours} onChange={e => updateHour(i, 'hours', e.target.value)} className="flex-1 bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm" placeholder="9h - 17h" />
                      <button onClick={() => removeHourRow(i)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addHourRow} className="flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#1B2A4A] transition py-2">
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                </button>
              </div>

              {/* Bouton de sauvegarde */}
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition shadow-md ${settingsSaved ? 'bg-emerald-500 text-white' : 'bg-[#1B2A4A] hover:bg-[#F26D5B] text-white'} disabled:opacity-60`}
              >
                {settingsSaved ? <><Check className="w-4 h-4" /> Sauvegardé !</> : settingsSaving ? 'Sauvegarde...' : <><Save className="w-4 h-4" /> Sauvegarder les modifications</>}
              </button>
            </div>
          )}

        </main>
      </div>

      {/* MODALE CRÉATION PROJET */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2A4A]/60 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6">
              <div className="flex justify-between items-center border-b border-[#1B2A4A]/10 pb-4">
                <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#F26D5B]" /><h2 className="text-xl font-black">Nouveau Projet / Opération</h2></div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 text-[#1B2A4A]/60 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/60">1. Modèle de départ</label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PRESET_TEMPLATES.map(tmpl => (
                      <button key={tmpl.id} type="button" onClick={() => handleTemplateSelect(tmpl.id)}
                        className={`p-3 rounded-2xl text-left border transition text-xs flex items-start gap-3 ${selectedTemplateId === tmpl.id ? 'border-[#F26D5B] bg-[#F26D5B]/5 ring-2 ring-[#F26D5B]/20' : 'border-[#1B2A4A]/10 hover:border-[#1B2A4A]/30'}`}>
                        <span className="text-xl">{tmpl.emoji}</span>
                        <div><p className="font-bold text-[#1B2A4A]">{tmpl.name}</p><p className="text-[10px] text-[#1B2A4A]/60 mt-0.5">{tmpl.description}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/60">2. Informations générales</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input type="text" placeholder="Titre du projet" value={projectTitle} onChange={e => handleTitleChange(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm font-semibold" required />
                    </div>
                    <input type="text" placeholder="Emoji" value={projectEmoji} onChange={e => setProjectEmoji(e.target.value)} className="bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm text-center" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-[#1B2A4A]/50 mb-1">Slug (URL)</label>
                      <input type="text" value={projectSlug} onChange={e => setProjectSlug(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-xs font-mono" required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#1B2A4A]/50 mb-1">Badge / Tag</label>
                      <input type="text" value={projectBadgeTag} onChange={e => setProjectBadgeTag(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-xs font-semibold" />
                    </div>
                  </div>
                  <textarea rows={2} placeholder="Description du projet" value={projectDescription} onChange={e => setProjectDescription(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-3 text-sm resize-y" />
                </div>
                {customFormConfig.options && customFormConfig.options.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/60">3. Options / Tarifs</label>
                    {customFormConfig.options.map((optGroup, oi) => (
                      <div key={oi} className="border border-[#1B2A4A]/10 rounded-2xl p-4 space-y-3 bg-[#FAFAF8]">
                        <div className="flex items-center gap-2">
                          <input type="text" value={optGroup.label} onChange={e => { const o = [...(customFormConfig.options || [])]; o[oi].label = e.target.value; setCustomFormConfig({ ...customFormConfig, options: o }) }} className="flex-1 bg-white border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm font-bold" />
                          <button type="button" onClick={() => handleRemoveOptionGroup(oi)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        {optGroup.choices.map((choice, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input type="text" value={choice.name} onChange={e => handleUpdateChoice(oi, ci, 'name', e.target.value)} className="flex-1 bg-white border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm" />
                            <input type="number" value={choice.price} onChange={e => handleUpdateChoice(oi, ci, 'price', e.target.value)} className="w-20 bg-white border border-[#1B2A4A]/10 rounded-xl p-2.5 text-sm" step="0.5" />
                            <span className="text-xs text-[#1B2A4A]/50">€</span>
                            <button type="button" onClick={() => handleRemoveChoice(oi, ci)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddChoice(oi)} className="text-xs font-bold text-[#F26D5B] hover:text-[#1B2A4A] transition flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter une offre</button>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddOptionGroup} className="flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#1B2A4A] transition"><Plus className="w-4 h-4" /> Ajouter un groupe d'options</button>
                  </div>
                )}
                <button type="submit" disabled={creatingProject} className="w-full bg-[#F26D5B] hover:bg-[#1B2A4A] text-white font-bold py-3.5 rounded-2xl transition text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {creatingProject ? 'Création...' : <><Sparkles className="w-4 h-4" /> Créer le Projet</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}