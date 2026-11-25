import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import {
  COUNTER_PAYMENT_DEADLINE,
  ONLINE_PAYMENT_DEADLINE,
} from '@/lib/config'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function getParisDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
}

function getDaysUntil(targetDateIso: string, now: Date): number {
  const diffMs = new Date(targetDateIso).getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Prévisualisation (dry-run) de la tâche de relance pour l'administration
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Session non autorisée.' }, { status: 401 })
  }

  try {
    const now = new Date()
    const todayParis = getParisDateKey(now)
    const onlineDeadline = new Date(ONLINE_PAYMENT_DEADLINE)
    const isPastOnlineDeadline = now > onlineDeadline

    const supabase = getSupabaseAdmin()
    const { data: pendingOrders, error } = await supabase
      .from('roses_orders')
      .select('*')
      .eq('payment_status', 'pending')

    if (error || !pendingOrders) {
      return NextResponse.json({ error: 'Impossible de lire les commandes.' }, { status: 500 })
    }

    const wouldRemind: unknown[] = []
    const wouldExpire: unknown[] = []
    const wouldSkip: unknown[] = []

    for (const order of pendingOrders) {
      if (isPastOnlineDeadline) {
        wouldExpire.push({
          id: order.id,
          recipient_name: order.recipient_name,
          sender_name: order.sender_name,
          sender_email: order.sender_email,
          total_amount: order.total_amount,
          reason: 'Vente en ligne terminée',
        })
        continue
      }

      if (order.reminders_opt_out) {
        wouldSkip.push({
          id: order.id,
          recipient_name: order.recipient_name,
          reason: 'Opt-out (désinscrit)',
        })
        continue
      }

      if (order.last_reminder_at) {
        const lastParis = getParisDateKey(new Date(order.last_reminder_at))
        if (lastParis === todayParis) {
          wouldSkip.push({
            id: order.id,
            recipient_name: order.recipient_name,
            reason: 'Déjà relancé aujourd’hui',
          })
          continue
        }
      }

      const isCounter = order.payment_method === 'mdle_counter'
      const counterDeadline = new Date(COUNTER_PAYMENT_DEADLINE)
      const targetDeadline = (isCounter && now <= counterDeadline) ? COUNTER_PAYMENT_DEADLINE : ONLINE_PAYMENT_DEADLINE

      const daysUntil = getDaysUntil(targetDeadline, now)
      const isLastDay = daysUntil <= 0
      const eligibleOffsets = [14, 10, 7, 5, 3, 2, 1, 0]
      const isEligibleDay = eligibleOffsets.includes(Math.max(0, daysUntil))

      if (!isEligibleDay && daysUntil > 0) {
        wouldSkip.push({
          id: order.id,
          recipient_name: order.recipient_name,
          reason: `Jour non éligible (${daysUntil}j restants)`,
        })
        continue
      }

      wouldRemind.push({
        id: order.id,
        recipient_name: order.recipient_name,
        sender_name: order.sender_name,
        sender_email: order.sender_email,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        days_until: daysUntil,
        is_last_day: isLastDay,
        reminders_count: order.reminders_count || 0,
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      total_pending: pendingOrders.length,
      would_remind_count: wouldRemind.length,
      would_expire_count: wouldExpire.length,
      would_skip_count: wouldSkip.length,
      would_remind: wouldRemind,
      would_expire: wouldExpire,
      would_skip: wouldSkip,
    })
  } catch (err) {
    console.error('Erreur dry-run :', err)
    return NextResponse.json({ error: 'Erreur lors de la simulation.' }, { status: 500 })
  }
}
