import { NextRequest, NextResponse } from 'next/server'
import { lookupHotelByName } from '@/lib/ai-hotel-lookup'

export const runtime = 'nodejs'
export const maxDuration = 90

export type { AiHotelLookupResult } from '@/lib/ai-hotel-lookup'

interface AiHotelLookupRequest {
  hotelName: string
}

interface AiHotelLookupResponse {
  success: boolean
  data?: import('@/lib/ai-hotel-lookup').AiHotelLookupResult
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<AiHotelLookupResponse>> {
  try {
    const body: AiHotelLookupRequest = await request.json()
    const hotelName = typeof body?.hotelName === 'string' ? body.hotelName.trim() : ''
    if (!hotelName || hotelName.length < 2) {
      return NextResponse.json(
        { success: false, error: '호텔명은 2글자 이상 입력해주세요.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const data = await lookupHotelByName(apiKey, hotelName)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '호텔 정보 조회 중 오류가 발생했습니다.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
