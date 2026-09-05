import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { firstname?: unknown; lastname?: unknown; class?: unknown; paymentMethod?: unknown; paymentName?: unknown }
    const firstname = cleanText(body.firstname, 80)
    const lastname = cleanText(body.lastname, 80)
    const studentClass = cleanText(body.class, 40)
    const paymentMethod = body.paymentMethod === 'CARTE' ? 'CARTE' : 'ESPECES'
    const paymentName = body.paymentMethod === 'CARTE' ? cleanText(body.paymentName, 100) : null

    if (!firstname || !lastname || !studentClass) {
      return NextResponse.json({ error: 'Prénom, nom et classe sont obligatoires.' }, { status: 400 })
    }

    if (paymentMethod === 'CARTE' && !paymentName) {
      return NextResponse.json({ error: 'Le nom sur la carte est requis pour un paiement par carte.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from('adherents').insert({
      firstname,
      lastname,
      class: studentClass,
      payment_method: paymentMethod,
      payment_name: paymentName,
    })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Enregistrement de l’adhésion impossible :', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer l’adhésion. Réessaie dans quelques instants.' }, { status: 500 })
  }
}
