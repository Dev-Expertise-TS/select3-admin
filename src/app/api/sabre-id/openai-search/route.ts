import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface OpenAIHotelSearchRequest {
  hotelName: string
}

interface OpenAIHotelSearchResponse {
  success: boolean
  data?: {
    sabreHotelCode: string
    hotelName: string
    confidence: number
    reasoning: string
    verificationStatus: 'verified' | 'partial_match' | 'no_match' | 'verification_failed'
    verificationDetails: {
      inputHotelName: string
      verifiedHotelName: string
      matchScore: number
      address?: string
      city?: string
      country?: string
    }
    aiRaw?: string
  }
  error?: string
}

function extractNumericCodesFromText(text: string): string[] {
  const matches = text.match(/\b\d{3,}\b/g) || []
  const unique = Array.from(new Set(matches.map((m) => m.trim())))
  return unique.sort((a, b) => (b.length - a.length) || (Number(a) - Number(b)))
}

function extractTextFromResponses(json: unknown): string {
  const data = json as Record<string, unknown>
  const choices = data?.choices as Array<{ message?: { content?: string } }> | undefined
  const cc = choices?.[0]?.message?.content
  if (typeof cc === 'string' && cc.trim().length > 0) return cc
  const ot = data?.output_text
  if (typeof ot === 'string' && ot.trim().length > 0) return ot
  const output = data?.output as Array<{ content?: Array<{ text?: string }> }> | undefined
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item?.content
      if (Array.isArray(content)) {
        for (const chunk of content) {
          if (typeof chunk?.text === 'string' && chunk.text.trim().length > 0) {
            return chunk.text
          }
        }
      }
    }
  }
  return ''
}

async function askGptForCodeRaw(hotelName: string, apiKey: string): Promise<string> {
  const systemPrompt = `You are ChatGPT, a large language model trained by OpenAI.\nFollow the user’s instructions carefully.\nAnswer using the same style, depth, and format as ChatGPT web UI would.\nAvoid disallowed content and comply with OpenAI policies.\nThis request asks for a GDS Sabre Hotel Code, which is a public, non-sensitive identifier used for hotel inventory. Providing such public codes is allowed. If you don't know, reply with the single word: unknown.`
  const userPrompt = `${hotelName} 의 Sabre Hotel Code 숫자만 알려줘.`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  try { console.log('[openai-search] chat.completions gpt-4o messages=', JSON.stringify(messages)) } catch {}

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.7,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      messages,
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    console.warn('[openai-search] chat.completions error:', resp.status, txt)
    return ''
  }

  const json = await resp.json()
  const text = extractTextFromResponses(json)
  try { console.log('[openai-search] chat.completions raw output:', text) } catch {}
  return text
}

