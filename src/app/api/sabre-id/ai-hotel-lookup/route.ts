import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI } from '@/config/openai'

export const runtime = 'nodejs'
export const maxDuration = 90

interface AiHotelLookupRequest {
  hotelName: string
}

export interface AiHotelLookupResult {
  sabreId: string
  propertyNameKo: string
  propertyNameEn: string
  city: string
  country: string
  addressEn: string
  brandName: string
  chainName: string
}

interface AiHotelLookupResponse {
  success: boolean
  data?: AiHotelLookupResult
  error?: string
}

/**
 * Sabre Hotel Code 조회 (웹 검색 + 모델 지식 활용)
 */
const SABRE_ID_SYSTEM_PROMPT = `You are a GDS (Global Distribution System) and hotel industry expert.
Search the web and use your knowledge to find the Sabre GDS Hotel Code for the given hotel.
Provide the Sabre Hotel Code (numeric identifier only).

Reply with ONLY valid JSON, no other text:
{"sabreId": "123456"}

- sabreId: The Sabre Hotel Code as a string of digits (e.g. "167300", "313016")
- If you cannot find the code, use empty string: {"sabreId": ""}`

/**
 * 주소·브랜드 등은 공개 웹에서 찾을 수 있으므로 웹 검색 활용.
 * propertyNameKo는 별도 호출로 영문명에 매칭되는 한글명 추출.
 */
const WEB_DETAILS_SYSTEM_PROMPT = `당신은 호텔 정보 전문가입니다.
웹 검색을 통해 사용자가 입력한 호텔명에 해당하는 정보를 조사하여 JSON 형식으로 응답하세요.

필수 응답 필드 (모두 문자열, 없으면 빈 문자열 ""):
- propertyNameEn: 영문 호텔명 (공식 영문명)
- city: 호텔 위치 도시
- country: 국가
- addressEn: 영문 주소 (전체 주소)
- brandName: 브랜드명 (예: LVMH, Marriott, Hyatt)
- chainName: 소속 체인명 (예: LVMH Hotel Management)

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.
{
  "propertyNameEn": "",
  "city": "",
  "country": "",
  "addressEn": "",
  "brandName": "",
  "chainName": ""
}`

/**
 * 웹 검색으로 영문 호텔명에 매칭되는 공식 한글 호텔명 추출
 */
const KOREAN_NAME_SYSTEM_PROMPT = `당신은 호텔 정보 전문가입니다.
웹 검색을 통해 주어진 영문 호텔명에 해당하는 **공식 한글 호텔명**을 찾아주세요.

규칙:
- 네이버, 한국 관광 사이트, 호텔 공식 사이트 등에서 해당 호텔의 한국어 정식 명칭을 검색하세요.
- 브랜드명은 정확한 한글 표기 사용 (예: Grand Hyatt → 그랜드 하얏트, Marriott → 메리어트)
- 찾지 못하면 빈 문자열 "" 로 응답하세요.
- 추측이나 일반 번역이 아닌, 실제로 사용되는 공식 한글명만 제공하세요.

응답은 반드시 아래 JSON 형식으로만 출력하세요:
{"propertyNameKo": ""}`

function parseJsonFromResponse(text: string): Record<string, string> | null {
  const trimmed = text.trim()
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const toParse = jsonBlock ? jsonBlock[1].trim() : trimmed
  try {
    return JSON.parse(toParse) as Record<string, string>
  } catch {
    return null
  }
}

/**
 * JSON 응답에서만 Sabre ID 추출. 텍스트 내 임의의 숫자(연도·전화번호 등)는 사용하지 않음.
 */
