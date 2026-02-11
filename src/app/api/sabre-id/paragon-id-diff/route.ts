import { NextResponse } from 'next/server'

import { fetchSabreSheetIds } from '@/lib/google/sheets'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SelectHotelRow = {
  sabre_id: string
  paragon_id: string | null
  property_name_ko: string | null
  property_name_en: string | null
}

export type ParagonDiffEntry = {
  sabreId: string
  sheetHtlMasterId: string
  dbParagonId: string | null
  hotelName: string
  chain: string
  propertyNameKo: string | null
  propertyNameEn: string | null
  /** paragon_id 불일치로 업데이트 필요 여부 */
  needsUpdate?: boolean
}

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

const isValidBigintString = (s: string): boolean =>
  /^-?\d+$/.test(String(s).trim()) && s.trim() !== ''

/** 시트/DB 값 비교: 빈 값 통일, 숫자는 앞의 0 제거 후 비교 (12345 vs "012345" 동일 처리) */
function paragonValuesEqual(
  sheetVal: string | number | null | undefined,
  dbVal: string | number | null | undefined,
): boolean {
  const s = (v: string | number | null | undefined): string =>
    v == null || String(v).trim() === '' ? '' : String(v).trim()
  const a = s(sheetVal)
  const b = s(dbVal)
  if (a === b) return true
  if (a === '' || b === '') return false
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true
  return false
}

export async function GET() {
  try {
    const { orderedRows, uniqueSabreIds } = await fetchSabreSheetIds()

    if (orderedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '시트에서 Sabre ID를 찾지 못했습니다.' },
        { status: 404 },
      )
    }

    const supabase = createServiceRoleClient()
    const hotelMap = new Map<string, SelectHotelRow>()
    const CHUNK_SIZE = 500
    const chunks = chunkArray(uniqueSabreIds, CHUNK_SIZE)

    for (const chunk of chunks) {
      if (chunk.length === 0) continue
      const normalizedChunk = chunk
        .map((id) => String(id).trim())
        .filter(Boolean)
        .filter(isValidBigintString)
      if (normalizedChunk.length === 0) continue

      const { data, error } = await supabase
        .from('select_hotels')
        .select('sabre_id, paragon_id, property_name_ko, property_name_en')
        .in('sabre_id', normalizedChunk)

      if (error) {
        console.error('[sabre-id/paragon-id-diff] select_hotels error:', error)
        return NextResponse.json(
          { success: false, error: `select_hotels 조회 실패: ${error.message}` },
          { status: 500 },
        )
      }

      data?.forEach((row) => {
        if (row?.sabre_id != null && row.sabre_id !== '') {
          const key = String(row.sabre_id).trim()
          hotelMap.set(key, row as SelectHotelRow)
        }
      })
    }

    const allMatchedEntries: ParagonDiffEntry[] = []
    for (const row of orderedRows) {
      const normalizedSabreId = String(row.sabreId).trim()
      const dbRow = hotelMap.get(normalizedSabreId)
      if (!dbRow) continue
      const needsUpdate = !paragonValuesEqual(row.paragonId, dbRow.paragon_id)
      allMatchedEntries.push({
        sabreId: row.sabreId,
        sheetHtlMasterId: row.paragonId ?? '',
        dbParagonId: dbRow.paragon_id,
        hotelName: row.hotelName ?? '',
        chain: row.chain ?? '',
        propertyNameKo: dbRow.property_name_ko,
        propertyNameEn: dbRow.property_name_en,
        needsUpdate,
      })
    }

    const diffEntries = allMatchedEntries.filter((e) => e.needsUpdate)

    return NextResponse.json({
      success: true,
      data: {
        entries: allMatchedEntries,
        count: allMatchedEntries.length,
        diffCount: diffEntries.length,
      },
      meta: {
        sheetRowCount: orderedRows.length,
        uniqueSabreIdCount: uniqueSabreIds.length,
        dbMatchedCount: hotelMap.size,
      },
    })
  } catch (error) {
    console.error('[sabre-id/paragon-id-diff] unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Paragon ID 차이 조회 중 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
