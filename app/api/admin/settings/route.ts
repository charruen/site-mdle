import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabaseAdmin()

  let { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) {
    const defaultSettings = {
      id: 1,
      marquee_text: '⚠️ Bienvenue sur le site de la MDLE !',
      marquee_active: false,
      promo_text: '',
      promo_active: false,
      opening_hours: [
        { day: 'Lundi', hours: '9h - 16h' },
        { day: 'Mardi', hours: '9h - 16h' },
        { day: 'Mercredi', hours: '9h - 13h' },
        { day: 'Jeudi', hours: '9h - 16h' },
        { day: 'Vendredi', hours: '9h - 13h' },
      ],
      bureau_members: [
        { role: 'Président', name: 'Thomas', emoji: '👑' },
        { role: 'Vice-Présidente 1', name: 'Mari', emoji: '⚡' },
        { role: 'Vice-Présidente 2', name: 'Lisa', emoji: '⚡' },
        { role: 'Trésorier', name: 'Nathan', emoji: '💰' },
      ],
      updated_at: new Date().toISOString(),
    }

    // Auto-enregistrement dans Supabase pour que la base contienne immédiatement la ligne
    try {
      const { data: createdData } = await supabase
        .from('site_settings')
        .upsert(defaultSettings)
        .select()
        .single()

      if (createdData) return NextResponse.json(createdData)
    } catch {
      /* fallback si la table n'a pas encore été créée dans Supabase */
    }

    return NextResponse.json(defaultSettings)
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('site_settings')
      .upsert({ id: 1, ...body, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
