'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Project, ProjectSubmission } from '@/lib/projects'
import { ArrowLeft, CheckCircle, Clock, Trash2, Search, Download, ExternalLink, RefreshCw } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ProjectSubmissionsAdminPage() {
  const routeParams = useParams()
  const projectId = (routeParams?.id as string) || ''

  const [project, setProject] = useState<Project | null>(null)
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (projectId) {
      fetchProjectAndSubmissions()
    }
  }, [projectId])

  const fetchProjectAndSubmissions = async () => {
    setLoading(true)
    try {
      // 1. Récupération du projet
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      setProject(projData)

      if (projData) {
        // 2. Récupération des soumissions depuis project_submissions
        const { data: subsData } = await supabase
          .from('project_submissions')
          .select('*')
          .or(`project_id.eq.${projData.id},project_slug.eq.${projData.slug}`)
          .order('id', { ascending: false })

        let list: ProjectSubmission[] = subsData || []

        // Rétrocompatibilité : Si c'est les roses, fusionner ou utiliser les données de rose_orders
        if (projData.slug === 'roses') {
          const { data: roseOrdersData } = await supabase
            .from('rose_orders')
            .select('*')
            .order('id', { ascending: false })

          if (roseOrdersData && roseOrdersData.length > 0) {
            // Convertir rose_orders au format ProjectSubmission s'ils ne sont pas déjà dans list
            const legacyConverted: ProjectSubmission[] = roseOrdersData.map(r => ({
              id: r.id + 10000, // décalage d'ID visuel pour distinguer
              project_id: projData.id,
              project_slug: 'roses',
              buyer_firstname: r.buyer_firstname,
              buyer_lastname: r.buyer_lastname,
              buyer_class: r.buyer_class,
              receiver_firstname: r.receiver_firstname,
              receiver_lastname: r.receiver_lastname,
              receiver_class: r.receiver_class,
              selected_options: { color: `Rose ${r.color}` },
              quantity: r.quantity,
              is_anonymous: r.is_anonymous,
              message: r.message,
              total_price: r.total_price,
              is_paid: r.is_paid,
              is_delivered: r.is_delivered,
              created_at: r.created_at
            }))

            // Fusionner en évitant les doublons stricts si déjà ré-insérés
            if (list.length === 0) {
              list = legacyConverted
            }
          }
        }

        setSubmissions(list)
      }
    } catch {
      // Ignorer
    } finally {
      setLoading(false)
    }
  }

  const togglePaid = async (id: number, currentStatus: boolean) => {
    await supabase.from('project_submissions').update({ is_paid: !currentStatus }).eq('id', id)
    if (project?.slug === 'roses') {
      const legacyId = id > 10000 ? id - 10000 : id
      try {
        await supabase.from('rose_orders').update({ is_paid: !currentStatus }).eq('id', legacyId)
      } catch {
        // Ignorer si la table n'existe pas
      }
    }
    fetchProjectAndSubmissions()
  }

  const toggleDelivered = async (id: number, currentStatus: boolean) => {
    await supabase.from('project_submissions').update({ is_delivered: !currentStatus }).eq('id', id)
    if (project?.slug === 'roses') {
      const legacyId = id > 10000 ? id - 10000 : id
      try {
        await supabase.from('rose_orders').update({ is_delivered: !currentStatus }).eq('id', legacyId)
      } catch {
        // Ignorer si la table n'existe pas
      }
    }
    fetchProjectAndSubmissions()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Supprimer cette réservation ?')) {
      await supabase.from('project_submissions').delete().eq('id', id)
      if (project?.slug === 'roses') {
        const legacyId = id > 10000 ? id - 10000 : id
        try {
          await supabase.from('rose_orders').delete().eq('id', legacyId)
        } catch {
          // Ignorer si la table n'existe pas
        }
      }
      fetchProjectAndSubmissions()
    }
  }

  // Export CSV des données
  const exportToCSV = () => {
    if (submissions.length === 0) return

    const headers = [
      'ID',
      'Date',
      'Acheteur Prenom',
      'Acheteur Nom',
      'Acheteur Classe',
      'Destinataire Prenom',
      'Destinataire Nom',
      'Destinataire Classe',
      'Options Selectionnees',
      'Quantite',
      'Anonyme',
      'Message',
      'Prix Total',
      'Statut Paiement',
      'Statut Livraison'
    ]

    const rows = submissions.map(s => [
      s.id,
      s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
      `"${s.buyer_firstname || ''}"`,
      `"${s.buyer_lastname || ''}"`,
      `"${s.buyer_class || ''}"`,
      `"${s.receiver_firstname || ''}"`,
      `"${s.receiver_lastname || ''}"`,
      `"${s.receiver_class || ''}"`,
      `"${s.selected_options ? Object.values(s.selected_options).join(', ') : ''}"`,
      s.quantity || 1,
      s.is_anonymous ? 'Oui' : 'Non',
      `"${(s.message || '').replace(/"/g, '""')}"`,
      Number(s.total_price || 0).toFixed(2),
      s.is_paid ? 'Payé' : 'En attente',
      s.is_delivered ? 'Livré' : 'À livrer'
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `commandes_${project?.slug || 'projet'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtrage par recherche
  const filteredSubmissions = submissions.filter(s => {
    const searchString = `${s.buyer_firstname} ${s.buyer_lastname} ${s.buyer_class} ${s.receiver_firstname} ${s.receiver_lastname} ${s.receiver_class} ${JSON.stringify(s.selected_options)}`.toLowerCase()
    return searchString.includes(search.toLowerCase())
  })

  // Statistiques
  const totalSubmissions = submissions.length
  const totalQuantity = submissions.reduce((acc, curr) => acc + (curr.quantity || 1), 0)
  const totalRevenue = submissions.reduce((acc, curr) => acc + Number(curr.total_price || 0), 0)
  const paidCount = submissions.filter(s => s.is_paid).length

  if (loading && !project) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold">Chargement des commandes du projet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1B2A4A]/10 pb-6">
          <div className="space-y-1">
            <a
              href="/admin"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#1B2A4A]/60 hover:text-[#F26D5B] transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" /> Panneau Administration
            </a>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <span>{project?.emoji || '🚀'}</span> {project?.title || 'Gestion du Projet'}
            </h1>
            <p className="text-xs text-[#1B2A4A]/60">
              Consultez et validez les réservations enregistrées par les élèves.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={`/p/${project?.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border border-[#1B2A4A]/10 hover:bg-gray-50 text-[#1B2A4A] px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
            >
              <ExternalLink className="w-4 h-4" /> Formulaire Public
            </a>

            <button
              onClick={exportToCSV}
              disabled={submissions.length === 0}
              className="inline-flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#F26D5B] text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Exporter en CSV (Excel)
            </button>

            <button
              onClick={fetchProjectAndSubmissions}
              title="Rafraîchir les données"
              className="p-2.5 bg-white border border-[#1B2A4A]/10 rounded-2xl hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 text-[#1B2A4A]/70" />
            </button>
          </div>
        </div>

        {/* Bannières des Statistiques Key Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-[10px] font-bold text-[#1B2A4A]/60 uppercase">Réservations</p>
            <p className="text-2xl font-black text-[#1B2A4A] mt-1">{totalSubmissions}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-[10px] font-bold text-[#1B2A4A]/60 uppercase">Articles / Quantité</p>
            <p className="text-2xl font-black text-[#F26D5B] mt-1">{totalQuantity}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-[10px] font-bold text-[#1B2A4A]/60 uppercase">Chiffre d'affaires</p>
            <p className="text-2xl font-black text-[#1B2A4A] mt-1">{totalRevenue.toFixed(2)} €</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#1B2A4A]/10 shadow-sm">
            <p className="text-[10px] font-bold text-[#1B2A4A]/60 uppercase">Paiements Validés</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {paidCount} / {totalSubmissions}
            </p>
          </div>
        </div>

        {/* Barre de Recherche */}
        <div className="flex items-center gap-3 bg-white border border-[#1B2A4A]/10 px-4 py-3 rounded-2xl shadow-sm max-w-md">
          <Search className="w-4 h-4 text-[#1B2A4A]/40" />
          <input
            type="text"
            placeholder="Rechercher acheteur, destinataire, classe, option..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs font-semibold focus:outline-none w-full"
          />
        </div>

        {/* Tableau récapitulatif des réservations */}
        <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm font-bold text-[#1B2A4A]/60">
              Chargement des réservations...
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-sm font-bold text-[#1B2A4A]/60 space-y-1">
              <p>Aucune réservation trouvée pour le moment.</p>
              {search && <p className="text-xs font-normal text-[#1B2A4A]/40">Essayez de modifier votre recherche.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#FAFAF8] border-b border-[#1B2A4A]/10 font-bold uppercase text-[#1B2A4A]/60">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Acheteur / Participant</th>
                    {project?.form_config?.has_receiver && <th className="p-4">Destinataire</th>}
                    <th className="p-4">Options & Qte</th>
                    {project?.form_config?.allow_message && <th className="p-4">Message</th>}
                    <th className="p-4">Total</th>
                    <th className="p-4 text-center">Paiement</th>
                    <th className="p-4 text-center">Remise / Livré</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2A4A]/5">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#FAFAF8]/80 transition">
                      <td className="p-4 font-bold text-[#1B2A4A]/40">#{sub.id}</td>
                      
                      {/* Acheteur */}
                      <td className="p-4">
                        <p className="font-bold text-[#1B2A4A]">
                          {sub.buyer_firstname} {sub.buyer_lastname}
                        </p>
                        <p className="text-[10px] font-semibold text-[#1B2A4A]/60">{sub.buyer_class}</p>
                      </td>

                      {/* Destinataire (si applicable) */}
                      {project?.form_config?.has_receiver && (
                        <td className="p-4">
                          {sub.receiver_firstname ? (
                            <>
                              <p className="font-bold text-[#F26D5B]">
                                {sub.receiver_firstname} {sub.receiver_lastname}
                              </p>
                              <p className="text-[10px] text-[#1B2A4A]/60">{sub.receiver_class}</p>
                            </>
                          ) : (
                            <span className="text-[#1B2A4A]/30">—</span>
                          )}
                        </td>
                      )}

                      {/* Options / Variante / Quantité */}
                      <td className="p-4 space-y-0.5">
                        <p className="font-bold">
                          {sub.quantity > 1 && `${sub.quantity}x `}
                          {sub.selected_options ? Object.values(sub.selected_options).join(' • ') : 'Standard'}
                        </p>
                        {sub.is_anonymous && (
                          <span className="inline-block text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-md">
                            🤫 Anonyme
                          </span>
                        )}
                      </td>

                      {/* Message (si applicable) */}
                      {project?.form_config?.allow_message && (
                        <td className="p-4 max-w-xs">
                          {sub.message ? (
                            <p className="italic text-[#1B2A4A]/80 bg-[#FAFAF8] p-2 rounded-xl border border-[#1B2A4A]/5 text-[11px] line-clamp-3">
                              « {sub.message} »
                            </p>
                          ) : (
                            <span className="text-[#1B2A4A]/30">—</span>
                          )}
                        </td>
                      )}

                      {/* Prix Total */}
                      <td className="p-4 font-black text-[#1B2A4A]">
                        {Number(sub.total_price || 0).toFixed(2)} €
                      </td>

                      {/* Statut Paiement */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => togglePaid(sub.id, sub.is_paid)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            sub.is_paid
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {sub.is_paid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {sub.is_paid ? 'Payé' : 'En attente'}
                        </button>
                      </td>

                      {/* Statut Livraison */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleDelivered(sub.id, sub.is_delivered)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                            sub.is_delivered
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {sub.is_delivered ? 'Livré / Remis 📦' : 'À remettre'}
                        </button>
                      </td>

                      {/* Action Supprimer */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Supprimer la réservation"
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
