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

    // Essai d'upsert complet
    let { data, error } = await supabase
      .from('site_settings')
      .upsert({ id: 1, ...body, updated_at: new Date().toISOString() })
      .select()
      .single()

    // Si l'upsert échoue à cause des nouvelles colonnes promo absentes de la table Supabase existante
    if (error && (error.message?.includes('promo_text') || error.message?.includes('promo_active') || error.code === 'PGRST204')) {
      const { promo_text, promo_active, ...fallbackBody } = body
      const retry = await supabase
        .from('site_settings')
        .upsert({ id: 1, ...fallbackBody, updated_at: new Date().toISOString() })
        .select()
        .single()

      if (!retry.error && retry.data) {
        return NextResponse.json({
          ...retry.data,
          promo_text,
          promo_active,
          warning: 'Les colonnes promo_text/promo_active n’existent pas encore dans Supabase. Exécute le script SQL de mise à jour.'
        })
      }
    }

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour des paramètres:', error)
    return NextResponse.json({
      error: 'Erreur de sauvegarde',
      details: error?.message || String(error)
    }, { status: 500 })
  }
}
