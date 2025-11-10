import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/hashtags/generate-description
 * AI를 사용하여 태그 설명 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { category_name, tag_name_ko } = await request.json()

    if (!tag_name_ko) {
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

    const systemPrompt = `당신은 호텔 예약 사이트의 해시태그 설명을 작성하는 전문가입니다.
주어진 카테고리와 태그명을 바탕으로 간결하고 명확한 설명을 작성해주세요.

작성 지침:
1. 2-3문장으로 간결하게 작성
2. 고객이 이 태그로 어떤 호텔을 찾을 수 있는지 명확히 설명
3. 존댓말 사용
4. 자연스러운 한국어로 작성
5. 마케팅 문구보다는 실용적인 정보 제공

예시:
- "럭셔리": 최상급 서비스와 시설을 갖춘 프리미엄 호텔입니다. 완벽한 휴식과 품격 있는 경험을 원하시는 분들께 추천합니다.
- "키즈풀": 어린이 전용 수영장을 갖춘 호텔입니다. 안전하고 즐거운 물놀이 시설이 마련되어 있습니다.
- "파리": 프랑스 파리에 위치한 호텔입니다. 에펠탑, 루브르 박물관 등 주요 관광지 접근이 편리합니다.`

    const userPrompt = category_name
      ? `카테고리: ${category_name}\n태그: ${tag_name_ko}\n\n이 태그에 대한 설명을 작성해주세요.`
      : `태그: ${tag_name_ko}\n\n이 태그에 대한 설명을 작성해주세요.`

    // OpenAI API 호출 (fetch 사용)
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
        temperature: 0.7,
        max_tokens: 300,
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
    const description = result.choices?.[0]?.message?.content?.trim()

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'AI가 설명을 생성하지 못했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        description_ko: description,
      },
    })
  } catch (error) {
    console.error('❌ 태그 설명 생성 오류:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '태그 설명 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}


