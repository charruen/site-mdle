import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { path = '/', visitorId } = body

    if (!visitorId || typeof visitorId !== 'string') {
      return NextResponse.json({ error: 'visitorId requis' }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') || ''

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('page_views')
      .insert({
        path: path.slice(0, 100),
        visitor_id: visitorId.slice(0, 64),
        user_agent: userAgent.slice(0, 200),
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Erreur insertion page_views:', error)
      return NextResponse.json({ error: 'Erreur BDD' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erreur API /api/track:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
