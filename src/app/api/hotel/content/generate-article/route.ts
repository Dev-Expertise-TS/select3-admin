import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callOpenAI, DEFAULT_CONFIG } from '@/config/openai'
import {
  HOTEL_ARTICLE_SYSTEM_PROMPT,
  getHotelArticleUserMessage,
} from '@/config/hotel-article-prompt'

export const maxDuration = 60

/** 전체 HTML에서 호텔 위치 섹션을 분리해 property_details / property_location 으로 나눔 */
function splitHotelLocationSection(html: string): {
  propertyDetails: string
  propertyLocation: string
} {
  const trimmed = html.trim()
  if (!trimmed) {
    return { propertyDetails: '', propertyLocation: '' }
  }
  // <h2><strong>호텔 위치</strong></h2> 또는 공백이 섞인 형태 매칭
  const locationSectionStart = trimmed.search(
    /<h2\s*>\s*<strong\s*>\s*호텔\s+위치\s*<\/strong\s*>\s*<\/h2\s*>/i
  )
  if (locationSectionStart === -1) {
    return { propertyDetails: trimmed, propertyLocation: '' }
  }
  const propertyDetails = trimmed.slice(0, locationSectionStart).trim()
  const propertyLocation = trimmed.slice(locationSectionStart).trim()
  return { propertyDetails, propertyLocation }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const raw = body.sabre_id
    const sabreId =
      typeof raw === 'string'
        ? raw.trim()
        : typeof raw === 'number' && Number.isFinite(raw)
          ? String(raw)
          : ''

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'sabre_id가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_en')
      .eq('sabre_id', sabreId)
      .single()

    if (error || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const propertyNameEn = hotel.property_name_en?.trim() ?? ''
    if (!propertyNameEn) {
      return NextResponse.json(
        { success: false, error: '호텔 영문명이 없어 소개 아티클을 생성할 수 없습니다.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const userMessage = getHotelArticleUserMessage(propertyNameEn)

    // 전체 섹션(개요·추천 포인트·객실·부대시설·다이닝&바·호텔 위치)이 모두 포함되도록 충분한 출력 길이 확보
    const response = await callOpenAI({
      apiKey,
      systemMessage: HOTEL_ARTICLE_SYSTEM_PROMPT,
      userMessage,
      config: {
        ...DEFAULT_CONFIG,
        temperature: 0.7,
        maxTokens: 8192,
        responseFormat: { type: 'text' },
      },
      enableWebSearch: true,
    })

    let content = (response.content ?? '').trim()
    // 마크다운 코드 블록 제거 (```html ... ```)
    const codeBlockMatch = content.match(/^```(?:html)?\s*([\s\S]*?)```$/m)
    if (codeBlockMatch) {
      content = codeBlockMatch[1].trim()
    }

    // 호텔 위치 섹션 분리: Property Details에는 제외, Property Location에는 해당 섹션만
    const { propertyDetails, propertyLocation } = splitHotelLocationSection(content)

    return NextResponse.json({
      success: true,
      data: {
        content: propertyDetails,
        locationContent: propertyLocation,
      },
    })
  } catch (err) {
    console.error('호텔 소개 아티클 생성 오류:', err)
    const message =
      err instanceof Error ? err.message : '소개 아티클 생성에 실패했습니다.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
