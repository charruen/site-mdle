import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/adminAuth'
import { isTestModeEnabled, setTestModeEnabled } from '@/lib/settings'

export const dynamic = 'force-dynamic'

async function checkAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Session administrateur requise.' }, { status: 401 })
  }
  return null
}

export async function GET() {
  const unauthorized = await checkAdmin()
  if (unauthorized) return unauthorized

  const testMode = await isTestModeEnabled()
  return NextResponse.json({ testMode })
}

export async function PATCH(request: Request) {
  const unauthorized = await checkAdmin()
  if (unauthorized) return unauthorized

  try {
    const body = (await request.json().catch(() => ({}))) as { testMode?: boolean }
    if (typeof body.testMode !== 'boolean') {
      return NextResponse.json({ error: 'Paramètre testMode booléen requis.' }, { status: 400 })
    }

    const success = await setTestModeEnabled(body.testMode)
    if (!success) {
      return NextResponse.json({ error: 'Échec de mise à jour du mode testeur.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, testMode: body.testMode })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/settings :', error)
    return NextResponse.json({ error: 'Erreur interne du serveur.' }, { status: 500 })
  }
}
