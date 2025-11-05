import { normalizeSlug } from '@/lib/media-naming'
import { CITY_SLUG_TO_IATA_CITY_CODE, COUNTRY_SLUG_TO_ISO2, CONTINENT_SLUG_TO_CODE } from './iata-maps'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

export function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function toSlugLower(s: string | null | undefined) {
  if (!s) return ''
  return normalizeSlug(String(s)).toLowerCase()
}

export function guessIataCityCode(cityEnOrKo: string): string | null {
  const bySlug = toSlugLower(cityEnOrKo)
  if (CITY_SLUG_TO_IATA_CITY_CODE[bySlug]) return CITY_SLUG_TO_IATA_CITY_CODE[bySlug]
  // heuristic: remove spaces to catch older mapping
  const compact = bySlug.replace(/-/g, '')
  if (CITY_SLUG_TO_IATA_CITY_CODE[compact]) return CITY_SLUG_TO_IATA_CITY_CODE[compact]
  return null
}

export function guessIsoCountryCode(countryEnOrKo: string): string | null {
  const slug = toSlugLower(countryEnOrKo)
  if (COUNTRY_SLUG_TO_ISO2[slug]) return COUNTRY_SLUG_TO_ISO2[slug]
  return null
}

export function guessContinentCode(continentEnOrKo: string): string | null {
  const slug = toSlugLower(continentEnOrKo)
  if (CONTINENT_SLUG_TO_CODE[slug]) return CONTINENT_SLUG_TO_CODE[slug]
  return null
}

export function eqOrIsNull<T extends { eq: (col: string, val: unknown) => T; is: (col: string, val: null) => T }>(
  q: T,
  column: string,
  value: unknown
): T {
  if (value === null || value === undefined) {
    return q.is(column, null)
  }
  return q.eq(column, value)
}

// Enhanced IATA city code mapping (most common cities)
export const KNOWN_IATA_CODES: Record<string, string> = {
  'bangkok': 'BKK',
  'singapore': 'SIN',
  'seoul': 'SEL',
  'busan': 'PUS',
  'tokyo': 'TYO',
  'osaka': 'OSA',
  'hong kong': 'HKG',
  'taipei': 'TPE',
  'shanghai': 'SHA',
  'beijing': 'BJS',
  'london': 'LON',
  'paris': 'PAR',
  'new york': 'NYC',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  'chicago': 'CHI',
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'dubai': 'DXB',
  'mumbai': 'BOM',
  'delhi': 'DEL',
  'rome': 'ROM',
  'barcelona': 'BCN',
  'madrid': 'MAD',
  'amsterdam': 'AMS',
  'berlin': 'BER',
  'frankfurt': 'FRA',
  'munich': 'MUC',
  'vienna': 'VIE',
  'zurich': 'ZRH',
  'istanbul': 'IST',
  'moscow': 'MOW',
  'st petersburg': 'LED',
  'prague': 'PRG',
  'budapest': 'BUD',
  'warsaw': 'WAW',
  'lisbon': 'LIS',
  'athens': 'ATH',
  'copenhagen': 'CPH',
  'stockholm': 'STO',
  'oslo': 'OSL',
  'helsinki': 'HEL',
  'brussels': 'BRU',
  'dublin': 'DUB',
  'edinburgh': 'EDI',
  'manchester': 'MAN',
  'milan': 'MIL',
  'venice': 'VCE',
  'florence': 'FLR',
  'naples': 'NAP',
  'toronto': 'YTO',
  'vancouver': 'YVR',
  'montreal': 'YMQ',
  'mexico city': 'MEX',
  'cancun': 'CUN',
  'rio de janeiro': 'RIO',
  'sao paulo': 'SAO',
  'buenos aires': 'BUE',
  'lima': 'LIM',
  'santiago': 'SCL',
  'bogota': 'BOG',
  'cairo': 'CAI',
  'johannesburg': 'JNB',
  'cape town': 'CPT',
  'doha': 'DOH',
  'abu dhabi': 'AUH',
  'riyadh': 'RUH',
  'jeddah': 'JED',
  'kuala lumpur': 'KUL',
  'jakarta': 'JKT',
  'manila': 'MNL',
  'ho chi minh': 'SGN',
  'hanoi': 'HAN',
  'phuket': 'HKT',
  'bali': 'DPS',
  'jeju': 'CJU',
  'fukuoka': 'FUK',
  'sapporo': 'SPK',
  'kyoto': 'UKY',
  'nara': 'NAR',
  'okinawa': 'OKA',
  'macau': 'MFM',
  'shenzhen': 'SZX',
  'guangzhou': 'CAN',
  'chengdu': 'CTU',
  'xian': 'XIY',
  'hangzhou': 'HGH',
  'nanjing': 'NKG',
  'qingdao': 'TAO',
  'dalian': 'DLC',
  'shenyang': 'SHE',
  'harbin': 'HRB',
  'kunming': 'KMG',
  'guilin': 'KWL',
  'xiamen': 'XMN',
  'chongqing': 'CKG',
}