async function verifySabreHotelCode(sabreHotelCode: string): Promise<{ verifiedHotelName: string; address?: string; city?: string; country?: string }> {
  const requestBody = { HotelCode: sabreHotelCode, CurrencyCode: 'KRW', StartDate: new Date().toISOString().split('T')[0], EndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], Adults: 2 }
  const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Sabre API 호출 실패: ${response.status}`)
  const result = await response.json()
  if (result.GetHotelDetailsRS?.HotelDetailsInfo?.HotelInfo) {
    const hotelInfo = result.GetHotelDetailsRS.HotelDetailsInfo.HotelInfo
    return { verifiedHotelName: hotelInfo.HotelName || 'Unknown Hotel', address: extractAddress(hotelInfo), city: extractCity(hotelInfo), country: extractCountry(hotelInfo) }
  }
  throw new Error('호텔 정보를 찾을 수 없습니다')
}

function extractAddress(hotelInfo: unknown): string {
  const info = hotelInfo as { Address?: { AddressLine?: string | string[]; Street?: string } }
  if (info.Address) {
    if (Array.isArray(info.Address.AddressLine)) return info.Address.AddressLine.join(', ')
    if (info.Address.AddressLine) return info.Address.AddressLine
    if (info.Address.Street) return info.Address.Street
  }
  return '주소 정보 없음'
}

function extractCity(hotelInfo: unknown): string {
  const info = hotelInfo as { Address?: { CityName?: string; City?: string }; LocationInfo?: { Address?: { CityName?: string } } }
  return info.Address?.CityName || info.Address?.City || info.LocationInfo?.Address?.CityName || '도시 정보 없음'
}

function extractCountry(hotelInfo: unknown): string {
  const info = hotelInfo as { Address?: { CountryCode?: string; CountryName?: string }; LocationInfo?: { Address?: { CountryCode?: string } } }
  return info.Address?.CountryCode || info.Address?.CountryName || info.LocationInfo?.Address?.CountryCode || '국가 정보 없음'
}

export async function POST(request: NextRequest) {
  try {
    const body: OpenAIHotelSearchRequest = await request.json()
    if (!body.hotelName || typeof body.hotelName !== 'string') {
      return NextResponse.json<OpenAIHotelSearchResponse>({ success: false, error: 'hotelName is required and must be a string' }, { status: 400 })
    }

    const inputHotelName = body.hotelName.trim()
    if (inputHotelName.length < 2) {
      return NextResponse.json<OpenAIHotelSearchResponse>({ success: false, error: '검색어는 최소 2글자 이상이어야 합니다.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: '', hotelName: '', confidence: 0, reasoning: 'OPENAI_API_KEY 미설정', verificationStatus: 'verification_failed', verificationDetails: { inputHotelName, verifiedHotelName: '', matchScore: 0 }, aiRaw: '' } })
    }

    // 1) GPT 원문 → 숫자 후보
    const aiRaw = await askGptForCodeRaw(inputHotelName, apiKey)
    let candidates = aiRaw ? extractNumericCodesFromText(aiRaw) : []

    // 후보가 없으면 내부 검색 폴백(/api/sabre-id/search)
    if (candidates.length === 0) {
      try {
        const origin = new URL(request.url).origin
        const fbRes = await fetch(`${origin}/api/sabre-id/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelName: inputHotelName }),
        })
        if (fbRes.ok) {
          const fb = await fbRes.json()
          const list = Array.isArray(fb?.data) ? fb.data : []
          const codes = list.map((r: { hotelCode?: string | number }) => String(r?.hotelCode || '').trim()).filter((s: string) => /^\d+$/.test(s))
          candidates = Array.from(new Set(codes))
        }
      } catch {}
    }

    try { console.log('[openai-search] numeric candidates (sorted):', candidates) } catch {}

    if (candidates.length === 0) {
      return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: '', hotelName: '', confidence: 0, reasoning: '숫자 코드를 추출하지 못함', verificationStatus: 'verification_failed', verificationDetails: { inputHotelName, verifiedHotelName: '', matchScore: 0 }, aiRaw } })
    }

    // 2) 안정된 순서로 검증
    const a = inputHotelName.trim().toLowerCase()
    let chosenCode: string | null = null
    let verifiedName = ''
    let address: string | undefined
    let city: string | undefined
    let country: string | undefined

    for (const code of candidates) {
      try {
        const v = await verifySabreHotelCode(code)
        const b = v.verifiedHotelName.trim().toLowerCase()
        if (a === b) {
          chosenCode = code
          verifiedName = v.verifiedHotelName
          address = v.address
          city = v.city
          country = v.country
          break
        }
      } catch {}
    }

    if (!chosenCode) {
      const first = candidates[0]
      try {
        const v = await verifySabreHotelCode(first)
        verifiedName = v.verifiedHotelName
        address = v.address
        city = v.city
        country = v.country
      } catch {}
      return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: first, hotelName: verifiedName || '검증 실패', confidence: 0.9, reasoning: 'GPT/폴백 후보 중 첫 번째 코드 사용', verificationStatus: verifiedName ? (a === verifiedName.trim().toLowerCase() ? 'verified' : 'no_match') : 'verification_failed', verificationDetails: { inputHotelName, verifiedHotelName: verifiedName || '', matchScore: verifiedName ? (a === verifiedName.trim().toLowerCase() ? 1 : 0) : 0, address, city, country }, aiRaw } })
    }

    return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: chosenCode, hotelName: verifiedName, confidence: 0.95, reasoning: '검증된 호텔명과 정확히 일치하는 코드 선택', verificationStatus: 'verified', verificationDetails: { inputHotelName, verifiedHotelName: verifiedName, matchScore: 1, address, city, country }, aiRaw } })
  } catch (error) {
    return NextResponse.json<OpenAIHotelSearchResponse>({ success: false, error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
