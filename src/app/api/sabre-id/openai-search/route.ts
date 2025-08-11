import { NextRequest, NextResponse } from 'next/server'

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
  }
  error?: string
}

// OpenAI API를 사용하여 호텔명으로 Sabre Hotel Code 찾기 (GPT-5 우선, 실패 시 gpt-4o-mini 폴백)
async function findSabreHotelCodeWithOpenAI(hotelName: string): Promise<{
  sabreHotelCode: string
  confidence: number
  reasoning: string
}> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다.')
  }

  const prompt = `역할: 당신은 Sabre 시스템에 대한 지식을 가진 호텔 식별 전문가입니다.\n목표: 사용자로부터 받은 \"호텔명\"만을 근거로 해당 호텔의 Sabre Hotel Code(숫자)를 추정하세요.\n제약:\n- 예시 호텔명이나 샘플 코드를 절대 사용하지 마세요.\n- 입력된 호텔명과 무관한 사전 예시 사용 금지.\n- 확신이 낮으면 신뢰도를 낮게 주고 sabreHotelCode는 빈 문자열(\"\")로 두세요.\n- 반드시 JSON으로만 답변하세요.\n입력 호텔명: "${hotelName}"\n응답 형식(JSON):\n{\n  "sabreHotelCode": "숫자만 또는 빈 문자열",\n  "confidence": 0.0~1.0,\n  "reasoning": "선택 근거(간단)"\n}`

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5',
        input: [{ role: 'system', content: '당신은 호텔 전문가입니다. 정확하고 유용한 정보를 제공하세요.' }, { role: 'user', content: prompt }],
        temperature: 0.2,
        max_output_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const content: string = data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? ''
      if (content) {
        const parsed = JSON.parse(content)
        return { sabreHotelCode: String(parsed.sabreHotelCode ?? ''), confidence: Number(parsed.confidence ?? 0), reasoning: String(parsed.reasoning ?? '') }
      }
    }
  } catch {}

  const cc = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: '당신은 호텔 전문가입니다. 정확하고 유용한 정보를 제공하세요.' }, { role: 'user', content: prompt } ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
  })
  if (!cc.ok) {
    const errText = await cc.text().catch(() => '')
    throw new Error(`OpenAI API 오류: ${cc.status} ${errText}`)
  }
  const ccData = await cc.json()
  const content = ccData.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI API 응답이 비어있습니다')
  const parsed = JSON.parse(content)
  return { sabreHotelCode: String(parsed.sabreHotelCode ?? ''), confidence: Number(parsed.confidence ?? 0), reasoning: String(parsed.reasoning ?? '') }
}

async function verifySabreHotelCode(sabreHotelCode: string): Promise<{ verifiedHotelName: string; address?: string; city?: string; country?: string }> {
  try {
    const requestBody = { HotelCode: sabreHotelCode, CurrencyCode: 'KRW', StartDate: new Date().toISOString().split('T')[0], EndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], Adults: 2 }
    const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error(`Sabre API 호출 실패: ${response.status}`)
    const result = await response.json()
    if (result.GetHotelDetailsRS?.HotelDetailsInfo?.HotelInfo) {
      const hotelInfo = result.GetHotelDetailsRS.HotelDetailsInfo.HotelInfo
      return { verifiedHotelName: hotelInfo.HotelName || 'Unknown Hotel', address: extractAddress(hotelInfo), city: extractCity(hotelInfo), country: extractCountry(hotelInfo) }
    }
    throw new Error('호텔 정보를 찾을 수 없습니다')
  } catch (error) {
    console.error('Sabre API 검증 오류:', error)
    throw new Error('Sabre API를 통한 호텔 코드 검증에 실패했습니다')
  }
}

function calculateHotelNameMatchScore(inputName: string, verifiedName: string): number {
  const input = inputName.toLowerCase().trim()
  const verified = verifiedName.toLowerCase().trim()
  if (!input || !verified) return 0.0
  if (input === verified) return 1.0
  const inputWords = input.split(/\s+/).filter(Boolean)
  const verifiedWords = verified.split(/\s+/).filter(Boolean)
  if (inputWords.length === 0 || verifiedWords.length === 0) return 0.0
  let matchCount = 0
  let totalScore = 0
  for (const inputWord of inputWords) {
    let bestMatchScore = 0
    for (const verifiedWord of verifiedWords) {
      if (inputWord === verifiedWord) { bestMatchScore = 1.0; break }
      if (inputWord.includes(verifiedWord) || verifiedWord.includes(inputWord)) {
        const lengthRatio = Math.min(inputWord.length, verifiedWord.length) / Math.max(inputWord.length, verifiedWord.length)
        bestMatchScore = Math.max(bestMatchScore, lengthRatio * 0.8)
      }
      const similarity = calculateWordSimilarity(inputWord, verifiedWord)
      bestMatchScore = Math.max(bestMatchScore, similarity * 0.6)
    }
    totalScore += bestMatchScore
    if (bestMatchScore > 0.5) matchCount++
  }
  const averageScore = totalScore / inputWords.length
  const matchRatio = matchCount / inputWords.length
  return averageScore * 0.7 + matchRatio * 0.3
}

