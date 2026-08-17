import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('projects')
      .select('id, slug, title, description, emoji, badge_tag, is_active, has_reservation_form, form_config')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Projet introuvable.' }, { status: 404 })
    }

    return NextResponse.json({ project: data })
  } catch (error) {
    console.error('Lecture publique du projet impossible :', error)
    return NextResponse.json({ error: 'Service temporairement indisponible.' }, { status: 503 })
  }
}
