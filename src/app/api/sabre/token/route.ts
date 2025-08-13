import { NextResponse } from 'next/server'
import { getSabreToken } from '@/lib/sabre'

export async function GET() {
  try {
    const token = await getSabreToken()
    const masked = token.length > 16 ? `${token.slice(0, 8)}...${token.slice(-8)}` : 'MASKED'
    return NextResponse.json({ ok: true, token_preview: masked })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}


