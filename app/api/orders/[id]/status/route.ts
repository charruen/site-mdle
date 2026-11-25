import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Endpoint public sécurisé pour vérifier le statut d'une commande
 * Retourne uniquement le statut de paiement sans exposer de données personnelles
 * (ni nom du destinataire, ni mot doux, ni identité de l'expéditeur).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
    }

    const { data: order, error } = await getSupabaseAdmin()
      .from('roses_orders')
      .select('id, payment_status, payment_method, total_amount, created_at')
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
    }

    return NextResponse.json({
      id: order.id,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total_amount: order.total_amount,
      created_at: order.created_at,
      is_paid: order.payment_status === 'paid',
    })
  } catch (error) {
    console.error('Erreur GET /api/orders/[id]/status :', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
