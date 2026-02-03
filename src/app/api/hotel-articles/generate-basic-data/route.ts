import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI, DEFAULT_CONFIG, getOpenAIApiKey } from '@/config/openai'
import {
  HOTEL_BLOG_ARTICLE_BASIC_DATA_SYSTEM_PROMPT,
  getHotelBlogArticleBasicDataUserMessage,
} from '@/config/hotel-blog-article-prompt'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const hotels = typeof body.hotels === 'string' ? body.hotels.trim() : ''

    if (!topic && !hotels) {
      return NextResponse.json(
        { success: false, error: 'Topic 또는 Hotels 중 하나 이상을 입력해주세요.' },
        { status: 400 }
      )
    }

    const apiKey = getOpenAIApiKey()
    const userMessage = getHotelBlogArticleBasicDataUserMessage(topic, hotels)

    const response = await callOpenAI({
      apiKey,
      systemMessage: HOTEL_BLOG_ARTICLE_BASIC_DATA_SYSTEM_PROMPT,
      userMessage,
      config: {
        ...DEFAULT_CONFIG,
        temperature: 0.6,
        maxTokens: 300,
        responseFormat: { type: 'json_object' },
      },
      enableWebSearch: false,
    })

    const raw = (response.content ?? '').trim()
    let data: { main_title?: string; sub_title?: string; slug?: string }

    try {
      data = JSON.parse(raw) as { main_title?: string; sub_title?: string; slug?: string }
    } catch {
      return NextResponse.json(
        { success: false, error: 'AI 응답을 파싱할 수 없습니다.' },
        { status: 500 }
      )
    }

    const main_title = typeof data.main_title === 'string' ? data.main_title.slice(0, 50) : ''
    const sub_title = typeof data.sub_title === 'string' ? data.sub_title.slice(0, 50) : ''
    let slug = typeof data.slug === 'string' ? data.slug.trim() : ''
    // slug 정규화: 소문자, 공백/특수문자를 하이픈으로, 연속 하이픈 제거
    slug = slug
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'blog-article'

    return NextResponse.json({
      success: true,
      data: { main_title, sub_title, slug },
    })
  } catch (err) {
    console.error('[generate-basic-data]', err)
    const message =
      err instanceof Error ? err.message : '아티클 기본 데이터 생성에 실패했습니다.'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
