/**
 * 셀렉트x프리비아 상품리스트 시트(Sabre ID B열)를 조회합니다.
 * 우선순위: 1) 서비스 계정 2) API 키 3) tourvis.com (행 제한 있음)
 */

import path from 'path'
import { GoogleAuth } from 'google-auth-library'

const SPREADSHEET_ID = '1X_kFUoRbvY1SIv2Vv8dzzgGa51qbt91DdGgua8Q8I54'
const SHEET_RANGE = 'sabre_api_hotel_list!B2:F'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const SERVICE_ACCOUNT_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'src/config/google-service-account.json')

const TOURVIS_SHEET_BASE_URL = 'https://tourvis.com/api/marketing-sheet'
const TOURVIS_BEARER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTc1MzcxMjA0MH0.45DHPN-znaNP-R2FFZJma2M6sTaXxH7GTxjqbEkmqN0'

/** tourvis fallback: 행 수 제한 시 청크 단위 요청 */
const TOURVIS_ROWS_PER_REQUEST = 10
const TOURVIS_MAX_SHEET_ROWS = 100000

let hasWarnedTourvisFallback = false

type TabularValues = Array<Array<string | number | null | undefined>>

const toCleanString = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : String(value)
  }
  return String(value).trim()
}

/** 시트 행: B=Sabre ID, C=Paragon ID, D=Hotel name, E=Chain(영문), F=Rate Plan Code */
export type SabreSheetRow = {
  sabreId: string
  paragonId: string
  hotelName: string
  chain: string
  ratePlanCode: string
}

/** 첫 셀(B열)이 숫자만 있으면 데이터 행, 아니면 헤더로 간주 */
function isHeaderRow(row: TabularValues[number]): boolean {
  const first = toCleanString(row?.[0])
  return first.length > 0 && /^\d+$/.test(first) === false
}

/** 시트 범위가 B2:F부터이면 응답에 헤더 없음(인덱스 0부터 데이터). B:F 전체이면 0=헤더, 1부터 데이터. */
const extractOrderedRows = (rows: TabularValues): SabreSheetRow[] => {
  const result: SabreSheetRow[] = []
  const startIndex = rows.length > 0 && isHeaderRow(rows[0]) ? 1 : 0
  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue
    const sabreId = toCleanString(row[0]).trim()
    if (!sabreId) continue
    result.push({
      sabreId,
      paragonId: toCleanString(row[1]),
      hotelName: toCleanString(row[2]),
      chain: toCleanString(row[3]),
      ratePlanCode: toCleanString(row[4]),
    })
  }
  return result
}

/** tourvis API 응답에서 행 배열 추출 (values / data / 배열 직접 등) */
function getRowsFromResponse(data: unknown): TabularValues {
  if (Array.isArray(data)) return data as TabularValues
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  if (Array.isArray(o.values)) return o.values as TabularValues
  if (Array.isArray(o.data)) return o.data as TabularValues
  if (o.data && typeof o.data === 'object' && Array.isArray((o.data as Record<string, unknown>).values)) {
    return (o.data as Record<string, unknown>).values as TabularValues
  }
  return []
}

/** 서비스 계정으로 Google Sheets API v4 전체 시트 조회 */
async function fetchFromServiceAccount(): Promise<TabularValues> {
  const fs = await import('fs/promises')
  try {
    const credentialsJson =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
      (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64
        ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
        : '') ||
      (await fs.readFile(SERVICE_ACCOUNT_PATH, 'utf-8'))

    const credentials = JSON.parse(credentialsJson) as { client_email?: string; private_key?: string }
    if (!credentials.client_email || !credentials.private_key) return []

    const auth = new GoogleAuth({ credentials, scopes: [SHEETS_SCOPE] })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    if (!token.token) return []

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = (await res.json()) as { values?: unknown[] }
    const values = data?.values
    return Array.isArray(values) ? (values as TabularValues) : []
  } catch {
    return []
  }
}

/** API 키로 Google Sheets API v4 조회 */
async function fetchFromApiKey(): Promise<TabularValues> {
  const apiKey =
    process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY
  if (!apiKey?.trim()) return []

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}?key=${encodeURIComponent(apiKey.trim())}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json()) as { values?: unknown[] }
  const values = data?.values
  return Array.isArray(values) ? (values as TabularValues) : []
}

/** tourvis: 시트 범위 한 청크 요청. 400/404는 시트 범위 밖으로 간주해 빈 배열 반환 */
async function fetchSheetRangeTourvis(startRow: number, endRow: number): Promise<TabularValues> {
  const range = `sabre_api_hotel_list!B${startRow}:F${endRow}`
  const url = `${TOURVIS_SHEET_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOURVIS_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (res.status === 400 || res.status === 404) {
    return []
  }
  if (!res.ok) {
    throw new Error(`시트 API 요청 실패: ${res.status} ${res.statusText} (range: ${range})`)
  }
  const data: unknown = await res.json()
  return getRowsFromResponse(data)
}

/** tourvis: 전체 범위 B2:F 먼저 시도 후, 실패 시 청크 단위 페이지네이션 */
async function fetchFromTourvis(): Promise<TabularValues> {
  const fullRange = `sabre_api_hotel_list!B2:F`
  const url = `${TOURVIS_SHEET_BASE_URL}/${SPREADSHEET_ID}/values/${encodeURIComponent(fullRange)}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOURVIS_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  if (res.ok) {
    const data: unknown = await res.json()
    const rows = getRowsFromResponse(data)
    if (rows.length > 0) return rows
  }
  const allRows: TabularValues = []
  let startRow = 2
  while (startRow <= TOURVIS_MAX_SHEET_ROWS) {
    const endRow = startRow + TOURVIS_ROWS_PER_REQUEST - 1
    const chunk = await fetchSheetRangeTourvis(startRow, endRow)
    if (chunk.length === 0) break
    for (const row of chunk) allRows.push(row)
    if (chunk.length < TOURVIS_ROWS_PER_REQUEST) break
    startRow = endRow + 1
  }
  return allRows
}

export type SabreSheetIdsResult = {
  orderedRows: SabreSheetRow[]
  orderedSabreIds: string[]
  uniqueSabreIds: string[]
}

export async function fetchSabreSheetIds(): Promise<SabreSheetIdsResult> {
  let allRows: TabularValues = await fetchFromServiceAccount()
  if (allRows.length === 0) allRows = await fetchFromApiKey()
  if (allRows.length === 0) {
    if (!hasWarnedTourvisFallback) {
      hasWarnedTourvisFallback = true
      console.warn('[google/sheets] Google Sheets 인증 실패로 tourvis fallback 사용 (행 제한 가능)', {
        hasServiceAccountJson: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()),
        hasServiceAccountBase64: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64),
        hasApiKey: Boolean(process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
        serviceAccountPath: SERVICE_ACCOUNT_PATH,
      })
    }
    allRows = await fetchFromTourvis()
  }

  const orderedRows = extractOrderedRows(allRows)
  const orderedSabreIds = orderedRows.map((r) => r.sabreId.trim())

  const seen = new Set<string>()
  const uniqueSabreIds: string[] = []
  for (const sabreId of orderedSabreIds) {
    if (!sabreId) continue
    if (seen.has(sabreId)) continue
    seen.add(sabreId)
    uniqueSabreIds.push(sabreId)
  }

  return { orderedRows, orderedSabreIds, uniqueSabreIds }
}
