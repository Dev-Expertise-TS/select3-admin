import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { callOpenAI, DEFAULT_CONFIG } from '@/config/openai'
import {
  HOTEL_BLOG_ARTICLE_SYSTEM_PROMPT,
  getHotelBlogArticleUserMessage,
} from '@/config/hotel-blog-article-prompt'

export const maxDuration = 60

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
      .select('sabre_id, property_name_ko, property_name_en')
      .eq('sabre_id', sabreId)
      .single()

    if (error || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const propertyNameKo = hotel.property_name_ko?.trim() ?? ''
    const propertyNameEn = hotel.property_name_en?.trim() ?? ''

    if (!propertyNameEn) {
      return NextResponse.json(
        { success: false, error: '호텔 영문명이 없어 블로그 아티클을 생성할 수 없습니다.' },
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

    const userMessage = getHotelBlogArticleUserMessage(propertyNameKo, propertyNameEn)

    const response = await callOpenAI({
      apiKey,
      systemMessage: HOTEL_BLOG_ARTICLE_SYSTEM_PROMPT,
      userMessage,
      config: {
        ...DEFAULT_CONFIG,
        temperature: 0.7,
        maxTokens: 4096,
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

    return NextResponse.json({
      success: true,
      data: {
        content,
      },
    })
  } catch (err) {
    console.error('호텔 블로그 아티클 생성 오류:', err)
    const message =
      err instanceof Error ? err.message : '블로그 아티클 생성에 실패했습니다.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

