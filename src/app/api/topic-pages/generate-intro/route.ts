import { NextRequest, NextResponse } from 'next/server'
import { AI_MODELS } from '@/config/ai-prompts'

/**
 * POST /api/topic-pages/generate-intro
 * 도시, 동행인, 스타일 정보를 기반으로 AI가 토픽 페이지 소개글 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title_ko, where_cities, companions, styles } = body

    // 유효성 검증
    if (!title_ko || !title_ko.trim()) {
      return NextResponse.json(
        { success: false, error: '제목은 필수입니다.' },
        { status: 400 }
      )
    }

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 프롬프트 생성
    const systemPrompt = `당신은 호텔 예약 사이트의 전문 콘텐츠 작가입니다. 
주어진 토픽 페이지 정보를 바탕으로 매력적이고 SEO에 최적화된 소개글을 작성해주세요.

**중요 지침:**
1. 고객에게 직접 말하는 듯한 친근한 어투 사용 (존댓말)
2. 구체적인 여행 상황과 니즈를 언급하여 공감대 형성
3. 해당 토픽의 매력과 특징을 자연스럽게 설명
4. 200-300자 분량의 간결하면서도 감성적인 소개글
5. 마크다운 형식 사용 가능 (볼드, 이탤릭 등)

**작성 스타일:**
- 첫 문장: 독자의 상황이나 니즈 공감
- 중간: 토픽의 특징과 매력 소개
- 마지막: 행동을 유도하는 부드러운 제안`

    const userPrompt = `토픽 페이지 정보:
- 제목: ${title_ko}
${where_cities && where_cities.length > 0 ? `- 도시: ${where_cities.join(', ')}` : ''}
${companions && companions.length > 0 ? `- 동행인: ${companions.join(', ')}` : ''}
${styles && styles.length > 0 ? `- 스타일: ${styles.join(', ')}` : ''}

위 정보를 바탕으로 토픽 페이지 소개글을 작성해주세요.`

    // OpenAI API 호출
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODELS.GPT_4O,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API 오류:', errorData)
      return NextResponse.json(
        { success: false, error: `OpenAI API 호출 실패: ${errorData.error?.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    const aiResult = await openaiResponse.json()
    const generatedIntro = aiResult.choices?.[0]?.message?.content?.trim()

    if (!generatedIntro) {
      return NextResponse.json(
        { success: false, error: 'AI가 소개글을 생성하지 못했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        intro_rich_ko: generatedIntro,
      },
    })
  } catch (error) {
    console.error('소개글 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

