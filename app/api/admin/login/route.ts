import { NextResponse } from 'next/server'
import {
  adminSessionCookieName,
  adminSessionCookieOptions,
  createAdminSessionValue,
  verifyPasswordConstantTime,
} from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// 5 tentatives par 15 minutes par IP
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit('admin_login', clientIp, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)

    if (!rateLimit.success) {
      const minutesRemaining = Math.ceil(rateLimit.resetInMs / 60000)
      return NextResponse.json(
        { error: `Trop de tentatives de connexion infructueuses. Veuillez réessayer dans ${minutesRemaining} minute(s).` },
        { status: 429 }
      )
    }

    const { password } = (await request.json().catch(() => ({}))) as { password?: unknown }
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      console.error('ADMIN_PASSWORD n’est pas configuré sur le serveur.')
      return NextResponse.json(
        { error: 'Configuration d’administration indisponible.' },
        { status: 503 }
      )
    }

    if (typeof password !== 'string' || !verifyPasswordConstantTime(password, expectedPassword)) {
      return NextResponse.json(
        { error: `Mot de passe administrateur incorrect. (${rateLimit.remaining} tentative(s) restante(s))` },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(adminSessionCookieName, createAdminSessionValue(), adminSessionCookieOptions())
    return response
  } catch (error) {
    console.error('Erreur API /admin/login :', error)
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(adminSessionCookieName, '', { ...adminSessionCookieOptions(), maxAge: 0 })
  return response
}
