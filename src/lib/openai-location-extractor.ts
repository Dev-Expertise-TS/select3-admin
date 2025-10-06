/**
 * OpenAI API를 사용하여 호텔 주소에서 위치 정보를 추출하는 유틸리티
 */

export interface LocationInfo {
  city_ko: string
  city_en: string
  country_ko: string
  country_en: string
  continent_ko: string
  continent_en: string
}

const SYSTEM_PROMPT = `당신은 호텔 주소에서 위치 정보를 추출하는 전문가입니다. 
주소를 분석하여 다음 정보를 JSON 형식으로 반환하세요:
- city_ko: 도시명 (한글)
- city_en: 도시명 (영문)
- country_ko: 국가명 (한글)
- country_en: 국가명 (영문)
- continent_ko: 대륙명 (한글) - 아시아, 유럽, 북아메리카, 남아메리카, 아프리카, 오세아니아, 남극 중 하나
- continent_en: 대륙명 (영문) - Asia, Europe, North America, South America, Africa, Oceania, Antarctica 중 하나

일관성 있는 표준 명칭을 사용하세요.
예: 서울 -> 도시: "서울" / "Seoul", 국가: "대한민국" / "South Korea", 대륙: "아시아" / "Asia"
예: 도쿄 -> 도시: "도쿄" / "Tokyo", 국가: "일본" / "Japan", 대륙: "아시아" / "Asia"
예: 파리 -> 도시: "파리" / "Paris", 국가: "프랑스" / "France", 대륙: "유럽" / "Europe"

반드시 JSON만 반환하세요. 추가 설명 없이.`

/**
 * 마크다운 코드 블록 제거 (```json ... ``` 형식)
 */
function cleanJsonMarkdown(content: string): string {
  let cleaned = content.trim()
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```json?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()
  }
  
  return cleaned
}

/**
 * OpenAI API를 사용하여 주소에서 위치 정보 추출
 */
export async function extractLocationFromAddress(address: string): Promise<LocationInfo | null> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY가 설정되지 않았습니다')
    return null
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `다음 호텔 주소에서 위치 정보를 추출하세요:\n\n${address}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API 오류:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      console.error('OpenAI 응답에 content가 없습니다')
      return null
    }

    // JSON 파싱 (마크다운 코드 블록 제거)
    const jsonContent = cleanJsonMarkdown(content)
    const result = JSON.parse(jsonContent)

    return {
      city_ko: result.city_ko || '',
      city_en: result.city_en || '',
      country_ko: result.country_ko || '',
      country_en: result.country_en || '',
      continent_ko: result.continent_ko || '',
      continent_en: result.continent_en || ''
    }
  } catch (error) {
    console.error('위치 정보 추출 오류:', error)
    return null
  }
}


