/**
 * 셀렉트x프리비아 상품리스트 시트(Sabre ID B열)를 tourvis.com API로 조회합니다.
 * 설정은 코드 내 상수로 관리합니다.
 */

const TOURVIS_SHEET_BASE_URL = 'https://tourvis.com/api/marketing-sheet'
const TOURVIS_SPREADSHEET_ID = '1X_kFUoRbvY1SIv2Vv8dzzgGa51qbt91DdGgua8Q8I54'
const TOURVIS_SHEET_RANGE = 'sabre_api_hotel_list!B:F'
const TOURVIS_BEARER_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTc1MzcxMjA0MH0.45DHPN-znaNP-R2FFZJma2M6sTaXxH7GTxjqbEkmqN0'

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

/** B열은 2번째 행(인덱스 1)부터 Sabre ID. 1번째 행(인덱스 0)은 헤더로 건너뜀. E열=Chain, F열=Rate Plan Code */
const extractOrderedRows = (rows: TabularValues): SabreSheetRow[] => {
  const result: SabreSheetRow[] = []
  for (let i = 1; i < rows.length; i++) {
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

export type SabreSheetIdsResult = {
  orderedRows: SabreSheetRow[]
  orderedSabreIds: string[]
  uniqueSabreIds: string[]
}

export async function fetchSabreSheetIds(): Promise<SabreSheetIdsResult> {
  const url = `${TOURVIS_SHEET_BASE_URL}/${TOURVIS_SPREADSHEET_ID}/values/${encodeURIComponent(TOURVIS_SHEET_RANGE)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOURVIS_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`시트 API 요청 실패: ${res.status} ${res.statusText}`)
  }

  const data: unknown = await res.json()
  const rows: TabularValues = getRowsFromResponse(data)

  const orderedRows = extractOrderedRows(rows)
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
