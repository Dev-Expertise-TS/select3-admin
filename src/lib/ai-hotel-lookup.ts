/**
 * AI 기반 호텔 정보 조회 (Sabre id 및 호텔명 확인과 동일 로직)
 * ai-hotel-lookup API 및 bulk-create에서 공유
 */

import { callOpenAI } from '@/config/openai'

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

const SABRE_ID_SYSTEM_PROMPT = `You are a GDS (Global Distribution System) and hotel industry expert.
Search the web and use your knowledge to find the Sabre GDS Hotel Code for the given hotel.
Provide the Sabre Hotel Code (numeric identifier only).

Reply with ONLY valid JSON, no other text:
{"sabreId": "123456"}

- sabreId: The Sabre Hotel Code as a string of digits (e.g. "167300", "313016")
- If you cannot find the code, use empty string: {"sabreId": ""}`

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

function extractSabreIdFromText(text: string): string {
  const parsed = parseJsonFromResponse(text)
  if (parsed?.sabreId != null) {
    const s = String(parsed.sabreId).trim()
    if (/^\d+$/.test(s)) return s
  }
  return ''
}

/**
 * Sabre id 및 호텔명 확인과 동일한 로직으로 호텔 정보 조회
 * @param apiKey OpenAI API 키
 * @param hotelName 호텔명 (시트 D열 등)
 * @param knownSabreId 이미 알고 있는 Sabre ID (bulk 시 사용, 미제공 시 AI로 조회)
 */
export async function lookupHotelByName(
  apiKey: string,
  hotelName: string,
  knownSabreId?: string | null
): Promise<AiHotelLookupResult> {
  // 1) Sabre ID: knownSabreId가 있으면 스킵, 없으면 AI 조회
  let sabreId = knownSabreId?.trim() ?? ''
  if (!sabreId && hotelName.length >= 2) {
    const sabreIdUserMessage = `What is the Sabre GDS Hotel Code for: "${hotelName}"? Search the web and use your knowledge. Reply with JSON only.`
    try {
      const sabreIdResponse = await callOpenAI({
        apiKey,
        systemMessage: SABRE_ID_SYSTEM_PROMPT,
        userMessage: sabreIdUserMessage,
        config: { temperature: 0.2, maxTokens: 256 },
        enableWebSearch: true,
      })
      sabreId = extractSabreIdFromText((sabreIdResponse.content ?? '').trim())
    } catch (firstErr) {
      const isEmptyErr = firstErr instanceof Error && firstErr.message.includes('비어있습니다')
      if (isEmptyErr) {
        const sabreIdResponse = await callOpenAI({
          apiKey,
          systemMessage: SABRE_ID_SYSTEM_PROMPT,
          userMessage: sabreIdUserMessage,
          config: { temperature: 0.2, maxTokens: 256 },
          enableWebSearch: false,
        })
        sabreId = extractSabreIdFromText((sabreIdResponse.content ?? '').trim())
      } else {
        throw firstErr
      }
    }
  }

  // 2) 나머지 필드: 웹 검색으로 조회
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

  return {
    sabreId,
    propertyNameKo: propertyNameKo || hotelName,
    propertyNameEn,
    city: String(d.city ?? ''),
    country: String(d.country ?? ''),
    addressEn: String(d.addressEn ?? ''),
    brandName: String(d.brandName ?? ''),
    chainName: String(d.chainName ?? ''),
  }
}
