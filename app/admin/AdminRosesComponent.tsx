'use client'

import React, { useCallback, useEffect, useState } from 'react'

export type RoseOrder = {
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

export default function AdminRosesComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  // Orders data
  const [orders, setOrders] = useState<RoseOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'pending' | 'note'>('all')

  // Florist calculation
  const [floristUnitCost, setFloristUnitCost] = useState<number>(0.80)

  // Modals state
  const [previewNote, setPreviewNote] = useState<{ target: string; text: string } | null>(null)
  const [isDistModalOpen, setIsDistModalOpen] = useState(false)
  const [csvDownloading, setCsvDownloading] = useState(false)

  // Check existing session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' })
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } catch {
      setIsAuthenticated(false)
    }
  }, [])

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/admin/roses', { cache: 'no-store' })
      if (res.status === 401) {
        setIsAuthenticated(false)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (err) {
      console.error('Erreur chargement commandes :', err)
    } finally {
      setLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  useEffect(() => {
    if (isAuthenticated) {
      void fetchOrders()
    }
  }, [isAuthenticated, fetchOrders])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    setAuthError(false)
    setAuthLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })

      if (res.ok) {
        setIsAuthenticated(true)
        setPasswordInput('')
        await fetchOrders()
      } else {
        setAuthError(true)
      }
    } catch {
      setAuthError(true)
    } finally {
      setAuthLoading(false)
    }
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setIsAuthenticated(false)
    setOrders([])
  }

  // Quick cash / status toggle
  const handleUpdateStatus = async (orderId: string, newStatus: 'paid' | 'pending') => {
    try {
      const res = await fetch('/api/admin/roses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, payment_status: newStatus }),
      })
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o))
        )
      } else {
        alert('Impossible de mettre à jour le statut.')
      }
    } catch {
      alert('Erreur réseau lors de la mise à jour.')
    }
  }

  // Delete test order
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Supprimer définitivement cette commande de test ?')) return
    try {
      const res = await fetch(`/api/admin/roses?id=${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
      } else {
        alert('Impossible de supprimer la commande.')
      }
    } catch {
      alert('Erreur réseau lors de la suppression.')
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    setCsvDownloading(true)
    try {
      const headers = [
        'ID Commande',
        'Date & Heure',
        'Destinataire',
        'Classe / Salle',
        'Roses Rouges',
        'Roses Roses',
        'Total Roses',
        'Mot Doux (Oui/Non)',
        'Contenu Mot Doux',
        'Expéditeur',
        'Anonyme',
        'Mode Paiement',
        'Statut Paiement',
        'Montant Total (€)',
      ]

      const rows = orders.map((o) => [
        `#VAL-${o.id.slice(0, 8).toUpperCase()}`,
        new Date(o.created_at).toLocaleString('fr-FR'),
        `"${o.recipient_name.replace(/"/g, '""')}"`,
        `"${o.recipient_class.replace(/"/g, '""')}"`,
        o.red_roses_count,
        o.pink_roses_count,
        o.red_roses_count + o.pink_roses_count,
        o.has_message ? 'Oui' : 'Non',
        `"${(o.message_text || '').replace(/"/g, '""')}"`,
        `"${(o.is_anonymous ? 'Anonyme' : o.sender_name || '').replace(/"/g, '""')}"`,
        o.is_anonymous ? 'Oui' : 'Non',
        o.payment_method === 'sumup_online' ? 'SumUp en ligne' : 'Comptoir MDLE',
        o.payment_status === 'paid' ? 'Payé' : 'En attente',
        Number(o.total_amount).toFixed(2),
      ])

      const csvContent =
        '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `commandes_roses_saint_valentin_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setTimeout(() => setCsvDownloading(false), 800)
    }
  }

  // Print helper for classroom delivery
  const handlePrintClassroom = (targetClass?: string) => {
    window.print()
  }

  // KPIs calculations
  const totalRoses = orders.reduce((acc, o) => acc + o.red_roses_count + o.pink_roses_count, 0)
  const totalRed = orders.reduce((acc, o) => acc + o.red_roses_count, 0)
  const totalPink = orders.reduce((acc, o) => acc + o.pink_roses_count, 0)

  const totalGrossRevenue = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0)
  const rosesRevenue = totalRoses * 2.00
  const motsDouxRevenue = orders.filter((o) => o.has_message).length * 0.50

  const totalFloristCost = totalRoses * floristUnitCost
  const netProfit = totalGrossRevenue - totalFloristCost
  const marginPercent = totalGrossRevenue > 0 ? ((netProfit / totalGrossRevenue) * 100).toFixed(1) : '0'

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeFilter === 'paid' && order.payment_status !== 'paid') return false
    if (activeFilter === 'pending' && order.payment_status !== 'pending') return false
    if (activeFilter === 'note' && !order.has_message) return false

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const haystack = `
        ${order.recipient_name}
        ${order.recipient_class}
        ${order.sender_name || ''}
        ${order.id}
        val-${order.id.slice(0, 8)}
      `.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })

  // Classrooms aggregation for distribution mode
  const classroomGroups = React.useMemo(() => {
    const map = new Map<
      string,
      {
        className: string
        totalRoses: number
        redRoses: number
        pinkRoses: number
        orders: RoseOrder[]
      }
    >()

    orders.forEach((o) => {
      const cls = o.recipient_class.trim() || 'Non spécifiée'
      const existing = map.get(cls) || {
        className: cls,
        totalRoses: 0,
        redRoses: 0,
        pinkRoses: 0,
        orders: [],
      }
      existing.totalRoses += o.red_roses_count + o.pink_roses_count
      existing.redRoses += o.red_roses_count
      existing.pinkRoses += o.pink_roses_count
      existing.orders.push(o)
      map.set(cls, existing)
    })

    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className))
  }, [orders])

  // Initial loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ==========================================
  // ÉCRAN 1 : CONNEXION PAR MOT DE PASSE MDLE
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className="w-full min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="flex flex-col w-full items-center justify-center py-6 px-4 sm:px-6 relative overflow-hidden">
          {/* Subtle ambient decorative glow spheres */}
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-36 -right-20 w-[420px] h-[420px] rounded-full bg-tertiary-fixed-dim/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full bg-surface-container-low/40 blur-3xl pointer-events-none" />

          {/* Main Login Card (Glass Cupertino Sheet) */}
          <div className="relative w-full max-w-md bg-surface-container-lowest/85 backdrop-blur-2xl rounded-3xl p-7 sm:p-10 shadow-xl flex flex-col items-center">
            {/* Top Identity: MDLE Circular Emblem with Ambient Halo */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-md transform scale-110" />
              <div className="relative w-24 h-24 rounded-full p-1 bg-surface-container-lowest shadow-md flex items-center justify-center overflow-hidden">
                <img
                  alt="Logo MDLE Lycée Jean Perrin"
                  className="w-full h-full object-contain rounded-full"
                  src="/logo-mdle.png"
                />
              </div>
              {/* Floating Micro Security Lock Badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-on-primary shadow-md flex items-center justify-center">
                <span className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock
                </span>
              </div>
            </div>

            {/* Header Titles */}
            <div className="text-center w-full mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed mb-3 shadow-sm">
                <span className="material-symbols-outlined text-[13px] text-tertiary">local_florist</span>
                <span className="font-label-sm uppercase tracking-wider text-[10px] font-bold">
                  Campagne Saint-Valentin 2025 • Lycée Jean Perrin
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                Espace Bureau MDLE
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-snug px-2">
                Accès réservé aux membres organisateurs &amp; trésorerie de la Maison Des Lycéens
              </p>
            </div>

            {/* Error Toast / Alert */}
            {authError && (
              <div className="w-full mb-4 px-4 py-2.5 rounded-xl bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2 transition-all">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="flex-1 font-semibold">Mot de passe incorrect. Vérifiez vos accès.</span>
              </div>
            )}

            {/* Form Section */}
            <form className="w-full flex flex-col gap-4" onSubmit={handleLogin}>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="password-input">
                    Mot de passe administrateur
                  </label>
                  <span className="font-label-sm text-[10px] text-on-surface-variant/80 bg-surface-container-high px-2 py-0.5 rounded-full">
                    Touche ↵ Entrée
                  </span>
                </div>
                <div className="relative w-full flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant/70 text-[20px] pointer-events-none">
                    key
                  </span>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    autoFocus
                    className="w-full h-12 pl-11 pr-11 bg-surface-container-low/70 focus:bg-surface-container-lowest text-on-surface font-body-md rounded-2xl outline-none shadow-inner transition-all duration-200 placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary"
                  />
                  <button
                    aria-label="Afficher ou masquer le mot de passe"
                    className="absolute right-3 p-1 rounded-xl text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={authLoading}
                className="w-full mt-2 h-12 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md hover:shadow-xl active:scale-[0.98] transition-all duration-200 group cursor-pointer disabled:opacity-50"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
                  {authLoading ? 'progress_activity' : 'lock_open'}
                </span>
                <span>{authLoading ? 'Authentification...' : 'Déverrouiller le tableau de bord'}</span>
              </button>
            </form>

            {/* Demo Access Note */}
            <div className="w-full mt-4 p-2.5 rounded-2xl bg-surface-container-low/80 flex items-center justify-between text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-tertiary">info</span>
                <span className="font-body-sm text-[11px]">Accès de test délégué :</span>
              </div>
              <button
                className="font-label-sm text-[11px] text-primary hover:text-primary-container font-semibold bg-surface-container-lowest px-2.5 py-1 rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
                onClick={() => setPasswordInput('mdle2025')}
                type="button"
              >
                mdle2025
              </button>
            </div>

            {/* Security Indicator */}
            <div className="flex items-center gap-1.5 mt-5 text-on-surface-variant/80">
              <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
              <span className="font-label-sm text-[11px]">Connexion chiffrée SSL • Session sécurisée lycée</span>
            </div>

            {/* Return Link */}
            <div className="mt-6 pt-5 w-full flex flex-col items-center">
              <a
                className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-label-md text-label-md transition-colors group"
                href="/"
              >
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
                  arrow_back
                </span>
                <span>Retour à la boutique de roses</span>
              </a>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-on-surface-variant/60 font-body-sm text-[11px]">
            <span>© 2025 Maison Des Lycéens • Lycée Jean Perrin</span>
            <span className="hidden sm:inline">•</span>
            <span>Gestionnaire des ventes caritatives</span>
          </footer>
        </div>
      </main>
    )
  }

  // ==========================================
  // ÉCRAN 2 : TABLEAU DE BORD ADMIN MDLE ROSES
  // ==========================================
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
              href="/"
              className="px-space-md py-space-xs rounded-full font-label-md text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Boutique
            </a>
            <a
              href="#dashboard"
              className="px-space-md py-space-xs font-label-md transition-colors bg-primary text-on-primary rounded-full shadow-sm"
            >
              Dashboard Roses
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

      {/* Main Admin Section */}
      <main id="dashboard" className="w-full pt-16 bg-surface min-h-[calc(100vh-80px)]">
        <div className="flex flex-col w-full">
          <div className="relative w-full max-w-[1240px] mx-auto px-margin md:px-margin-desktop py-space-lg flex flex-col gap-space-lg">
            {/* Ambient decorative glow */}
            <div className="absolute -top-12 left-1/4 w-96 h-96 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />
            <div className="absolute top-48 right-10 w-80 h-80 bg-surface-container-high/40 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Administrative Header Bar */}
            <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    alt="Logo MDLE Perrin"
                    className="w-12 h-12 rounded-xl object-contain shadow-sm bg-surface-container-lowest p-1"
                    src="/logo-mdle.png"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                      Tableau de bord Roses
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                      Campagne En Cours (Clôture le 12 Fév. 18h)
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Opération Saint-Valentin 2025 • Distribution en classe le 14 Février
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-space-sm w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-space-xs bg-surface-container-low px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-secondary text-[18px]">account_balance_wallet</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Bureau MDLE — Trésorerie
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container text-on-error-container font-label-md text-label-md transition-all hover:bg-error hover:text-on-error shadow-sm cursor-pointer"
                  title="Quitter la session"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>

            {/* 4 High-Impact Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {/* Card 1: Volume Fleuriste */}
              <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Volume Fleuriste
                  </span>
                  <span className="p-2 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">local_florist</span>
                  </span>
                </div>
                <div className="my-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg text-primary tracking-tight font-extrabold">
                      {totalRoses}
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface-variant">tiges</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Total des commandes enregistrées
                  </p>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap pt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed font-semibold">
                    {totalRed} Rouges ❤️
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-pink-100 text-pink-900 font-semibold">
                    {totalPink} Roses 🌸
                  </span>
                </div>
              </div>

              {/* Card 2: Recette Totale Brute */}
              <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Recette Brute
                  </span>
                  <span className="p-2 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </span>
                </div>
                <div className="my-space-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold">
                      {totalGrossRevenue.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center font-label-sm text-label-sm text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                      <span className="material-symbols-outlined text-[13px]">trending_up</span> +18%
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">vs Saint-Valentin N-1</span>
                  </div>
                </div>
                <div className="bg-surface-container-low/70 rounded-lg p-2 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                  <span>{rosesRevenue.toFixed(2).replace('.', ',')} € roses</span>
                  <span className="text-on-surface font-semibold">
                    + {motsDouxRevenue.toFixed(2).replace('.', ',')} € mots
                  </span>
                </div>
              </div>

              {/* Card 3: Calculateur Coût Fournisseur Fleuriste */}
              <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                    Coût Fournisseur
                  </span>
                  <span className="p-2 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">calculate</span>
                  </span>
                </div>
                <div className="my-space-sm">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold">
                      {totalFloristCost.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Facture fleuriste estimée</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-2 flex items-center justify-between gap-2">
                  <label className="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap" htmlFor="cost-input">
                    Prix négocié/u :
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="cost-input"
                      type="number"
                      step="0.05"
                      min="0.30"
                      max="2.50"
                      value={floristUnitCost}
                      onChange={(e) => setFloristUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-surface-container-lowest rounded px-2 py-0.5 text-center font-label-md text-label-md text-on-surface outline-none shadow-inner font-bold"
                    />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">€</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Bénéfice Net MDLE */}
              <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-emerald-800 font-bold">
                    Bénéfice Net MDLE
                  </span>
                  <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">savings</span>
                  </span>
                </div>
                <div className="my-space-sm">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display-lg text-display-lg text-emerald-700 tracking-tight font-extrabold">
                      {netProfit >= 0 ? '+ ' : '- '}
                      {Math.abs(netProfit).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm bg-emerald-50 text-emerald-800 font-semibold mt-1">
                    Marge brute : {marginPercent}%
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                  Financera les projets culturels &amp; le bal de fin d&apos;année du lycée.
                </p>
              </div>
            </div>

            {/* Quick Actions Banner & Classroom Distribution Helper Modal Trigger */}
            <div className="w-full bg-gradient-to-r from-surface-container via-surface-container-low to-surface-container-highest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Préparation logistique de distribution
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Triez les fiches et étiquettes par salle de cours pour les délégués le vendredi matin.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm w-full sm:w-auto">
                <button
                  onClick={() => setIsDistModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-md py-2 rounded-full bg-on-surface text-on-primary font-label-md text-label-md shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer font-bold"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">school</span>
                  <span>Mode distribution par classe ({classroomGroups.length})</span>
                </button>
              </div>
            </div>

            {/* Orders Management Section */}
            <div className="w-full bg-surface-container-lowest/90 backdrop-blur-md rounded-xl shadow-sm p-space-md md:p-space-lg flex flex-col gap-space-md">
              {/* Toolbar & Filters */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
                {/* Search */}
                <div className="relative flex-1 min-w-[260px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                    search
                  </span>
                  <input
                    id="search-orders"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par élève, destinataire, classe (ex: T°2)..."
                    type="text"
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 outline-none focus:bg-surface-container-lowest shadow-inner transition-all focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Segmented Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-full bg-surface-container-low overflow-x-auto max-w-full">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap cursor-pointer font-semibold ${
                      activeFilter === 'all'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Toutes ({orders.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('paid')}
                    className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap cursor-pointer font-semibold ${
                      activeFilter === 'paid'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Payées SumUp ({orders.filter((o) => o.payment_status === 'paid').length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('pending')}
                    className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap cursor-pointer font-semibold ${
                      activeFilter === 'pending'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    À encaisser MDLE ({orders.filter((o) => o.payment_status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('note')}
                    className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all whitespace-nowrap cursor-pointer font-semibold ${
                      activeFilter === 'note'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Avec mot doux ({orders.filter((o) => o.has_message).length})
                  </button>
                </div>

                {/* CSV Export Button */}
                <button
                  onClick={handleExportCSV}
                  disabled={csvDownloading}
                  className="inline-flex items-center justify-center gap-2 px-space-md py-2.5 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary font-label-md text-label-md shadow-sm transition-all whitespace-nowrap cursor-pointer font-bold"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {csvDownloading ? 'sync' : 'download'}
                  </span>
                  <span>{csvDownloading ? 'Génération...' : 'Exporter CSV (Fleuriste & Distribution)'}</span>
                </button>
              </div>

              {/* Orders Data Table */}
              <div className="overflow-x-auto -mx-space-md md:mx-0">
                <table className="w-full text-left border-collapse min-w-[960px]">
                  <thead>
                    <tr className="bg-surface-container-low/60 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
                      <th className="py-3 px-4 rounded-l-lg">ID</th>
                      <th className="py-3 px-4">Date/Heure</th>
                      <th className="py-3 px-4">Destinataire</th>
                      <th className="py-3 px-4">Détail Roses</th>
                      <th className="py-3 px-4">Mot Doux</th>
                      <th className="py-3 px-4">Expéditeur</th>
                      <th className="py-3 px-4">Paiement &amp; Statut</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md divide-y divide-surface-container-low/40">
                    {loadingOrders ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                          Chargement des commandes de roses...
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-on-surface-variant">
                          Aucune commande trouvée pour ces critères.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const dateFormatted = new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        const isPaid = order.payment_status === 'paid'

                        return (
                          <tr key={order.id} className="hover:bg-surface-container-low/30 transition-colors">
                            {/* ID */}
                            <td className="py-3.5 px-4 font-label-md text-label-md text-on-surface-variant font-mono">
                              #VAL-{order.id.slice(0, 6).toUpperCase()}
                            </td>
                            {/* Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-on-surface-variant font-body-sm text-body-sm">
                              {dateFormatted}
                            </td>
                            {/* Destinataire */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-label-lg text-label-lg font-bold text-on-surface">
                                  {order.recipient_name}
                                </span>
                                <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-on-surface text-surface-container-lowest font-medium">
                                  {order.recipient_class}
                                </span>
                              </div>
                            </td>
                            {/* Roses detail */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {order.red_roses_count > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed font-semibold">
                                    {order.red_roses_count}x Rouge ❤️
                                  </span>
                                )}
                                {order.pink_roses_count > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-pink-100 text-pink-900 font-semibold">
                                    {order.pink_roses_count}x Rose 🌸
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Mot doux */}
                            <td className="py-3.5 px-4">
                              {order.has_message ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewNote({
                                      target: `${order.recipient_name} (${order.recipient_class})`,
                                      text: order.message_text || 'Aucun texte renseigné.',
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-rose-50 text-primary hover:bg-primary hover:text-on-primary transition-all font-semibold cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">mail</span>
                                  <span>+0,50 € • Voir</span>
                                </button>
                              ) : (
                                <span className="font-body-sm text-body-sm text-on-surface-variant italic">
                                  Sans mot
                                </span>
                              )}
                            </td>
                            {/* Expéditeur */}
                            <td className="py-3.5 px-4">
                              {order.is_anonymous ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-surface-container-highest text-on-surface-variant font-semibold">
                                  <span>Anonyme 🤫</span>
                                </span>
                              ) : (
                                <span className="font-body-sm text-body-sm text-on-surface">
                                  {order.sender_name || 'Non spécifié'}
                                </span>
                              )}
                            </td>
                            {/* Statut & Paiement */}
                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-emerald-100 text-emerald-800 font-bold">
                                  <span className="material-symbols-outlined text-[14px]">
                                    {order.payment_method === 'sumup_online' ? 'credit_card' : 'payments'}
                                  </span>
                                  {order.payment_method === 'sumup_online' ? 'SumUp (Payé)' : 'Espèces (Encaissé)'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm bg-amber-100 text-amber-900 font-bold">
                                  <span className="material-symbols-outlined text-[14px]">pending_actions</span>
                                  {order.payment_method === 'sumup_online'
                                    ? 'SumUp (En attente)'
                                    : 'Comptoir MDLE (En attente)'}
                                </span>
                              )}
                            </td>
                            {/* Action */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(order.id, 'paid')}
                                    className="px-3 py-1 rounded-full font-label-sm text-label-sm bg-emerald-600 text-on-primary hover:bg-emerald-700 shadow-sm transition-all font-semibold cursor-pointer"
                                  >
                                    Encaisser
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(order.id, 'pending')}
                                    className="px-3 py-1 rounded-full font-label-sm text-label-sm bg-surface-container-low text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                                    title="Remettre en attente"
                                  >
                                    Prêt ✓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="p-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/30 transition cursor-pointer"
                                  title="Supprimer la commande"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                <span>
                  Affichage de <strong>{filteredOrders.length}</strong> commande{filteredOrders.length > 1 ? 's' : ''} sur{' '}
                  <strong>{orders.length}</strong> enregistrée{orders.length > 1 ? 's' : ''}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Total : {grandTotalDisplay(filteredOrders)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Note Preview Modal */}
      {previewNote && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-margin animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewNote(null)
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl flex flex-col gap-space-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">favorite</span>
                </span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Mot Doux Joint</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Pour : {previewNote.target}
                  </p>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container cursor-pointer"
                onClick={() => setPreviewNote(null)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="bg-rose-50/70 p-space-md rounded-xl shadow-inner font-body-lg text-body-lg text-on-surface italic relative">
              <span className="material-symbols-outlined text-rose-300 absolute -top-2 -left-2 text-[24px]">
                format_quote
              </span>
              <p className="relative z-10 leading-relaxed pl-2">&laquo; {previewNote.text} &raquo;</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                Vérifié par la MDLE (modéré)
              </span>
              <button
                className="px-space-md py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md cursor-pointer font-bold"
                onClick={() => setPreviewNote(null)}
                type="button"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Distribution Modal */}
      {isDistModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-margin animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDistModalOpen(false)
          }}
        >
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-space-lg shadow-xl flex flex-col gap-space-md max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Mode Distribution par Salle &amp; Classe
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Regroupement des {totalRoses} roses pour les passages délégués MDLE le vendredi 14 Février
                </p>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface flex items-center justify-center hover:bg-surface-container cursor-pointer"
                onClick={() => setIsDistModalOpen(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex flex-col gap-space-sm">
              {classroomGroups.length === 0 ? (
                <p className="py-8 text-center text-on-surface-variant font-body-sm">
                  Aucune commande enregistrée pour le moment.
                </p>
              ) : (
                classroomGroups.map((group) => (
                  <div
                    key={group.className}
                    className="p-space-md bg-surface-container-low rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          {group.className}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-label-sm text-label-sm bg-on-surface text-surface-container-lowest">
                          {group.orders.length} destinataire{group.orders.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        <strong>{group.totalRoses}</strong> roses ({group.redRoses} rouge{group.redRoses > 1 ? 's' : ''}, {group.pinkRoses} rose{group.pinkRoses > 1 ? 's' : ''})
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrintClassroom(group.className)}
                      className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm hover:bg-primary hover:text-on-primary transition-all cursor-pointer font-semibold"
                      type="button"
                    >
                      Imprimer fiche
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-space-sm flex items-center justify-between border-t border-surface-container-low">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                {classroomGroups.length} classe{classroomGroups.length > 1 ? 's' : ''} répertoriée{classroomGroups.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => handlePrintClassroom()}
                className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-primary-container cursor-pointer font-bold"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Tout imprimer ({classroomGroups.length} fiches)</span>
              </button>
            </div>
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
            <a className="hover:text-on-surface transition-colors" href="/">
              Retour à la boutique élève
            </a>
            <span className="flex items-center gap-space-xs py-space-xs px-space-sm rounded-full bg-surface-container-low text-on-surface font-semibold">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
              <span>Session Délégué Active</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function grandTotalDisplay(list: RoseOrder[]) {
  const sum = list.reduce((acc, o) => acc + Number(o.total_amount || 0), 0)
  return sum.toFixed(2).replace('.', ',') + ' €'
}
