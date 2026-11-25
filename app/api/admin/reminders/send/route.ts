import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import {
  COUNTER_PAYMENT_DEADLINE,
  ONLINE_PAYMENT_DEADLINE,
} from '@/lib/config'
import { sendReminderEmail } from '@/lib/email'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function getDaysUntil(targetDateIso: string, now: Date): number {
  const diffMs = new Date(targetDateIso).getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Envoi manuel immédiat d'une relance par l'administrateur
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Session non autorisée.' }, { status: 401 })
  }

  try {
    const { id } = (await request.json().catch(() => ({}))) as { id?: string }

    if (!id) {
      return NextResponse.json({ error: 'Identifiant de commande requis.' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: order, error } = await supabase
      .from('roses_orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Cette commande est déjà réglée.' }, { status: 400 })
    }

    const now = new Date()
    const isCounter = order.payment_method === 'mdle_counter'
    const counterDeadline = new Date(COUNTER_PAYMENT_DEADLINE)
    const targetDeadline = (isCounter && now <= counterDeadline) ? COUNTER_PAYMENT_DEADLINE : ONLINE_PAYMENT_DEADLINE

    const daysUntil = getDaysUntil(targetDeadline, now)
    const isLastDay = daysUntil <= 0

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
        payment_status: order.payment_status,
        unsubscribe_token: order.unsubscribe_token,
      },
      Math.max(0, daysUntil),
      isLastDay
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Échec d’envoi de l’e-mail via Gmail. Vérifiez GMAIL_USER et GMAIL_APP_PASSWORD.' },
        { status: 502 }
      )
    }

    await supabase
      .from('roses_orders')
      .update({
        reminders_count: (order.reminders_count || 0) + 1,
        last_reminder_at: now.toISOString(),
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      message: `Relance envoyée avec succès à ${order.sender_email}.`,
      reminders_count: (order.reminders_count || 0) + 1,
      last_reminder_at: now.toISOString(),
    })
  } catch (err) {
    console.error('Erreur relance manuelle :', err)
    return NextResponse.json({ error: 'Erreur lors de l’envoi de la relance.' }, { status: 500 })
  }
}
