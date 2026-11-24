import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Webhook SumUp pour la confirmation automatique des paiements par carte bancaire.
 * - Réception du payload webhook SumUp
 * - Vérification du statut réel de la transaction auprès de l'API SumUp (évite les faux webhooks)
 * - Mise à jour idempotente de payment_status à 'paid' dans Supabase
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      id?: string
      event_type?: string
      status?: string
      checkout_reference?: string
    }

    const sumupCheckoutId = payload.id
    const checkoutReference = payload.checkout_reference

    if (!sumupCheckoutId && !checkoutReference) {
      return NextResponse.json({ error: 'Payload SumUp incomplet.' }, { status: 400 })
    }

    const apiKey = process.env.SUMUP_API_KEY
    let isPaymentVerified = false

    // 1. Vérification sécurisée du statut réel auprès de l'API SumUp si la clé API est présente
    if (apiKey && sumupCheckoutId) {
      try {
        const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${sumupCheckoutId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (verifyRes.ok) {
          const verifyData = (await verifyRes.json()) as { status?: string }
          const status = (verifyData.status || '').toUpperCase()
          isPaymentVerified = status === 'PAID' || status === 'SUCCESSFUL' || status === 'COMPLETED'
        } else {
          console.warn('Impossible de vérifier le checkout auprès de l’API SumUp :', await verifyRes.text())
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du checkout SumUp :', err)
      }
    } else {
      // Mode local / test si pas de clé SumUp configurée
      const status = (payload.status || '').toUpperCase()
      isPaymentVerified = status === 'PAID' || status === 'SUCCESSFUL' || status === 'COMPLETED' || payload.event_type === 'CHECKOUT_STATUS_CHANGED'
    }

    // 2. Mise à jour idempotente en base de données si le paiement est confirmé
    if (isPaymentVerified) {
      const supabase = getSupabaseAdmin()

      let query = supabase.from('roses_orders').update({ payment_status: 'paid' })

      if (sumupCheckoutId) {
        query = query.eq('sumup_checkout_id', sumupCheckoutId)
      } else if (checkoutReference) {
        query = query.eq('id', checkoutReference)
      }

      const { error } = await query

      if (error) {
        console.error('Erreur mise à jour paiement Supabase :', error)
        return NextResponse.json({ error: 'Échec de la mise à jour.' }, { status: 500 })
      }

      return NextResponse.json({ received: true, verified: true, updated: true })
    }

    // Si le statut n'est pas (encore) payé (ex: PENDING, FAILED)
    return NextResponse.json({ received: true, verified: isPaymentVerified, updated: false })
  } catch (error) {
    console.error('Erreur réception webhook SumUp :', error)
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}
