import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const { data, error } = await getSupabaseAdmin().from('rose_orders').select('*').order('id', { ascending: false })
    if (error) throw error
    return NextResponse.json({ orders: data ?? [] })
  } catch (error) {
    console.error('Lecture des commandes de roses impossible :', error)
    return NextResponse.json({ error: 'Impossible de charger les commandes.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const body = await request.json() as { id?: unknown; is_paid?: unknown; is_delivered?: unknown }
    const id = Number(body.id)
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Commande invalide.' }, { status: 400 })
    }

    const changes: { is_paid?: boolean; is_delivered?: boolean } = {}
    if (typeof body.is_paid === 'boolean') changes.is_paid = body.is_paid
    if (typeof body.is_delivered === 'boolean') changes.is_delivered = body.is_delivered
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'Aucune modification valide.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from('rose_orders').update(changes).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mise à jour des roses impossible :', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour la commande.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const id = Number(new URL(request.url).searchParams.get('id'))
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Commande invalide.' }, { status: 400 })
  }

  try {
    const { error } = await getSupabaseAdmin().from('rose_orders').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suppression des roses impossible :', error)
    return NextResponse.json({ error: 'Impossible de supprimer la commande.' }, { status: 500 })
  }
}
