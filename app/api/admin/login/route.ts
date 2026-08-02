import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  const expectedPassword = process.env.ADMIN_PASSWORD || 'mdle2026'

  if (password === expectedPassword) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false }, { status: 401 })
}