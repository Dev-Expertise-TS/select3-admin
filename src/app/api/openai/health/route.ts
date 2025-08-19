import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const hasKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0)
  let canAuth = false
  let httpStatus: number | null = null
  let error: string | null = null

  if (hasKey) {
    try {
      const resp = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      })
      httpStatus = resp.status
      canAuth = resp.ok
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        error = txt || `OpenAI responded with status ${resp.status}`
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error'
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        hasKey,
        canAuth,
        httpStatus,
      },
      ...(error ? { error } : {}),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
