/**
 * Gestionnaire de limitation de débit (Rate Limiter) en mémoire.
 * Adapté pour Next.js App Router sur instance Node / Serverless.
 */

type RateLimitRecord = {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitRecord>>()

/**
 * Nettoyage périodique des entrées expirées (toutes les 5 minutes)
 */
setInterval(() => {
  const now = Date.now()
  for (const [, store] of stores) {
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key)
      }
    }
  }
}, 5 * 60 * 1000).unref?.()

export function checkRateLimit(
  namespace: string,
  identifier: string,
  maxAttempts: number,
  windowMs: number
): { success: boolean; remaining: number; resetInMs: number } {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map())
  }
  const store = stores.get(namespace)!
  const now = Date.now()
  const record = store.get(identifier)

  if (!record || record.resetAt <= now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: maxAttempts - 1, resetInMs: windowMs }
  }

  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0, resetInMs: Math.max(0, record.resetAt - now) }
  }

  record.count += 1
  return { success: true, remaining: maxAttempts - record.count, resetInMs: Math.max(0, record.resetAt - now) }
}

/**
 * Extrait l'IP du client depuis les headers standards de reverse proxy (Vercel, Cloudflare, etc.)
 */
export function getClientIp(request: Request): string {
  const headers = request.headers
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  const xRealIp = headers.get('x-real-ip')
  if (xRealIp) {
    return xRealIp.trim()
  }
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }
  return '127.0.0.1'
}
