import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminAuthenticated } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    // Si la table est vide ou n'existe pas encore, on renvoie des valeurs par défaut
    return NextResponse.json({
      marquee_text: '⚠️ Bienvenue sur le site de la MDLE !',
      marquee_active: false,
      opening_hours: [
        { day: 'Lundi', hours: '9h - 17h' },
        { day: 'Mardi', hours: '9h - 17h' },
        { day: 'Mercredi', hours: '9h - 12h' },
        { day: 'Jeudi', hours: '9h - 17h' },
        { day: 'Vendredi', hours: '9h - 15h' },
      ],
      bureau_members: [
        { role: 'Président', name: 'Thomas', emoji: '👑' },
        { role: 'Vice-Présidente 1', name: 'Marie', emoji: '⚡' },
        { role: 'Vice-Présidente 2', name: 'Lisa', emoji: '⚡' },
        { role: 'Trésorier', name: 'Nathan', emoji: '💰' },
        { role: 'Trésorier Adjoint', name: 'Esteban', emoji: '💰' },
        { role: 'Secrétaire', name: 'À définir', emoji: '📝' },
      ],
    })
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
