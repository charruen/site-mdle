import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { firstname?: unknown; lastname?: unknown; class?: unknown }
    const firstname = cleanText(body.firstname, 80)
    const lastname = cleanText(body.lastname, 80)
    const studentClass = cleanText(body.class, 40)

    if (!firstname || !lastname || !studentClass) {
      return NextResponse.json({ error: 'Prénom, nom et classe sont obligatoires.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from('adherents').insert({
      firstname,
      lastname,
      class: studentClass,
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