function extractSabreIdFromText(text: string): string {
  const parsed = parseJsonFromResponse(text)
  if (parsed?.sabreId != null) {
    const s = String(parsed.sabreId).trim()
    if (/^\d+$/.test(s)) return s
  }
  return ''
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

    // 1) Sabre ID: 웹 검색 포함하여 조회 (빈 응답 시 웹검색 없이 재시도)
    const sabreIdUserMessage = `What is the Sabre GDS Hotel Code for: "${hotelName}"? Search the web and use your knowledge. Reply with JSON only.`
    let sabreIdResponse: { content: string }
    try {
      sabreIdResponse = await callOpenAI({
        apiKey,
        systemMessage: SABRE_ID_SYSTEM_PROMPT,
        userMessage: sabreIdUserMessage,
        config: { temperature: 0.2, maxTokens: 256 },
        enableWebSearch: true,
      })
    } catch (firstErr) {
      const isEmptyErr = firstErr instanceof Error && firstErr.message.includes('비어있습니다')
      if (isEmptyErr) {
        sabreIdResponse = await callOpenAI({
          apiKey,
          systemMessage: SABRE_ID_SYSTEM_PROMPT,
          userMessage: sabreIdUserMessage,
          config: { temperature: 0.2, maxTokens: 256 },
          enableWebSearch: false,
        })
      } else {
        throw firstErr
      }
    }
    const sabreId = extractSabreIdFromText((sabreIdResponse.content ?? '').trim())

    // 2) 나머지 필드: 웹 검색으로 조회 (빈 응답 시 웹검색 없이 재시도)
    const detailsUserMessage = `다음 호텔에 대한 정보를 웹 검색으로 조사하여 JSON 형식으로 응답해주세요: "${hotelName}"`
    let detailsResponse: { content: string }
    try {
      detailsResponse = await callOpenAI({
        apiKey,
        systemMessage: WEB_DETAILS_SYSTEM_PROMPT,
        userMessage: detailsUserMessage,
        config: { temperature: 0.3, maxTokens: 1024 },
        enableWebSearch: true,
      })
    } catch (detailsErr) {
      const isEmptyErr = detailsErr instanceof Error && detailsErr.message.includes('비어있습니다')
      if (isEmptyErr) {
        detailsResponse = await callOpenAI({
          apiKey,
          systemMessage: WEB_DETAILS_SYSTEM_PROMPT,
          userMessage: detailsUserMessage,
          config: { temperature: 0.3, maxTokens: 1024 },
          enableWebSearch: false,
        })
      } else {
        throw detailsErr
      }
    }

    const detailsParsed = parseJsonFromResponse((detailsResponse.content ?? '').trim())
    const d = detailsParsed ?? {}
    const propertyNameEn = String(d.propertyNameEn ?? '').trim() || hotelName

    // 3) 한글 호텔명: 웹 검색으로 영문명에 매칭되는 공식 한글명 추출
    let propertyNameKo = ''
    if (propertyNameEn) {
      const koUserMessage = `다음 영문 호텔명에 해당하는 공식 한글 호텔명을 웹 검색으로 찾아주세요: "${propertyNameEn}"`
      try {
        const koResponse = await callOpenAI({
          apiKey,
          systemMessage: KOREAN_NAME_SYSTEM_PROMPT,
          userMessage: koUserMessage,
          config: { temperature: 0.2, maxTokens: 256 },
          enableWebSearch: true,
        })
        const koParsed = parseJsonFromResponse((koResponse.content ?? '').trim())
        propertyNameKo = String(koParsed?.propertyNameKo ?? '').trim()
      } catch {
        // 빈 응답 등 오류 시 무시
      }
      if (!propertyNameKo) {
        try {
          const koRetry = await callOpenAI({
            apiKey,
            systemMessage: KOREAN_NAME_SYSTEM_PROMPT,
            userMessage: koUserMessage,
            config: { temperature: 0.2, maxTokens: 256 },
            enableWebSearch: false,
          })
          const koParsedRetry = parseJsonFromResponse((koRetry.content ?? '').trim())
          propertyNameKo = String(koParsedRetry?.propertyNameKo ?? '').trim()
        } catch {
          // 폴백 실패 시 빈 문자열 유지
        }
      }
    }

    const data: AiHotelLookupResult = {
      sabreId,
      propertyNameKo: propertyNameKo || hotelName,
      propertyNameEn,
      city: String(d.city ?? ''),
      country: String(d.country ?? ''),
      addressEn: String(d.addressEn ?? ''),
      brandName: String(d.brandName ?? ''),
      chainName: String(d.chainName ?? ''),
    }

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
