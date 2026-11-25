'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Edit,
  Send,
  Pause,
  Play,
  X,
  Lock,
  PackageCheck,
  RefreshCw,
  LogOut,
} from 'lucide-react'
import {
  DELIVERY_DATE_LABEL,
  EDITION_YEAR,
  PRICE_PER_ROSE,
} from '@/lib/config'

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
  sender_name: string
  sender_email: string
  total_amount: number
  payment_method: 'sumup_online' | 'mdle_counter'
  payment_status: 'pending' | 'paid' | 'expired'
  sumup_checkout_id: string | null
  delivered: boolean
  delivered_at: string | null
  reminders_count: number
  last_reminder_at: string | null
  reminders_opt_out: boolean
  unsubscribe_token: string
}

type DryRunResult = {
  success: boolean
  timestamp: string
  total_pending: number
  would_remind_count: number
  would_expire_count: number
  would_skip_count: number
  would_remind: Array<{
    id: string
    recipient_name: string
    sender_name: string
    sender_email: string
    total_amount: number
    days_until: number
  }>
  would_expire: Array<{
    id: string
    recipient_name: string
  }>
  would_skip: Array<{
    id: string
    recipient_name: string
    reason: string
  }>
}

export default function AdminRosesComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Orders data
  const [orders, setOrders] = useState<RoseOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'pending' | 'expired' | 'to_remind' | 'delivered' | 'not_delivered'>('all')

  // Florist calculation
  const floristUnitCost = 0.85

  // Modals
  const [previewNote, setPreviewNote] = useState<{ target: string; text: string; sender: string; isAnon: boolean } | null>(null)
  const [editingOrder, setEditingOrder] = useState<RoseOrder | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [dryRunData, setDryRunData] = useState<DryRunResult | null>(null)
  const [isDryRunLoading, setIsDryRunLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'distribution'>('table')

  // Fetch orders helper
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

  // Check session on mount
  useEffect(() => {
    let isMounted = true
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((res) => {
        if (isMounted) setIsAuthenticated(res.ok)
      })
      .catch(() => {
        if (isMounted) setIsAuthenticated(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch orders when authenticated
  useEffect(() => {
    let isMounted = true
    if (isAuthenticated) {
      fetch('/api/admin/roses', { cache: 'no-store' })
        .then(async (res) => {
          if (!isMounted) return
          if (res.status === 401) {
            setIsAuthenticated(false)
          } else if (res.ok) {
            const data = await res.json()
            setOrders(data.orders || [])
          }
        })
        .catch((err) => console.error(err))
        .finally(() => {
          if (isMounted) setLoadingOrders(false)
        })
    }
    return () => {
      isMounted = false
    }
  }, [isAuthenticated])

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput) return
    setAuthError(null)
    setAuthLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })

      const data = await res.json()
      if (res.ok) {
        setIsAuthenticated(true)
        setPasswordInput('')
        await fetchOrders()
      } else {
        setAuthError(data.error || 'Mot de passe incorrect.')
      }
    } catch {
      setAuthError('Erreur de connexion au serveur.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
    } catch {
      // ignore
    }
    setIsAuthenticated(false)
    setOrders([])
  }

  // Toggle Payment Status
  const handleUpdatePaymentStatus = async (orderId: string, newStatus: 'paid' | 'pending' | 'expired') => {
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
        showNotification('Statut de paiement mis à jour.', 'success')
      } else {
        showNotification('Impossible de modifier le statut.', 'error')
      }
    } catch {
      showNotification('Erreur réseau.', 'error')
    }
  }

  // Toggle Delivered Status
  const handleToggleDelivered = async (orderId: string, currentDelivered: boolean) => {
    try {
      const res = await fetch('/api/admin/roses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, delivered: !currentDelivered }),
      })
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, delivered: !currentDelivered } : o))
        )
      } else {
        showNotification('Impossible de modifier le statut de livraison.', 'error')
      }
    } catch {
      showNotification('Erreur réseau.', 'error')
    }
  }

  // Toggle Reminders Opt-Out
  const handleToggleRemindersOptOut = async (orderId: string, currentOptOut: boolean) => {
    try {
      const res = await fetch('/api/admin/roses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, reminders_opt_out: !currentOptOut }),
      })
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, reminders_opt_out: !currentOptOut } : o))
        )
        showNotification(currentOptOut ? 'Relances réactivées.' : 'Relances suspendues pour cette commande.', 'success')
      } else {
        showNotification('Erreur réseau.', 'error')
      }
    } catch {
      showNotification('Erreur réseau.', 'error')
    }
  }

  // Send Manual Reminder
  const handleSendManualReminder = async (orderId: string) => {
    try {
      const res = await fetch('/api/admin/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      })
      const data = await res.json()
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  reminders_count: (o.reminders_count || 0) + 1,
                  last_reminder_at: new Date().toISOString(),
                }
              : o
          )
        )
        showNotification(data.message || 'Relance envoyée avec succès.', 'success')
      } else {
        showNotification(data.error || 'Échec de l’envoi de la relance.', 'error')
      }
    } catch {
      showNotification('Erreur réseau lors de l’envoi.', 'error')
    }
  }

  // Save Order Edits
  const handleSaveOrderEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    try {
      const res = await fetch('/api/admin/roses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingOrder.id,
          recipient_name: editingOrder.recipient_name,
          recipient_class: editingOrder.recipient_class,
          message_text: editingOrder.message_text,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? { ...o, ...data.order } : o)))
        setEditingOrder(null)
        showNotification('Commande mise à jour avec succès.', 'success')
      } else {
        showNotification('Impossible d’enregistrer les modifications.', 'error')
      }
    } catch {
      showNotification('Erreur réseau.', 'error')
    }
  }

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/roses?id=${orderId}`, { method: 'DELETE' })
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId))
        setDeleteConfirmId(null)
        showNotification('Commande supprimée.', 'success')
      } else {
        showNotification('Impossible de supprimer la commande.', 'error')
      }
    } catch {
      showNotification('Erreur réseau.', 'error')
    }
  }

  // Dry Run Preview
  const handleDryRun = async () => {
    setIsDryRunLoading(true)
    try {
      const res = await fetch('/api/admin/reminders/dry-run')
      if (res.ok) {
        const data = (await res.json()) as DryRunResult
        setDryRunData(data)
      } else {
        showNotification('Impossible d’effectuer la simulation.', 'error')
      }
    } catch {
      showNotification('Erreur réseau lors du dry-run.', 'error')
    } finally {
      setIsDryRunLoading(false)
    }
  }

  // Notification helper
  const showNotification = (text: string, type: 'success' | 'error') => {
    setActionMessage({ text, type })
    setTimeout(() => setActionMessage(null), 4000)
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID Commande',
      'Date & Heure',
      'Statut Paiement',
      'Mode Paiement',
      'Destinataire',
      'Classe / Salle',
      'Roses Rouges',
      'Roses Roses',
      'Total Roses',
      'Mot Doux (Oui/Non)',
      'Contenu Mot Doux',
      'Expéditeur Réel (Nom)',
      'Expéditeur E-mail',
      'Anonyme pour le destinataire (Oui/Non)',
      'Livré en classe (Oui/Non)',
      'Nombre de relances',
      'Dernière relance',
      'Montant Total (€)',
    ]

    const rows = orders.map((o) => [
      `#ORD-${o.id.slice(0, 8).toUpperCase()}`,
      new Date(o.created_at).toLocaleString('fr-FR'),
      o.payment_status === 'paid' ? 'Payé' : o.payment_status === 'expired' ? 'Expiré' : 'En attente',
      o.payment_method === 'sumup_online' ? 'Carte Bancaire SumUp' : 'Comptoir MDLE',
      `"${o.recipient_name.replace(/"/g, '""')}"`,
      `"${o.recipient_class.replace(/"/g, '""')}"`,
      o.red_roses_count,
      o.pink_roses_count,
      o.red_roses_count + o.pink_roses_count,
      o.has_message ? 'Oui' : 'Non',
      `"${(o.message_text || '').replace(/"/g, '""')}"`,
      `"${(o.sender_name || '').replace(/"/g, '""')}"`,
      `"${(o.sender_email || '').replace(/"/g, '""')}"`,
      o.is_anonymous ? 'Oui' : 'Non',
      o.delivered ? 'Oui' : 'Non',
      o.reminders_count || 0,
      o.last_reminder_at ? new Date(o.last_reminder_at).toLocaleString('fr-FR') : 'Jamais',
      Number(o.total_amount).toFixed(2),
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `commandes_roses_saint_valentin_${EDITION_YEAR}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // KPIs
  const totalRoses = orders.reduce((acc, o) => acc + o.red_roses_count + o.pink_roses_count, 0)
  const totalRed = orders.reduce((acc, o) => acc + o.red_roses_count, 0)
  const totalPink = orders.reduce((acc, o) => acc + o.pink_roses_count, 0)
  const paidOrders = orders.filter((o) => o.payment_status === 'paid')
  const pendingOrders = orders.filter((o) => o.payment_status === 'pending')
  const deliveredOrders = orders.filter((o) => o.delivered)

  const totalGrossRevenue = paidOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0)
  const totalFloristCost = totalRoses * floristUnitCost
  const netEstimatedProfit = totalGrossRevenue - totalFloristCost

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtre d'onglet
      if (activeFilter === 'paid' && order.payment_status !== 'paid') return false
      if (activeFilter === 'pending' && order.payment_status !== 'pending') return false
      if (activeFilter === 'expired' && order.payment_status !== 'expired') return false
      if (activeFilter === 'to_remind' && (order.payment_status !== 'pending' || order.reminders_opt_out)) return false
      if (activeFilter === 'delivered' && !order.delivered) return false
      if (activeFilter === 'not_delivered' && order.delivered) return false

      // Recherche plein texte (destinataire, classe, expéditeur réel, e-mail, référence)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const haystack = `
          ${order.recipient_name}
          ${order.recipient_class}
          ${order.sender_name}
          ${order.sender_email}
          ${order.id}
          ord-${order.id.slice(0, 8)}
        `.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [orders, activeFilter, searchQuery])

  // Groupes par classe pour la feuille d'émargement / distribution imprimable
  const classroomGroups = useMemo(() => {
    const map = new Map<string, { className: string; orders: RoseOrder[]; totalRoses: number }>()

    orders.forEach((o) => {
      const cls = o.recipient_class.trim() || 'Non spécifiée'
      const existing = map.get(cls) || { className: cls, orders: [], totalRoses: 0 }
      existing.orders.push(o)
      existing.totalRoses += o.red_roses_count + o.pink_roses_count
      map.set(cls, existing)
    })

    return Array.from(map.values()).sort((a, b) => a.className.localeCompare(b.className))
  }, [orders])

  // Loading initial
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#FFF8F7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b7102a] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Non authentifié : écran de connexion sécurisé
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FFF8F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#F6DEDC] bg-[#FFF0EF] mx-auto flex items-center justify-center mb-3">
            <Image src="/logo-mdle.png" alt="MDLE" width={56} height={56} className="object-contain" priority />
          </div>
          <h2 className="text-2xl font-extrabold text-[#231919]">
            Administration MDLE
          </h2>
          <p className="mt-1 text-xs text-[#565e74]">
            Gestion de l&apos;opération Saint-Valentin {EDITION_YEAR}
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-[#F6DEDC]">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin_pass" className="block text-xs font-bold text-[#231919] mb-1.5">
                  Mot de passe d&apos;accès bureau
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#565e74] absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="admin_pass"
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-[#F6DEDC] bg-[#FFF8F7] focus:bg-white text-[#231919]"
                  />
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading || !passwordInput}
                className="w-full py-2.5 bg-[#b7102a] hover:bg-[#9b0b21] text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                {authLoading ? 'Vérification...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#F6DEDC] text-center">
              <Link href="/" className="text-xs text-[#565e74] hover:text-[#b7102a] underline">
                ← Retour à la boutique publique
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8F7] text-[#231919]">
      {/* Toast Notification */}
      {actionMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 transition-all no-print ${
            actionMessage.type === 'success'
              ? 'bg-green-50 text-green-900 border-green-200'
              : 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {actionMessage.text}
        </div>
      )}

      {/* HEADER ADMIN */}
      <header className="bg-white border-b border-[#F6DEDC] sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[#F6DEDC] bg-[#FFF0EF] flex items-center justify-center shrink-0">
              <Image src="/logo-mdle.png" alt="MDLE" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#b7102a] uppercase tracking-wider block">
                Tableau de Bord Bureau MDLE
              </span>
              <h1 className="text-base font-extrabold text-[#231919]">
                Saint-Valentin {EDITION_YEAR}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'distribution' : 'table')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7] hover:bg-[#FFF0EF] text-[#231919] flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#b7102a]" />
              {viewMode === 'table' ? 'Feuille d’émargement' : 'Vue commandes'}
            </button>

            <button
              onClick={handleExportCSV}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7] hover:bg-[#FFF0EF] text-[#231919] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#b7102a]" />
              Export CSV
            </button>

            <button
              onClick={fetchOrders}
              disabled={loadingOrders}
              className="p-1.5 rounded-lg border border-[#F6DEDC] hover:bg-[#FFF0EF] text-[#565e74]"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg border border-[#F6DEDC] hover:bg-[#ffdad6] text-[#ba1a1a]"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* VUE 1 : FEUILLE D'ÉMARGEMENT / DISTRIBUTION EN CLASSE (@media print) */}
      {viewMode === 'distribution' && (
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="no-print bg-white p-4 rounded-xl border border-[#F6DEDC] mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#231919]">Mode distribution en classe</h2>
              <p className="text-xs text-[#565e74]">
                Feuille prête à imprimer : saut de page par classe. Les noms des expéditeurs anonymes sont masqués conformément au règlement.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#b7102a] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimer les feuilles
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="px-4 py-2 bg-[#FFF8F7] border border-[#F6DEDC] rounded-lg text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>

          {/* Feuilles par classe */}
          {classroomGroups.map((group) => (
            <div key={group.className} className="page-break-after bg-white p-6 sm:p-8 rounded-2xl border border-[#F6DEDC] mb-8 shadow-xs">
              <div className="border-b-2 border-[#b7102a] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#b7102a] uppercase">Feuille de distribution • St-Valentin {EDITION_YEAR}</span>
                  <h3 className="text-xl font-black text-[#231919]">Classe : {group.className}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#565e74] block">Distribution officielle</span>
                  <span className="text-sm font-bold text-[#231919]">{DELIVERY_DATE_LABEL}</span>
                </div>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 text-gray-700 font-bold">
                    <th className="py-2.5 px-3">Destinataire</th>
                    <th className="py-2.5 px-2">Roses</th>
                    <th className="py-2.5 px-3">Mot Doux</th>
                    <th className="py-2.5 px-3">De la part de</th>
                    <th className="py-2.5 px-2 text-center">Émargement / Livré</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-bold text-sm text-gray-900">
                        {order.recipient_name}
                      </td>
                      <td className="py-3 px-2 font-medium">
                        {order.red_roses_count > 0 && <span className="text-[#b7102a] font-bold">{order.red_roses_count} R </span>}
                        {order.pink_roses_count > 0 && <span className="text-[#db313f] font-bold">{order.pink_roses_count} P</span>}
                      </td>
                      <td className="py-3 px-3 max-w-xs text-gray-800">
                        {order.has_message ? (
                          <div className="italic bg-[#FFF8F7] p-2 rounded border border-[#F6DEDC] text-[11px]">
                            &ldquo;{order.message_text}&rdquo;
                          </div>
                        ) : (
                          <span className="text-gray-400">Sans mot</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {order.is_anonymous ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                            Anonyme
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-900">{order.sender_name}</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={order.delivered}
                          onChange={() => handleToggleDelivered(order.id, order.delivered)}
                          className="w-5 h-5 text-[#b7102a] rounded cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-500">
                <span>Total élèves dans cette classe : <strong>{group.orders.length}</strong></span>
                <span>Total roses à distribuer : <strong>{group.totalRoses}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VUE 2 : TABLEAU DE BORD DE GESTION */}
      {viewMode === 'table' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* STATS & KPIS */}
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Commandes</span>
              <div className="text-xl font-extrabold text-[#231919] mt-0.5">{orders.length}</div>
              <span className="text-[10px] text-green-700 font-semibold">{paidOrders.length} réglées</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Volume Roses</span>
              <div className="text-xl font-extrabold text-[#b7102a] mt-0.5">{totalRoses}</div>
              <span className="text-[10px] text-[#565e74]">{totalRed} Rouges • {totalPink} Roses</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Recettes Encaissées</span>
              <div className="text-xl font-extrabold text-green-700 mt-0.5">{totalGrossRevenue.toFixed(2)} €</div>
              <span className="text-[10px] text-[#565e74]">{pendingOrders.length} en attente</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Mots Doux</span>
              <div className="text-xl font-extrabold text-[#231919] mt-0.5">
                {orders.filter((o) => o.has_message).length}
              </div>
              <span className="text-[10px] text-[#565e74]">cartes à rédiger</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Livraisons</span>
              <div className="text-xl font-extrabold text-[#231919] mt-0.5">
                {deliveredOrders.length} / {orders.length}
              </div>
              <div className="w-full bg-[#F6DEDC] h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-[#b7102a] h-full transition-all"
                  style={{ width: `${orders.length > 0 ? (deliveredOrders.length / orders.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-[#F6DEDC] shadow-2xs">
              <span className="text-[11px] font-bold text-[#565e74] uppercase block">Bénéfice estimé</span>
              <div className="text-xl font-extrabold text-[#b7102a] mt-0.5">{netEstimatedProfit.toFixed(2)} €</div>
              <span className="text-[10px] text-[#565e74]">frais fleuriste {floristUnitCost}€</span>
            </div>
          </section>

          {/* BARRE D'ACTIONS & FILTRES */}
          <div className="bg-white p-4 rounded-xl border border-[#F6DEDC] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            {/* Recherche */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#565e74] absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher élève, expéditeur, classe, réf..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7] focus:bg-white text-[#231919]"
              />
            </div>

            {/* Onglets Filtres */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  activeFilter === 'all' ? 'bg-[#b7102a] text-white' : 'bg-[#FFF8F7] text-[#565e74] hover:bg-[#FFF0EF]'
                }`}
              >
                Tous ({orders.length})
              </button>
              <button
                onClick={() => setActiveFilter('paid')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  activeFilter === 'paid' ? 'bg-green-700 text-white' : 'bg-[#FFF8F7] text-[#565e74] hover:bg-[#FFF0EF]'
                }`}
              >
                Payées ({paidOrders.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  activeFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-[#FFF8F7] text-[#565e74] hover:bg-[#FFF0EF]'
                }`}
              >
                En attente ({pendingOrders.length})
              </button>
              <button
                onClick={() => setActiveFilter('to_remind')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  activeFilter === 'to_remind' ? 'bg-[#b7102a] text-white' : 'bg-[#FFF8F7] text-[#565e74] hover:bg-[#FFF0EF]'
                }`}
              >
                À relancer
              </button>
            </div>

            {/* Bouton Dry-Run Cron */}
            <button
              onClick={handleDryRun}
              disabled={isDryRunLoading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7] hover:bg-[#FFF0EF] text-[#231919] flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-[#b7102a]" />
              Simulation Relances
            </button>
          </div>

          {/* TABLEAU DES COMMANDES */}
          <div className="bg-white rounded-2xl border border-[#F6DEDC] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FFF0EF] border-b border-[#F6DEDC] text-[#231919] font-bold">
                    <th className="py-3 px-3">Réf</th>
                    <th className="py-3 px-3">Destinataire</th>
                    <th className="py-3 px-2">Classe</th>
                    <th className="py-3 px-2">Roses</th>
                    <th className="py-3 px-2">Mot Doux</th>
                    <th className="py-3 px-3">Expéditeur Réel (MDLE)</th>
                    <th className="py-3 px-2">Règlement</th>
                    <th className="py-3 px-2">Statut</th>
                    <th className="py-3 px-2 text-center">Livré</th>
                    <th className="py-3 px-2">Relances</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F6DEDC]">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-[#565e74]">
                        Aucune commande ne correspond aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#FFF8F7] transition-colors">
                        {/* Réf */}
                        <td className="py-3 px-3 font-mono font-bold text-[#b7102a]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>

                        {/* Destinataire */}
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#231919] block">{order.recipient_name}</span>
                        </td>

                        {/* Classe */}
                        <td className="py-3 px-2">
                          <span className="inline-block bg-[#FFF0EF] text-[#231919] px-2 py-0.5 rounded font-medium text-[11px]">
                            {order.recipient_class}
                          </span>
                        </td>

                        {/* Roses */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          {order.red_roses_count > 0 && (
                            <span className="font-bold text-[#b7102a]">{order.red_roses_count} R </span>
                          )}
                          {order.pink_roses_count > 0 && (
                            <span className="font-bold text-[#db313f]">{order.pink_roses_count} P</span>
                          )}
                          <span className="text-[#565e74] text-[11px] block">
                            {(order.red_roses_count + order.pink_roses_count) * PRICE_PER_ROSE} €
                          </span>
                        </td>

                        {/* Mot doux */}
                        <td className="py-3 px-2">
                          {order.has_message ? (
                            <button
                              onClick={() =>
                                setPreviewNote({
                                  target: order.recipient_name,
                                  text: order.message_text || '',
                                  sender: order.sender_name,
                                  isAnon: order.is_anonymous,
                                })
                              }
                              className="text-[11px] font-bold text-[#b7102a] hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Lire
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#565e74]">-</span>
                          )}
                        </td>

                        {/* Expéditeur Réel + Badge Anonymat */}
                        <td className="py-3 px-3">
                          <span className="font-medium text-[#231919] block">{order.sender_name}</span>
                          <span className="text-[10px] text-[#565e74] block">{order.sender_email}</span>
                          {order.is_anonymous && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ffdad8] text-[#92001c] mt-0.5">
                              <Lock className="w-2.5 h-2.5" /> Anonyme pour dest.
                            </span>
                          )}
                        </td>

                        {/* Mode Règlement */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className="text-[11px] text-[#565e74] block">
                            {order.payment_method === 'sumup_online' ? 'CB SumUp' : 'Comptoir MDLE'}
                          </span>
                          <span className="font-bold text-[#231919]">{Number(order.total_amount).toFixed(2)} €</span>
                        </td>

                        {/* Statut Paiement (avec bascule rapide) */}
                        <td className="py-3 px-2">
                          {order.payment_status === 'paid' ? (
                            <button
                              onClick={() => handleUpdatePaymentStatus(order.id, 'pending')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-100 text-green-800 hover:bg-green-200"
                              title="Cliquer pour repasser en attente"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Payé
                            </button>
                          ) : order.payment_status === 'expired' ? (
                            <button
                              onClick={() => handleUpdatePaymentStatus(order.id, 'pending')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              Expiré
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdatePaymentStatus(order.id, 'paid')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200"
                              title="Cliquer pour valider le paiement comptoir"
                            >
                              <Clock className="w-3 h-3" /> En attente
                            </button>
                          )}
                        </td>

                        {/* Case Livré */}
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => handleToggleDelivered(order.id, order.delivered)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              order.delivered
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={order.delivered ? 'Marqué livré (cliquer pour annuler)' : 'Marquer comme livré'}
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Relances automatiques */}
                        <td className="py-3 px-2 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span>{order.reminders_count || 0} relance(s)</span>
                            {order.payment_status === 'pending' && (
                              <button
                                onClick={() => handleSendManualReminder(order.id)}
                                className="p-1 text-[#b7102a] hover:bg-[#FFF0EF] rounded"
                                title="Relancer immédiatement par e-mail"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleRemindersOptOut(order.id, order.reminders_opt_out)}
                              className={`p-1 rounded ${
                                order.reminders_opt_out ? 'text-amber-700 bg-amber-50' : 'text-gray-400 hover:text-gray-600'
                              }`}
                              title={order.reminders_opt_out ? 'Relances en pause (cliquer pour réactiver)' : 'Mettre en pause les relances'}
                            >
                              {order.reminders_opt_out ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                            </button>
                          </div>
                          {order.last_reminder_at && (
                            <span className="text-[10px] text-[#565e74] block">
                              Dernière : {new Date(order.last_reminder_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="p-1 text-[#565e74] hover:text-[#231919] hover:bg-[#FFF0EF] rounded mr-1"
                            title="Modifier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(order.id)}
                            className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* MODALE PRÉVISUALISATION DU MOT DOUX */}
      {/* ======================================================== */}
      {previewNote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewNote(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#F6DEDC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#231919]">Carte mot doux</h3>
              <button onClick={() => setPreviewNote(null)} className="p-1 text-[#565e74]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#FFF8F7] border border-[#F6DEDC] p-4 rounded-xl mb-4">
              <span className="text-xs text-[#565e74] block mb-1">Pour : <strong>{previewNote.target}</strong></span>
              <p className="text-sm text-[#231919] italic leading-relaxed whitespace-pre-wrap font-serif">
                &ldquo;{previewNote.text}&rdquo;
              </p>
              <span className="text-xs text-[#565e74] block mt-3 text-right">
                De la part de : <strong>{previewNote.isAnon ? 'Anonyme (MDLE)' : previewNote.sender}</strong>
                {previewNote.isAnon && <span className="block text-[10px] text-[#b7102a]">(Expéditeur réel : {previewNote.sender})</span>}
              </span>
            </div>

            <button
              onClick={() => setPreviewNote(null)}
              className="w-full py-2 bg-[#231919] text-white rounded-xl text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE ÉDITION DE COMMANDE */}
      {/* ======================================================== */}
      {editingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditingOrder(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#F6DEDC]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <h3 className="text-base font-bold text-[#231919]">
                Modifier la commande #{editingOrder.id.slice(0, 8).toUpperCase()}
              </h3>
              <button onClick={() => setEditingOrder(null)} className="p-1 text-[#565e74]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#231919] mb-1">Destinataire</label>
                <input
                  type="text"
                  required
                  value={editingOrder.recipient_name}
                  onChange={(e) => setEditingOrder({ ...editingOrder, recipient_name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231919] mb-1">Classe</label>
                <input
                  type="text"
                  required
                  value={editingOrder.recipient_class}
                  onChange={(e) => setEditingOrder({ ...editingOrder, recipient_class: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#231919] mb-1">Mot doux manuscrit (max 200 car.)</label>
                <textarea
                  rows={3}
                  maxLength={200}
                  value={editingOrder.message_text || ''}
                  onChange={(e) => setEditingOrder({ ...editingOrder, message_text: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#F6DEDC] bg-[#FFF8F7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 border border-[#F6DEDC] rounded-lg text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b7102a] text-white rounded-lg text-xs font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE CONFIRMATION DE SUPPRESSION */}
      {/* ======================================================== */}
      {deleteConfirmId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#ffdad6] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#231919] mb-1">Supprimer cette commande ?</h3>
            <p className="text-xs text-[#565e74] mb-6">
              Cette action est irréversible. Les données seront définitivement effacées de la base de données.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 border border-[#F6DEDC] rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteOrder(deleteConfirmId)}
                className="flex-1 py-2 bg-[#ba1a1a] text-white rounded-lg text-xs font-bold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE DRY-RUN SIMULATION DE RELANCES */}
      {/* ======================================================== */}
      {dryRunData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDryRunData(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#F6DEDC] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#F6DEDC] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#231919]">Simulation Cron Relances (Dry-Run)</h3>
                <span className="text-xs text-[#565e74]">
                  Prévisualisation sans envoi réel d&apos;e-mails
                </span>
              </div>
              <button onClick={() => setDryRunData(null)} className="p-1 text-[#565e74]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[11px] text-blue-700 block font-bold">À Relancer</span>
                <span className="text-lg font-black text-blue-900">{dryRunData.would_remind_count}</span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-[11px] text-red-700 block font-bold">À Expirer</span>
                <span className="text-lg font-black text-red-900">{dryRunData.would_expire_count}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-[11px] text-gray-700 block font-bold">Ignorées</span>
                <span className="text-lg font-black text-gray-900">{dryRunData.would_skip_count}</span>
              </div>
            </div>

            {dryRunData.would_remind.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-bold text-[#b7102a] uppercase mb-2">Commandes qui recevraient une relance :</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                  {dryRunData.would_remind.map((item) => (
                    <div key={item.id} className="p-2 bg-[#FFF8F7] border border-[#F6DEDC] rounded flex justify-between">
                      <span>#{item.id.slice(0, 8)} • {item.sender_name} ({item.sender_email})</span>
                      <span className="font-bold text-[#b7102a]">{item.total_amount} € ({item.days_until}j restants)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setDryRunData(null)}
              className="w-full py-2.5 bg-[#231919] text-white rounded-xl text-xs font-bold"
            >
              Fermer la simulation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