function calculateWordSimilarity(word1: string, word2: string): number {
  if (word1 === word2) return 1.0
  const longer = word1.length > word2.length ? word1 : word2
  const shorter = word1.length > word2.length ? word2 : word1
  if (longer.length === 0) return 1.0
  let commonPrefix = 0
  for (let i = 0; i < shorter.length; i++) { if (longer[i] === shorter[i]) commonPrefix++; else break }
  let commonSuffix = 0
  for (let i = 1; i <= shorter.length; i++) { if (longer[longer.length - i] === shorter[shorter.length - i]) commonSuffix++; else break }
  const prefixScore = commonPrefix / longer.length
  const suffixScore = commonSuffix / longer.length
  const lengthRatio = shorter.length / longer.length
  return prefixScore * 0.4 + suffixScore * 0.4 + lengthRatio * 0.2
}

function determineVerificationStatus(matchScore: number): 'verified' | 'partial_match' | 'no_match' {
  if (matchScore >= 0.8) return 'verified'
  if (matchScore >= 0.4) return 'partial_match'
  return 'no_match'
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

    let openaiResult: { sabreHotelCode: string; confidence: number; reasoning: string } | null = null
    try {
      openaiResult = await findSabreHotelCodeWithOpenAI(inputHotelName)
    } catch (err) {
      // OpenAI 실패: 폴백으로 내부 검색 API 호출하여 후보 탐색
      const origin = new URL(request.url).origin
      const fbRes = await fetch(`${origin}/api/sabre-id/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hotelName: inputHotelName }) })
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        const first = Array.isArray(fbData.data) ? fbData.data[0] : null
        if (first?.hotelCode) {
          openaiResult = { sabreHotelCode: String(first.hotelCode), confidence: 0.5, reasoning: 'Fallback: internal search' }
        }
      }
      if (!openaiResult) {
        return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: '', hotelName: '', confidence: 0, reasoning: err instanceof Error ? err.message : 'AI 검색 실패', verificationStatus: 'verification_failed', verificationDetails: { inputHotelName, verifiedHotelName: '', matchScore: 0 } } }, { status: 200 })
      }
    }

    // AI 결과가 비었거나 신뢰도 낮거나 비숫자 코드면 내부 검색 폴백 시도
    if (!openaiResult.sabreHotelCode || !/^\d+$/.test(openaiResult.sabreHotelCode) || openaiResult.confidence < 0.6) {
      const origin = new URL(request.url).origin
      const fbRes = await fetch(`${origin}/api/sabre-id/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hotelName: inputHotelName }) })
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        const first = Array.isArray(fbData.data) ? fbData.data[0] : null
        if (first?.hotelCode) {
          openaiResult = { sabreHotelCode: String(first.hotelCode), confidence: Math.max(openaiResult.confidence, 0.6), reasoning: `${openaiResult.reasoning || 'AI 결과 불확실'} + Fallback: internal search` }
        }
      }

      if (!openaiResult.sabreHotelCode || !/^\d+$/.test(openaiResult.sabreHotelCode)) {
        return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: '', hotelName: '', confidence: openaiResult.confidence, reasoning: openaiResult.reasoning, verificationStatus: 'verification_failed', verificationDetails: { inputHotelName, verifiedHotelName: '', matchScore: 0 } } }, { status: 200 })
      }
    }

    let sabreVerification: { verifiedHotelName: string; address?: string; city?: string; country?: string } | null = null
    let verificationStatus: 'verified' | 'partial_match' | 'no_match' | 'verification_failed' = 'verification_failed'
    let matchScore = 0

    try {
      sabreVerification = await verifySabreHotelCode(openaiResult.sabreHotelCode)
      const computedScore = calculateHotelNameMatchScore(inputHotelName, sabreVerification.verifiedHotelName)
      verificationStatus = determineVerificationStatus(computedScore)
      matchScore = computedScore
    } catch {}

    return NextResponse.json<OpenAIHotelSearchResponse>({ success: true, data: { sabreHotelCode: openaiResult.sabreHotelCode, hotelName: sabreVerification?.verifiedHotelName ?? '검증 실패', confidence: openaiResult.confidence, reasoning: openaiResult.reasoning, verificationStatus, verificationDetails: { inputHotelName, verifiedHotelName: sabreVerification?.verifiedHotelName ?? '', matchScore, address: sabreVerification?.address, city: sabreVerification?.city, country: sabreVerification?.country } } }, { status: 200 })
  } catch (error) {
    return NextResponse.json<OpenAIHotelSearchResponse>({ success: false, error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
