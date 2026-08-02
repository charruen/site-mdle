'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, CheckCircle, Clock, Trash2, Search } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function AdminRosesPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rose_orders')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const togglePaid = async (id: number, currentStatus: boolean) => {
    await supabase.from('rose_orders').update({ is_paid: !currentStatus }).eq('id', id)
    fetchOrders()
  }

  const toggleDelivered = async (id: number, currentStatus: boolean) => {
    await supabase.from('rose_orders').update({ is_delivered: !currentStatus }).eq('id', id)
    fetchOrders()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer cette commande ?')) {
      await supabase.from('rose_orders').delete().eq('id', id)
      fetchOrders()
    }
  }

  // Filtrage par recherche
  const filteredOrders = orders.filter((o) =>
    `${o.buyer_firstname} ${o.buyer_lastname} ${o.receiver_firstname} ${o.receiver_lastname} ${o.receiver_class}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  // Statistiques rapides
  const totalRoses = orders.reduce((acc, curr) => acc + (curr.quantity || 0), 0)
  const totalRevenue = orders.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0)
  const paidCount = orders.filter((o) => o.is_paid).length

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête avec bouton retour */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#F26D5B] transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Retour au panneau admin
            </a>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              🌹 Commandes de Roses St-Valentin
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-white border border-[#1B2A4A]/10 px-4 py-2 rounded-2xl shadow-sm">
            <Search className="w-4 h-4 text-[#1B2A4A]/40" />
            <input
              type="text"
              placeholder="Rechercher nom, classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none w-48"
            />
          </div>
        </div>

        {/* Bannières de statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-xs font-bold text-[#1B2A4A]/60 uppercase">Total Roses</p>
            <p className="text-2xl font-black text-[#F26D5B] mt-1">{totalRoses} 🌹</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-xs font-bold text-[#1B2A4A]/60 uppercase">Chiffre d'affaires</p>
            <p className="text-2xl font-black text-[#1B2A4A] mt-1">{totalRevenue.toFixed(2)} €</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm col-span-2 md:col-span-1">
            <p className="text-xs font-bold text-[#1B2A4A]/60 uppercase">Paiements validés</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {paidCount} / {orders.length}
            </p>
          </div>
        </div>

        {/* Tableau récapitulatif */}
        <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm font-bold text-[#1B2A4A]/60">
              Chargement des commandes...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-[#1B2A4A]/60">
              Aucune commande trouvée.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFAF8] border-b border-[#1B2A4A]/10 font-bold uppercase text-[#1B2A4A]/60">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Acheteur (Confidentiel)</th>
                    <th className="p-4">Destinataire</th>
                    <th className="p-4">Détails</th>
                    <th className="p-4">Message (+0,50€)</th>
                    <th className="p-4">Total</th>
                    <th className="p-4 text-center">Paiement</th>
                    <th className="p-4 text-center">Livraison</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A4A]/5">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAFAF8]/80 transition">
                      <td className="p-4 font-bold text-[#1B2A4A]/40">#{order.id}</td>
                      
                      {/* Acheteur */}
                      <td className="p-4">
                        <p className="font-bold text-[#1B2A4A]">
                          {order.buyer_firstname} {order.buyer_lastname}
                        </p>
                        <p className="text-[10px] text-[#1B2A4A]/60">{order.buyer_class}</p>
                      </td>

                      {/* Destinataire */}
                      <td className="p-4">
                        <p className="font-bold text-[#F26D5B]">
                          {order.receiver_firstname} {order.receiver_lastname}
                        </p>
                        <p className="text-[10px] text-[#1B2A4A]/60">{order.receiver_class}</p>
                      </td>

                      {/* Couleur / Quantité / Anonymat */}
                      <td className="p-4">
                        <p className="font-bold">
                          {order.quantity}x Rose {order.color}
                        </p>
                        {order.is_anonymous && (
                          <span className="inline-block mt-0.5 text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-md">
                            🤫 Anonyme
                          </span>
                        )}
                      </td>

                      {/* Message */}
                      <td className="p-4 max-w-xs">
                        {order.message ? (
                          <p className="italic text-[#1B2A4A]/80 bg-[#FAFAF8] p-2 rounded-xl border border-[#1B2A4A]/5 text-[11px]">
                            « {order.message} »
                          </p>
                        ) : (
                          <span className="text-[#1B2A4A]/30">—</span>
                        )}
                      </td>

                      {/* Prix Total */}
                      <td className="p-4 font-black text-[#1B2A4A]">
                        {Number(order.total_price).toFixed(2)} €
                      </td>

                      {/* Statut Paiement */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => togglePaid(order.id, order.is_paid)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            order.is_paid
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {order.is_paid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {order.is_paid ? 'Payé' : 'En attente'}
                        </button>
                      </td>

                      {/* Statut Livraison */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleDelivered(order.id, order.is_delivered)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            order.is_delivered
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {order.is_delivered ? 'Livrée 🌹' : 'À livrer'}
                        </button>
                      </td>

                      {/* Action Supprimer */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer la commande"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}