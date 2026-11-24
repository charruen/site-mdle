import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Session non autorisée.' }, { status: 401 })
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
    const body = (await request.json()) as {
      id?: string
      payment_status?: string
    }

    const id = (body.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Identifiant de commande manquant.' }, { status: 400 })
    }

    const payment_status = body.payment_status === 'paid' ? 'paid' : 'pending'

    const { error } = await getSupabaseAdmin()
      .from('roses_orders')
      .update({ payment_status })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true, payment_status })
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
