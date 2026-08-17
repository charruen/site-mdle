import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const resources = ['menu_items', 'events', 'projects'] as const
type Resource = (typeof resources)[number]
type JsonRecord = Record<string, unknown>

function isResource(value: unknown): value is Resource {
  return typeof value === 'string' && resources.includes(value as Resource)
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  return null
}

function pickMenuItem(data: JsonRecord) {
  return {
    title: String(data.title ?? '').trim(),
    category: String(data.category ?? '').trim(),
    price: String(data.price ?? '').trim(),
    description: String(data.description ?? '').trim() || null,
    is_available: typeof data.is_available === 'boolean' ? data.is_available : true,
  }
}

function pickEvent(data: JsonRecord) {
  return {
    title: String(data.title ?? '').trim(),
    date: String(data.date ?? '').trim(),
    location: String(data.location ?? '').trim() || null,
    price: String(data.price ?? '').trim() || null,
    description: String(data.description ?? '').trim() || null,
    payment_link: String(data.payment_link ?? '').trim() || null,
  }
}

function pickProject(data: JsonRecord) {
  return {
    title: String(data.title ?? '').trim(),
    slug: String(data.slug ?? '').trim().toLowerCase(),
    emoji: String(data.emoji ?? '🚀').trim() || '🚀',
    badge_tag: String(data.badge_tag ?? 'Opération MDLE').trim() || 'Opération MDLE',
    description: String(data.description ?? '').trim() || null,
    is_active: typeof data.is_active === 'boolean' ? data.is_active : true,
    has_reservation_form: typeof data.has_reservation_form === 'boolean' ? data.has_reservation_form : true,
    form_config: typeof data.form_config === 'object' && data.form_config !== null ? data.form_config : {},
  }
}

function sanitize(resource: Resource, data: JsonRecord): JsonRecord {
  if (resource === 'menu_items') return pickMenuItem(data)
  if (resource === 'events') return pickEvent(data)
  return pickProject(data)
}

function isValid(resource: Resource, data: JsonRecord) {
  const hasText = (key: string) => typeof data[key] === 'string' && data[key].trim().length > 0

  if (resource === 'menu_items') return hasText('title') && hasText('category') && hasText('price')
  if (resource === 'events') return hasText('title') && hasText('date')
  return hasText('title') && hasText('slug') && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(data.slug))
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const supabase = getSupabaseAdmin()
    const [menu, events, projects] = await Promise.all([
      supabase.from('menu_items').select('*').order('id'),
      supabase.from('events').select('*').order('id'),
      supabase.from('projects').select('*').order('id'),
    ])

    if (menu.error || events.error || projects.error) {
      throw menu.error ?? events.error ?? projects.error
    }

    return NextResponse.json({ menuItems: menu.data ?? [], events: events.data ?? [], projects: projects.data ?? [] })
  } catch (error) {
    console.error('Lecture administration impossible :', error)
    return NextResponse.json({ error: 'Impossible de charger les données administratives.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const body = await request.json() as { resource?: unknown; data?: unknown }
    if (!isResource(body.resource) || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const data = sanitize(body.resource, body.data as JsonRecord)
    if (!isValid(body.resource, data)) {
      return NextResponse.json({ error: 'Des champs obligatoires sont manquants ou invalides.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from(body.resource).insert(data)
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Création administration impossible :', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer la donnée.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const body = await request.json() as { resource?: unknown; id?: unknown; data?: unknown }
    const id = Number(body.id)
    if (!isResource(body.resource) || !Number.isSafeInteger(id) || id < 1 || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const data = sanitize(body.resource, body.data as JsonRecord)
    if (!isValid(body.resource, data)) {
      return NextResponse.json({ error: 'Des champs obligatoires sont manquants ou invalides.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from(body.resource).update(data).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mise à jour administration impossible :', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour la donnée.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const url = new URL(request.url)
    const resource = url.searchParams.get('resource')
    const id = Number(url.searchParams.get('id'))
    if (!isResource(resource) || !Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const { error } = await getSupabaseAdmin().from(resource).delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Suppression administration impossible :', error)
    return NextResponse.json({ error: 'Impossible de supprimer la donnée.' }, { status: 500 })
  }
}
