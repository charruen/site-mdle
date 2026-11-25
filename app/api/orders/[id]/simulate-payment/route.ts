import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isTestModeEnabled } from '@/lib/settings'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de simulation de paiement SumUp réussi en mode test
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const testMode = await isTestModeEnabled()
    const isAdmin = await isAdminAuthenticated()

    if (!testMode && !isAdmin) {
      return NextResponse.json(
        { error: 'La simulation de paiement est réservée au mode testeur.' },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: order, error } = await supabase
      .from('roses_orders')
      .update({ payment_status: 'paid' })
      .eq('id', id)
      .select('id, payment_status, total_amount')
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Commande introuvable.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Paiement simulé validé avec succès (Mode Testeur).',
      order,
    })
  } catch (err) {
    console.error('Erreur simulation paiement :', err)
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 })
  }
}
