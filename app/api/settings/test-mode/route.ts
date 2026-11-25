import { NextResponse } from 'next/server'
import { isTestModeEnabled } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/**
 * Route publique retournant l'état du mode testeur
 */
export async function GET() {
  const testMode = await isTestModeEnabled()
  return NextResponse.json({ testMode })
}
