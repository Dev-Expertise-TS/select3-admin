import { NextRequest, NextResponse } from 'next/server'

/**
 * 한글 태그명을 영문 slug로 변환
 */
const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * POST /api/hashtags/generate-slug
 * AI를 사용하여 한글명을 영문 slug로 변환
 */
export async function POST(request: NextRequest) {
  try {
    const { name_ko } = await request.json()

    if (!name_ko) {
      return NextResponse.json(
        { success: false, error: '한글명은 필수입니다.' },
        { status: 400 }
      )
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const systemPrompt = `당신은 한글 해시태그명을 영문 URL slug로 변환하는 전문가입니다.

변환 규칙:
1. 의미를 정확히 전달하는 영문 단어 사용
2. 소문자만 사용
3. 단어 사이는 하이픈(-)으로 연결
4. 특수문자 제거
5. 간결하고 명확하게 (2-3 단어 이내 권장)

예시:
- "럭셔리" → luxury
- "가족 여행" → family-trip
- "인피니티풀" → infinity-pool
- "키즈클럽" → kids-club
- "비즈니스 출장" → business-trip
- "파리" → paris
- "한국" → korea
- "미국" → united-states
- "프랑스 스타일" → french-style

응답 형식: 영문 slug만 작성해주세요 (설명 없이).`

    const userPrompt = `한글 태그명: "${name_ko}"\n\n이 한글 태그명을 영문 URL slug로 변환해주세요.`

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // 낮은 temperature로 일관성 있는 결과
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ OpenAI API 오류:', errorData)
      return NextResponse.json(
        { success: false, error: `OpenAI API 호출 실패: ${errorData.error?.message || '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

    const result = await response.json()
    const generatedSlug = result.choices?.[0]?.message?.content?.trim()

    if (!generatedSlug) {
      return NextResponse.json(
        { success: false, error: 'AI가 slug를 생성하지 못했습니다.' },
        { status: 500 }
      )
    }

    // slugify 처리 (소문자, 하이픈만 남김)
    const cleanSlug = slugify(generatedSlug)

    return NextResponse.json({
      success: true,
      data: {
        slug: cleanSlug,
      },
    })
  } catch (error) {
    console.error('❌ Slug 생성 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Slug 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

