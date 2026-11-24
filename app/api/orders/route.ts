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

    const recipient_name = (body.recipient_name || '').trim()
    const recipient_class = (body.recipient_class || '').trim()
    const red_roses_count = Math.max(0, parseInt(String(body.red_roses_count || 0), 10) || 0)
    const pink_roses_count = Math.max(0, parseInt(String(body.pink_roses_count || 0), 10) || 0)
    const totalRoses = red_roses_count + pink_roses_count

    if (!recipient_name) {
      return NextResponse.json({ error: 'Le nom du destinataire est requis.' }, { status: 400 })
    }
    if (!recipient_class) {
      return NextResponse.json({ error: 'La classe ou salle du destinataire est requise.' }, { status: 400 })
    }
    if (totalRoses < 1) {
      return NextResponse.json({ error: 'Vous devez commander au moins une rose.' }, { status: 400 })
    }
    if (totalRoses > 50) {
      return NextResponse.json({ error: 'Le nombre maximal de roses par commande est de 50.' }, { status: 400 })
    }

    const has_message = Boolean(body.has_message)
    const rawMessage = (body.message_text || '').trim()
    const message_text = has_message ? rawMessage.slice(0, 200) : null
    const is_anonymous = Boolean(body.is_anonymous)
    const rawSender = (body.sender_name || '').trim()
    const sender_name = is_anonymous ? null : (rawSender || null)

    const payment_method = body.payment_method === 'sumup_online' ? 'sumup_online' : 'mdle_counter'

    // Calcul garanti côté serveur : 2,00 € / rose + 0,50 € / mot doux
    const total_amount = Number(((totalRoses * 2.00) + (has_message ? 0.50 : 0)).toFixed(2))

    const supabase = getSupabaseAdmin()

    // Enregistrement dans la table roses_orders
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
      console.error('Erreur insertion commande roses :', insertError)
      return NextResponse.json({ error: 'Impossible d’enregistrer la commande.' }, { status: 500 })
    }

    let sumupCheckoutId: string | null = null

    // Intégration SumUp Checkout API si paiement en ligne choisi
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
            console.warn('Réponse non-OK de SumUp Checkout API :', errBody)
          }
        } catch (sumupErr) {
          console.error('Erreur lors de la création du Checkout SumUp :', sumupErr)
        }
      }

      // Si SumUp n'a pas retourné d'id (ex. clés non définies ou environnement test), on fournit un id de simulation cohérent
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
    console.error('Erreur traitement commande :', error)
    return NextResponse.json({ error: 'Données invalides ou erreur serveur.' }, { status: 400 })
  }
}
