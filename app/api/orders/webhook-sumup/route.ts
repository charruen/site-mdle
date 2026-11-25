import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Webhook SumUp officiel pour la confirmation des paiements par carte bancaire.
 *
 * Règles strictes :
 * 1. Retrouve la commande EXCLUSIVEMENT via `sumup_checkout_id`.
 * 2. Toujours re-vérifier le statut auprès de l'API SumUp avec le checkout_id.
 * 3. Aucun mode test qui valide sans clé en production.
 * 4. Mise à jour idempotente de payment_status à 'paid'.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      id?: string
      checkout_id?: string
      event_type?: string
    }

    const sumupCheckoutId = payload.id || payload.checkout_id

    if (!sumupCheckoutId) {
      return NextResponse.json(
        { error: 'Identifiant sumup_checkout_id manquant dans le payload.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.SUMUP_API_KEY
    if (!apiKey) {
      console.error('[SumUp Webhook] SUMUP_API_KEY absente du serveur.')
      return NextResponse.json(
        { error: 'Clé SumUp non configurée sur le serveur.' },
        { status: 500 }
      )
    }

    // 1. Appel direct et obligatoire à l'API SumUp pour authentifier et certifier le statut
    const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${sumupCheckoutId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!verifyRes.ok) {
      const errText = await verifyRes.text()
      console.error(`[SumUp Webhook] Vérification impossible pour checkout ${sumupCheckoutId} :`, errText)
      return NextResponse.json(
        { error: 'Échec de vérification auprès de l’API officielle SumUp.' },
        { status: 502 }
      )
    }

    const checkoutData = (await verifyRes.json()) as { status?: string }
    const actualStatus = (checkoutData.status || '').toUpperCase()

    const isPaid = actualStatus === 'PAID' || actualStatus === 'SUCCESSFUL' || actualStatus === 'COMPLETED'

    if (!isPaid) {
      console.log(`[SumUp Webhook] Statut non payé pour checkout ${sumupCheckoutId} : ${actualStatus}`)
      return NextResponse.json({
        received: true,
        verified: true,
        updated: false,
        status: actualStatus,
      })
    }

    // 2. Recherche et mise à jour de la commande par sumup_checkout_id uniquement
    const supabase = getSupabaseAdmin()
    const { data: updatedOrder, error: updateError } = await supabase
      .from('roses_orders')
      .update({ payment_status: 'paid' })
      .eq('sumup_checkout_id', sumupCheckoutId)
      .select('id, payment_status, total_amount')
      .single()

    if (updateError || !updatedOrder) {
      console.error(`[SumUp Webhook] Commande introuvable pour checkout ${sumupCheckoutId} :`, updateError)
      return NextResponse.json(
        { error: 'Commande introuvable dans la base de données.' },
        { status: 404 }
      )
    }

    console.log(`[SumUp Webhook] Commande #${updatedOrder.id} validée comme 'paid' avec succès.`)
    return NextResponse.json({
      received: true,
      verified: true,
      updated: true,
      order_id: updatedOrder.id,
    })
  } catch (error) {
    console.error('[SumUp Webhook] Exception lors du traitement :', error)
    return NextResponse.json({ error: 'Erreur lors du traitement du webhook.' }, { status: 400 })
  }
}
