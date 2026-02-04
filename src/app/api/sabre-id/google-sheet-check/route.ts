import { NextResponse } from 'next/server'

import { fetchSabreSheetIds, type SabreSheetRow } from '@/lib/google/sheets'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SelectHotelRow = {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
}

type SheetEntry = {
  sabreId: string
  paragonId: string
  hotelName: string
  chain: string
  exists: boolean
  propertyNameKo: string | null
  propertyNameEn: string | null
}

const chunkArray = <T,>(items: T[], chunkSize: number): T[][] => {
  if (chunkSize <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

export async function POST() {
  try {
    const { orderedRows, orderedSabreIds, uniqueSabreIds } = await fetchSabreSheetIds()

    if (orderedSabreIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '시트에서 Sabre ID를 찾지 못했습니다.' },
        { status: 404 },
      )
    }

    const supabase = createServiceRoleClient()
    const matchMap = new Map<string, SelectHotelRow>()

    const CHUNK_SIZE = 500
    const chunks = chunkArray(uniqueSabreIds, CHUNK_SIZE)

    for (const chunk of chunks) {
      if (chunk.length === 0) continue

      const { data, error } = await supabase
        .from('select_hotels')
        .select('sabre_id, property_name_ko, property_name_en')
        .in('sabre_id', chunk)

      if (error) {
        console.error('[sabre-id/google-sheet-check] select_hotels error:', error)
        return NextResponse.json(
          { success: false, error: `select_hotels 조회 실패: ${error.message}` },
          { status: 500 },
        )
      }

      data?.forEach((row) => {
        if (row?.sabre_id) {
          matchMap.set(row.sabre_id, row as SelectHotelRow)
        }
      })
    }

    const rowBySabreId = new Map<string, SabreSheetRow>()
    for (const row of orderedRows) {
      rowBySabreId.set(row.sabreId, row)
    }

    const entries: SheetEntry[] = orderedSabreIds.map((sabreId) => {
      const match = matchMap.get(sabreId)
      const sheetRow = rowBySabreId.get(sabreId)
      return {
        sabreId,
        paragonId: sheetRow?.paragonId ?? '',
        hotelName: sheetRow?.hotelName ?? '',
        chain: sheetRow?.chain ?? '',
        exists: Boolean(match),
        propertyNameKo: (match?.property_name_ko as string | null) ?? null,
        propertyNameEn: (match?.property_name_en as string | null) ?? null,
      }
    })

    const missingSabreIds = Array.from(
      new Set(entries.filter((entry) => !entry.exists).map((entry) => entry.sabreId)),
    )
    const matchedCount = entries.length - missingSabreIds.length
    const duplicateCount = Math.max(entries.length - uniqueSabreIds.length, 0)

    return NextResponse.json({
      success: true,
      data: {
        sheetRowCount: entries.length,
        uniqueSabreIdCount: uniqueSabreIds.length,
        matchedCount,
        missingCount: missingSabreIds.length,
        duplicateCount,
        missingSabreIds,
        entries,
      },
    })
  } catch (error) {
    console.error('[sabre-id/google-sheet-check] unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '구글 시트 체크 중 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
