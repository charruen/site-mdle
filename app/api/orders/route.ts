import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type OrderRequestBody = {
  recipient_name?: string
  recipient_class?: string
  red_roses_count?: number
  pink_roses_count?: number
  has_message?: boolean
  message_text?: string | null
  is_anonymous?: boolean
  sender_name?: string | null
  payment_method?: 'sumup_online' | 'mdle_counter'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderRequestBody

    // Assainissement strict des entrées texte
    const recipient_name = (body.recipient_name || '').trim().slice(0, 100)
    const recipient_class = (body.recipient_class || '').trim().slice(0, 50)
    const red_roses_count = Math.max(0, parseInt(String(body.red_roses_count || 0), 10) || 0)
    const pink_roses_count = Math.max(0, parseInt(String(body.pink_roses_count || 0), 10) || 0)
    const totalRoses = red_roses_count + pink_roses_count

    if (!recipient_name) {
      return NextResponse.json(
        { error: 'Le prénom et nom du destinataire sont obligatoires.' },
        { status: 400 }
      )
    }
    if (!recipient_class) {
      return NextResponse.json(
        { error: 'La classe ou la salle du destinataire est obligatoire.' },
        { status: 400 }
      )
    }
    if (totalRoses < 1) {
      return NextResponse.json(
        { error: 'Vous devez commander au moins une rose (rouge ou rose).' },
        { status: 400 }
      )
    }
    if (totalRoses > 50) {
      return NextResponse.json(
        { error: 'Le volume maximal autorisé est de 50 roses par commande.' },
        { status: 400 }
      )
    }

    const has_message = Boolean(body.has_message)
    const rawMessage = (body.message_text || '').trim()
    const message_text = has_message ? rawMessage.slice(0, 200) || null : null

    const is_anonymous = Boolean(body.is_anonymous)
    const rawSender = (body.sender_name || '').trim().slice(0, 100)
    const sender_name = is_anonymous ? null : (rawSender || null)

    const payment_method = body.payment_method === 'sumup_online' ? 'sumup_online' : 'mdle_counter'

    // Calcul garanti et déterministe côté serveur : 2,00 € / rose + (0,50 € si mot doux)
    const total_amount = Number(((totalRoses * 2.00) + (has_message ? 0.50 : 0)).toFixed(2))

    const supabase = getSupabaseAdmin()

    // Enregistrement initial dans Supabase (roses_orders)
    const { data: order, error: insertError } = await supabase
      .from('roses_orders')
      .insert({
        recipient_name,
        recipient_class,
        red_roses_count,
        pink_roses_count,
        has_message,
        message_text,
        is_anonymous,
        sender_name,
        total_amount,
        payment_method,
        payment_status: 'pending',
      })
      .select('*')
      .single()

    if (insertError || !order) {
      console.error('Erreur Supabase insertion commande :', insertError)
      return NextResponse.json(
        { error: 'Impossible d’enregistrer la commande dans la base de données. Réessayez plus tard.' },
        { status: 500 }
      )
    }

    let sumupCheckoutId: string | null = null

    // Intégration SumUp Checkout API (100% Carte Bancaire, sans Apple Pay / Google Pay)
    if (payment_method === 'sumup_online') {
      const apiKey = process.env.SUMUP_API_KEY
      const merchantCode = process.env.SUMUP_MERCHANT_CODE

      if (apiKey && merchantCode) {
        try {
          const sumupResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              checkout_reference: order.id,
              amount: total_amount,
              currency: 'EUR',
              merchant_code: merchantCode,
              description: `Roses St-Valentin MDLE (${totalRoses} roses - ${recipient_name})`,
              payment_type: 'card', // Carte Bancaire uniquement
            }),
          })

          if (sumupResponse.ok) {
            const sumupData = (await sumupResponse.json()) as { id?: string }
            if (sumupData?.id) {
              sumupCheckoutId = sumupData.id
              await supabase
                .from('roses_orders')
                .update({ sumup_checkout_id: sumupCheckoutId })
                .eq('id', order.id)
            }
          } else {
            const errBody = await sumupResponse.text()
            console.warn('SumUp API Checkout création non-OK :', errBody)
          }
        } catch (sumupErr) {
          console.error('Erreur de communication avec l’API SumUp :', sumupErr)
        }
      }

      // Mode dégradé / sandbox : si les clés SumUp ne sont pas configurées en local
      if (!sumupCheckoutId) {
        sumupCheckoutId = `chk_sim_${order.id}`
      }
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          ...order,
          sumup_checkout_id: sumupCheckoutId,
        },
        checkout_id: sumupCheckoutId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur traitement commande API /orders :', error)
    return NextResponse.json(
      { error: 'Données de formulaire invalides ou erreur interne du serveur.' },
      { status: 400 }
    )
  }
}
