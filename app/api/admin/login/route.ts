import { NextResponse } from 'next/server'
import {
  adminSessionCookieName,
  adminSessionCookieOptions,
  createAdminSessionValue,
} from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { password } = await request.json() as { password?: unknown }
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD est absent.')
      return NextResponse.json({ error: 'Configuration administrateur indisponible.' }, { status: 503 })
    }

    if (typeof password !== 'string' || password.length === 0 || password !== expectedPassword) {
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(adminSessionCookieName, createAdminSessionValue(), adminSessionCookieOptions())
    return response
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(adminSessionCookieName, '', { ...adminSessionCookieOptions(), maxAge: 0 })
  return response
}
