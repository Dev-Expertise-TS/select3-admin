// Lightweight, extendable mapping tables for codes.
// NOTE: This is a best-effort seed. Extend over time for better coverage.

export const CITY_SLUG_TO_IATA_CITY_CODE: Record<string, string> = {
  // Thailand
  bangkok: 'BKK',
  huaHin: 'HHQ',
  'hua-hin': 'HHQ',
  // Indonesia (Bali region)
  denpasar: 'DPS',
  gianyar: 'DPS',
  ungasan: 'DPS',
  nusaDua: 'DPS',
  'nusa-dua': 'DPS',
  // Vietnam
  hanoi: 'HAN',
  sapa: 'HAN',
  'dien-ban': 'DAD',
  danang: 'DAD',
  daNang: 'DAD',
  // Japan
  tokyo: 'TYO',
  osaka: 'OSA',
  kyoto: 'UKY',
  // Singapore
  singapore: 'SIN',
  // Hong Kong
  'hong-kong': 'HKG',
  hongkong: 'HKG',
}

export const COUNTRY_SLUG_TO_ISO2: Record<string, string> = {
  thailand: 'TH',
  japan: 'JP',
  korea: 'KR',
  'south-korea': 'KR',
  vietnam: 'VN',
  indonesia: 'ID',
  singapore: 'SG',
  'hong-kong': 'HK',
  france: 'FR',
  'united-kingdom': 'GB',
  'united-states': 'US',
}

export const CONTINENT_SLUG_TO_CODE: Record<string, string> = {
  asia: 'AS',
  europe: 'EU',
  africa: 'AF',
  oceania: 'OC',
  'north-america': 'NA',
  'south-america': 'SA',
}


