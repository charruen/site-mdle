import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { ProjectSubmission } from '@/lib/projects'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

type LegacyRoseOrder = {
  id: number
  buyer_firstname: string
  buyer_lastname: string
  buyer_class: string
  receiver_firstname: string
  receiver_lastname: string
  receiver_class: string
  color: string
  quantity: number
  is_anonymous: boolean
  message: string | null
  total_price: number
  is_paid: boolean
  is_delivered: boolean
  created_at?: string
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  return null
}

export async function GET(_request: Request, { params }: RouteContext) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const projectId = Number(id)
  if (!Number.isSafeInteger(projectId) || projectId < 1) {
    return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: project, error: projectError } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (projectError || !project) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
    }

    const { data: submissions, error: submissionsError } = await supabase
      .from('project_submissions')
      .select('*')
      .or(`project_id.eq.${project.id},project_slug.eq.${project.slug}`)
      .order('id', { ascending: false })

    if (submissionsError) throw submissionsError

    let normalizedSubmissions = (submissions ?? []) as ProjectSubmission[]
    if (project.slug === 'roses' && normalizedSubmissions.length === 0) {
      const { data: legacyOrders, error: legacyError } = await supabase.from('rose_orders').select('*').order('id', { ascending: false })
      if (legacyError) throw legacyError

      normalizedSubmissions = ((legacyOrders ?? []) as LegacyRoseOrder[]).map((order) => ({
        id: order.id + 10000,
        project_id: project.id,
        project_slug: project.slug,
        buyer_firstname: order.buyer_firstname,
        buyer_lastname: order.buyer_lastname,
        buyer_class: order.buyer_class,
        receiver_firstname: order.receiver_firstname,
        receiver_lastname: order.receiver_lastname,
        receiver_class: order.receiver_class,
        selected_options: { color: `Rose ${order.color}` },
        quantity: order.quantity,
        is_anonymous: order.is_anonymous,
        message: order.message,
        total_price: Number(order.total_price),
        is_paid: order.is_paid,
        is_delivered: order.is_delivered,
        created_at: order.created_at,
      }))
    }

    return NextResponse.json({ project, submissions: normalizedSubmissions })
  } catch (error) {
    console.error('Lecture des réservations impossible :', error)
    return NextResponse.json({ error: 'Impossible de charger les réservations.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) {
    return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  }

  try {
    const body = await request.json() as { id?: unknown; legacy?: unknown; is_paid?: unknown; is_delivered?: unknown }
    const submissionId = Number(body.id)
    if (!Number.isSafeInteger(submissionId) || submissionId < 1) {
      return NextResponse.json({ error: 'Réservation invalide.' }, { status: 400 })
    }

    const changes: { is_paid?: boolean; is_delivered?: boolean } = {}
    if (typeof body.is_paid === 'boolean') changes.is_paid = body.is_paid
    if (typeof body.is_delivered === 'boolean') changes.is_delivered = body.is_delivered
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'Aucune modification valide.' }, { status: 400 })
    }

    const table = body.legacy === true ? 'rose_orders' : 'project_submissions'
    const targetId = body.legacy === true ? submissionId - 10000 : submissionId
    if (targetId < 1) {
      return NextResponse.json({ error: 'Réservation invalide.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from(table).update(changes).eq('id', targetId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mise à jour de réservation impossible :', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour la réservation.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  if (!Number.isSafeInteger(Number(id)) || Number(id) < 1) {
    return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const submissionId = Number(url.searchParams.get('id'))
  const legacy = url.searchParams.get('legacy') === 'true'
  const targetId = legacy ? submissionId - 10000 : submissionId
  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    return NextResponse.json({ error: 'Réservation invalide.' }, { status: 400 })
  }

  try {
    const table = legacy ? 'rose_orders' : 'project_submissions'
    const { error } = await getSupabaseAdmin().from(table).delete().eq('id', targetId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suppression de réservation impossible :', error)
    return NextResponse.json({ error: 'Impossible de supprimer la réservation.' }, { status: 500 })
  }
}
