/**
 * 구글 시트 Chain 셀 값 → select_hotels.rate_plan_code 매핑
 * "선택 시설 일괄 기초 데이터 등록" 시 해당 Chain이면 rate_plan_code를 함께 저장
 *
 * rate_plan_code는 콤마 구분 문자열로 저장 (예: "ZP3,API,VMC")
 */
export const CHAIN_TO_RATE_PLAN_CODE: Record<string, string> = {
  VIRTUOSO: 'ZP3,API,VMC',
  'Shangri-la Circle': 'TLC',
  IHG: 'LX8',
  Hilton: 'WMP',
  'LHW VITA': 'V8A',
  Prefered: 'PUF',
  'MO FAN': 'FAN',
  ACCOR: 'STP',
  SLH: 'W9E',
  'DESIGN HOTELS': 'QAY,CDH',
  'THE HARI': 'HPM',
  MELIAPRO: 'XMH',
  'PAN PACIFIC': 'PPR',
}

/**
 * 구글 시트 E열(Chain) 값 → select_hotels.brand_id / brand_id_2 매핑
 * "선택 시설 일괄 기초 데이터 등록" 시 해당 Chain이면 brand_id(또는 시트 내 중복 행일 때 brand_id_2) 저장
 */
export const CHAIN_TO_BRAND_ID: Record<string, number> = {
  VIRTUOSO: 102,
  ACCOR: 111,
  IHG: 124,
  Prefered: 101,
  Hyatt: 125,
  Hilton: 44,
  'MO FAN': 69,
  'Shangri-la Circle': 63,
}

/**
 * Chain 값(trim 후)으로 rate_plan_code 문자열 반환. 매칭 없으면 null
 */
export function getRatePlanCodeForChain(chain: string | null | undefined): string | null {
  if (chain == null) return null
  const key = chain.trim()
  if (!key) return null
  const exact = CHAIN_TO_RATE_PLAN_CODE[key]
  if (exact) return exact
  const upper = CHAIN_TO_RATE_PLAN_CODE[key.toUpperCase()]
  if (upper) return upper
  for (const [k, v] of Object.entries(CHAIN_TO_RATE_PLAN_CODE)) {
    if (k.toUpperCase() === key.toUpperCase()) return v
  }
  return null
}

/**
 * Chain 값(trim 후)으로 brand_id 반환. 매칭 없으면 null
 */
export function getBrandIdForChain(chain: string | null | undefined): number | null {
  if (chain == null) return null
  const key = chain.trim()
  if (!key) return null
  const exact = CHAIN_TO_BRAND_ID[key]
  if (exact != null) return exact
  for (const [k, v] of Object.entries(CHAIN_TO_BRAND_ID)) {
    if (k.toUpperCase() === key.toUpperCase()) return v
  }
  return null
}
