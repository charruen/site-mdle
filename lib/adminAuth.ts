import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const ADMIN_SESSION_COOKIE = 'mdle_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 heures

type SessionPayload = {
  exp: number
  role: 'admin'
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET ou ADMIN_PASSWORD doit être défini.')
  }
  if (!process.env.ADMIN_SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('ATTENTION : ADMIN_SESSION_SECRET n’est pas défini en production. Utilisation de ADMIN_PASSWORD par défaut.')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url')
}

export function verifyPasswordConstantTime(provided: string, expected: string): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  const hashProvided = createHash('sha256').update(provided).digest()
  const hashExpected = createHash('sha256').update(expected).digest()
  return timingSafeEqual(hashProvided, hashExpected)
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

export function createAdminSessionValue(): string {
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
    role: 'admin',
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  return `${encodedPayload}.${sign(encodedPayload)}`
}

export async function isAdminAuthenticated(): Promise<boolean> {
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
