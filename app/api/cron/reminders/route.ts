import { NextResponse } from 'next/server'
import {
  COUNTER_PAYMENT_DEADLINE,
  ONLINE_PAYMENT_DEADLINE,
} from '@/lib/config'
import { sendOrderExpiredEmail, sendReminderEmail } from '@/lib/email'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Calcul du jour calendaire au format YYYY-MM-DD en heure de Paris
 */
function getParisDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
}

/**
 * Calcul de la différence en jours pleins jusqu'à la date cible
 */
function getDaysUntil(targetDateIso: string, now: Date): number {
  const diffMs = new Date(targetDateIso).getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
  try {
    // 1. Vérification du secret d'autorisation CRON
    const authHeader = request.headers.get('authorization')
    const url = new URL(request.url)
    const querySecret = url.searchParams.get('secret')

    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret) {
      const isBearerMatch = authHeader === `Bearer ${expectedSecret}`
      const isQueryMatch = querySecret === expectedSecret
      if (!isBearerMatch && !isQueryMatch) {
        return NextResponse.json({ error: 'Accès non autorisé au cron.' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Cron] CRON_SECRET non configuré en production.')
      return NextResponse.json({ error: 'CRON_SECRET non configuré.' }, { status: 500 })
    }

    const now = new Date()
    const todayParis = getParisDateKey(now)
    const supabase = getSupabaseAdmin()

    // 2. Récupération de toutes les commandes en attente
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('roses_orders')
      .select('*')
      .eq('payment_status', 'pending')

    if (fetchError || !pendingOrders) {
      console.error('[Cron] Erreur lecture commandes pending :', fetchError)
      return NextResponse.json({ error: 'Échec lecture base de données.' }, { status: 500 })
    }

    const onlineDeadline = new Date(ONLINE_PAYMENT_DEADLINE)
    const isPastOnlineDeadline = now > onlineDeadline

    let sentCount = 0
    let expiredCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const order of pendingOrders) {
      // Si la vente en ligne est définitivement terminée, on passe les commandes non réglées en 'expired'
      if (isPastOnlineDeadline) {
        await supabase
          .from('roses_orders')
          .update({ payment_status: 'expired' })
          .eq('id', order.id)

        await sendOrderExpiredEmail({
          id: order.id,
          sender_name: order.sender_name,
          sender_email: order.sender_email,
          recipient_name: order.recipient_name,
          recipient_class: order.recipient_class,
          red_roses_count: order.red_roses_count,
          pink_roses_count: order.pink_roses_count,
          has_message: order.has_message,
          total_amount: Number(order.total_amount),
          payment_method: order.payment_method,
          payment_status: 'expired',
          unsubscribe_token: order.unsubscribe_token,
        }).catch((err) => errors.push(`Order ${order.id} expired email failed: ${err}`))

        expiredCount++
        continue
      }

      // Si l'utilisateur a demandé à ne plus être relancé
      if (order.reminders_opt_out) {
        skippedCount++
        continue
      }

      // Vérification : maximum 1 relance par jour calendaire (Europe/Paris)
      if (order.last_reminder_at) {
        const lastReminderParis = getParisDateKey(new Date(order.last_reminder_at))
        if (lastReminderParis === todayParis) {
          skippedCount++
          continue
        }
      }

      // Détermination de la date limite en fonction du mode de paiement
      // Si commande comptoir et qu'on a dépassé la fermeture du comptoir (22/01),
      // on bascule le calcul vers la deadline en ligne du 24/01
      const isCounter = order.payment_method === 'mdle_counter'
      const counterDeadline = new Date(COUNTER_PAYMENT_DEADLINE)
      const targetDeadline = (isCounter && now <= counterDeadline) ? COUNTER_PAYMENT_DEADLINE : ONLINE_PAYMENT_DEADLINE

      const daysUntil = getDaysUntil(targetDeadline, now)
      const isLastDay = daysUntil <= 0

      // Paliers de relances officielles : 14, 10, 7, 5, 3, 2, 1 jours et jour J
      const eligibleOffsets = [14, 10, 7, 5, 3, 2, 1, 0]
      const isEligibleDay = eligibleOffsets.includes(Math.max(0, daysUntil))

      if (!isEligibleDay && daysUntil > 0) {
        skippedCount++
        continue
      }

      // Envoi de la relance
      const success = await sendReminderEmail(
        {
          id: order.id,
          sender_name: order.sender_name,
          sender_email: order.sender_email,
          recipient_name: order.recipient_name,
          recipient_class: order.recipient_class,
          red_roses_count: order.red_roses_count,
          pink_roses_count: order.pink_roses_count,
          has_message: order.has_message,
          total_amount: Number(order.total_amount),
          payment_method: order.payment_method,
          payment_status: 'pending',
          unsubscribe_token: order.unsubscribe_token,
        },
        Math.max(0, daysUntil),
        isLastDay
      )

      if (success) {
        await supabase
          .from('roses_orders')
          .update({
            reminders_count: (order.reminders_count || 0) + 1,
            last_reminder_at: now.toISOString(),
          })
          .eq('id', order.id)

        sentCount++
      } else {
        errors.push(`Order ${order.id} reminder send failed.`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processed: pendingOrders.length,
      reminders_sent: sentCount,
      expired_count: expiredCount,
      skipped_count: skippedCount,
      errors,
    })
  } catch (error) {
    console.error('[Cron] Exception :', error)
    return NextResponse.json({ error: 'Erreur exécution cron.' }, { status: 500 })
  }
}
