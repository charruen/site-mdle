import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'mdle_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

type SessionPayload = {
  exp: number
  role: 'admin'
}

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    throw new Error('ADMIN_PASSWORD doit être défini.')
  }

  return password
}

function sign(payload: string) {
  return createHmac('sha256', getAdminPassword()).update(payload).digest('base64url')
}

function decodeSession(value: string): SessionPayload | null {
  const [encodedPayload, signature] = value.split('.')

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = sign(encodedPayload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload
    return payload.role === 'admin' && payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

export function createAdminSessionValue() {
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    role: 'admin',
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  return `${encodedPayload}.${sign(encodedPayload)}`
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies()
  const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  return Boolean(sessionValue && decodeSession(sessionValue))
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  }
}

export const adminSessionCookieName = ADMIN_SESSION_COOKIE
