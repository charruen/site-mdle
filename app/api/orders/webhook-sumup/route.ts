import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Webhook SumUp pour la confirmation automatique des paiements en ligne.
 * Reçoit les notifications d'état de paiement et met à jour payment_status à 'paid'.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      id?: string
      event_type?: string
      status?: string
      checkout_reference?: string
    }

    const checkoutReference = payload.checkout_reference
    const sumupCheckoutId = payload.id
    const status = (payload.status || '').toUpperCase()

    // Vérifie si le statut indique un paiement réussi
    const isPaid = status === 'PAID' || status === 'SUCCESSFUL' || status === 'COMPLETED' || payload.event_type === 'CHECKOUT_STATUS_CHANGED'

    if (isPaid && (checkoutReference || sumupCheckoutId)) {
      const supabase = getSupabaseAdmin()

      let query = supabase.from('roses_orders').update({ payment_status: 'paid' })

      if (checkoutReference) {
        query = query.eq('id', checkoutReference)
      } else if (sumupCheckoutId) {
        query = query.eq('sumup_checkout_id', sumupCheckoutId)
      }

      const { error } = await query

      if (error) {
        console.error('Erreur mise à jour webhook SumUp :', error)
        return NextResponse.json({ error: 'Mise à jour échouée.' }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erreur réception webhook SumUp :', error)
    return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 })
  }
}
