import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Session non autorisée ou expirée.' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const unauthorized = await checkAdmin()
  if (unauthorized) return unauthorized

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('roses_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ orders: data ?? [] })
  } catch (error) {
    console.error('Lecture des commandes de roses impossible :', error)
    return NextResponse.json({ error: 'Impossible de charger les commandes.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await checkAdmin()
  if (unauthorized) return unauthorized

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string
      payment_status?: string
      delivered?: boolean
      recipient_name?: string
      recipient_class?: string
      message_text?: string | null
      reminders_opt_out?: boolean
    }

    const id = (body.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Identifiant de commande manquant.' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}

    // Statut de paiement
    if (body.payment_status !== undefined) {
      if (['paid', 'pending', 'expired'].includes(body.payment_status)) {
        updates.payment_status = body.payment_status
      }
    }

    // Statut de livraison en classe
    if (body.delivered !== undefined) {
      updates.delivered = Boolean(body.delivered)
      updates.delivered_at = body.delivered ? new Date().toISOString() : null
    }

    // Modification d'informations par l'admin
    if (body.recipient_name !== undefined) {
      const trimmed = body.recipient_name.trim().slice(0, 100)
      if (trimmed) updates.recipient_name = trimmed
    }

    if (body.recipient_class !== undefined) {
      const trimmed = body.recipient_class.trim().slice(0, 50)
      if (trimmed) updates.recipient_class = trimmed
    }

    if (body.message_text !== undefined) {
      const trimmed = (body.message_text || '').trim().slice(0, 200)
      updates.message_text = trimmed || null
      updates.has_message = Boolean(trimmed)
    }

    if (body.reminders_opt_out !== undefined) {
      updates.reminders_opt_out = Boolean(body.reminders_opt_out)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Aucune modification spécifiée.' }, { status: 400 })
    }

    const { data: updatedOrder, error } = await getSupabaseAdmin()
      .from('roses_orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Mise à jour commande impossible :', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour la commande.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await checkAdmin()
  if (unauthorized) return unauthorized

  try {
    const url = new URL(request.url)
    let id = url.searchParams.get('id')

    if (!id) {
      const body = (await request.json().catch(() => ({}))) as { id?: string }
      id = body.id || null
    }

    if (!id) {
      return NextResponse.json({ error: 'Identifiant de commande requis.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin()
      .from('roses_orders')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suppression de commande impossible :', error)
    return NextResponse.json({ error: 'Impossible de supprimer la commande.' }, { status: 500 })
  }
}
