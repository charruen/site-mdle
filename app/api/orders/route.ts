import { NextResponse } from 'next/server'
import {
  COUNTER_CLOSING_LABEL,
  MAX_ROSES,
  PRICE_MOT_DOUX,
  PRICE_PER_ROSE,
  isCounterOpen,
  isSalesOpen,
} from '@/lib/config'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { isTestModeEnabled } from '@/lib/settings'
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
  sender_name?: string
  sender_email?: string
  payment_method?: 'sumup_online' | 'mdle_counter'
  // Champ honeypot invisible anti-spam
  website?: string
  fax?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)

    // 1. Limitation de débit anti-abus (20 commandes par 15 minutes par IP)
    const rateLimit = checkRateLimit('orders_submission', clientIp, 20, 15 * 60 * 1000)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Trop de commandes passées depuis cette connexion. Veuillez patienter quelques minutes.' },
        { status: 429 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as OrderRequestBody

    // 2. Détection du piège honeypot anti-bots
    if (body.website || body.fax) {
      console.warn(`[Anti-Spam] Honeypot déclenché par IP ${clientIp}`)
      return NextResponse.json({ error: 'Validation impossible.' }, { status: 400 })
    }

    // 3. Vérification du mode testeur ou de la fenêtre de vente officielle
    const isTestMode = await isTestModeEnabled()

    if (!isSalesOpen() && !isTestMode) {
      return NextResponse.json(
        { error: 'La période de commande des roses pour la Saint-Valentin 2027 est actuellement fermée.' },
        { status: 403 }
      )
    }

    const payment_method = body.payment_method === 'sumup_online' ? 'sumup_online' : 'mdle_counter'

    // 4. Vérification de la fermeture du comptoir MDLE pour les espèces
    if (payment_method === 'mdle_counter' && !isCounterOpen() && !isTestMode) {
      return NextResponse.json(
        {
          error: `Le règlement au Foyer MDLE est clôturé depuis le ${COUNTER_CLOSING_LABEL}. Veuillez choisir le règlement sécurisé par Carte Bancaire en ligne.`,
        },
        { status: 403 }
      )
    }

    // 5. Validation et assainissement des entrées
    const recipient_name = (body.recipient_name || '').trim().slice(0, 100)
    const recipient_class = (body.recipient_class || '').trim().slice(0, 50)
    const sender_name = (body.sender_name || '').trim().slice(0, 100)
    const sender_email = (body.sender_email || '').trim().toLowerCase().slice(0, 150)

    if (!recipient_name) {
      return NextResponse.json({ error: 'Le prénom et nom du destinataire sont obligatoires.' }, { status: 400 })
    }

    if (!recipient_class) {
      return NextResponse.json({ error: 'La classe du destinataire est obligatoire.' }, { status: 400 })
    }

    if (!sender_name) {
      return NextResponse.json({ error: 'Ton prénom et nom sont obligatoires.' }, { status: 400 })
    }

    if (!sender_email || !EMAIL_REGEX.test(sender_email)) {
      return NextResponse.json(
        { error: 'Une adresse e-mail valide est obligatoire pour recevoir ton reçu et la confirmation.' },
        { status: 400 }
      )
    }

    // Quantités de roses
    const red_roses_count = Math.max(0, parseInt(String(body.red_roses_count || 0), 10) || 0)
    const pink_roses_count = Math.max(0, parseInt(String(body.pink_roses_count || 0), 10) || 0)
    const totalRoses = red_roses_count + pink_roses_count

    if (totalRoses < 1) {
      return NextResponse.json({ error: 'Vous devez choisir au moins une rose (rouge ou rose).' }, { status: 400 })
    }

    if (totalRoses > MAX_ROSES) {
      return NextResponse.json(
        { error: `Le volume maximal autorisé est de ${MAX_ROSES} roses par commande.` },
        { status: 400 }
      )
    }

    // Mot doux
    const has_message = Boolean(body.has_message)
    const rawMessage = (body.message_text || '').trim()
    const message_text = has_message ? rawMessage.slice(0, 200) || null : null

    // Anonymat : le destinataire ne verra pas le nom, MAIS la MDLE conserve TOUJOURS sender_name
    const is_anonymous = Boolean(body.is_anonymous)

    // 6. Calcul déterministe strict côté serveur
    const total_amount = Number(((totalRoses * PRICE_PER_ROSE) + (has_message ? PRICE_MOT_DOUX : 0)).toFixed(2))

    const supabase = getSupabaseAdmin()

    // 7. Enregistrement dans Supabase (roses_orders)
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
        sender_name, // Toujours stocké en base
        sender_email,
        total_amount,
        payment_method,
        payment_status: 'pending',
      })
      .select('*')
      .single()

    if (insertError || !order) {
      console.error('Erreur Supabase insertion commande :', insertError)
      return NextResponse.json(
        { error: 'Impossible d’enregistrer la commande dans la base de données. Réessayez dans un instant.' },
        { status: 500 }
      )
    }

    let sumupCheckoutId: string | null = null

    // 8. Intégration SumUp Checkout API (Carte Bancaire uniquement)
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
              description: `Roses St-Valentin 2027 MDLE (${totalRoses} roses)`,
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
            console.error('Erreur création checkout SumUp API :', errBody)
            if (process.env.NODE_ENV === 'production') {
              return NextResponse.json(
                { error: 'Échec de connexion avec la plateforme de paiement SumUp. Veuillez réessayer ou payer au Foyer.' },
                { status: 502 }
              )
            }
          }
        } catch (sumupErr) {
          console.error('Exception appel SumUp API :', sumupErr)
          if (process.env.NODE_ENV === 'production') {
            return NextResponse.json(
              { error: 'Service de paiement en ligne temporairement inaccessible.' },
              { status: 503 }
            )
          }
        }
      } else {
        if (process.env.NODE_ENV === 'production' && !isTestMode) {
          console.error('SUMUP_API_KEY ou SUMUP_MERCHANT_CODE manquant en production.')
          return NextResponse.json(
            { error: 'Configuration du paiement par carte incomplète sur le serveur.' },
            { status: 500 }
          )
        }
        console.warn('Mode dev ou testeur : clés SumUp non renseignées. Checkout simulé.')
        sumupCheckoutId = `test_chk_${order.id}`
        await supabase
          .from('roses_orders')
          .update({ sumup_checkout_id: sumupCheckoutId })
          .eq('id', order.id)
      }
    }

    // 9. Envoi de l'e-mail de confirmation en arrière-plan
    sendOrderConfirmationEmail({
      id: order.id,
      sender_name,
      sender_email,
      recipient_name,
      recipient_class,
      red_roses_count,
      pink_roses_count,
      has_message,
      total_amount,
      payment_method,
      payment_status: 'pending',
      unsubscribe_token: order.unsubscribe_token,
    }).catch((emailErr) => {
      console.error('Erreur non bloquante envoi e-mail confirmation :', emailErr)
    })

    return NextResponse.json(
      {
        success: true,
        order: {
          id: order.id,
          total_amount,
          payment_method,
          payment_status: 'pending',
          recipient_name,
          recipient_class,
          red_roses_count,
          pink_roses_count,
          has_message,
          created_at: order.created_at,
          sumup_checkout_id: sumupCheckoutId,
        },
        checkout_id: sumupCheckoutId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur POST /api/orders :', error)
    return NextResponse.json({ error: 'Requête invalide ou erreur interne.' }, { status: 400 })
  }
}
