import { NextRequest, NextResponse } from 'next/server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type UpdateItem = {
  sabreId: string
  htlMasterId: string
}

type UpdateResultItem = {
  sabreId: string
  success: boolean
  updatedParagonId?: string | null
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items?: UpdateItem[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 목록(items)이 필요합니다.' },
        { status: 400 },
      )
    }

    const supabase = createServiceRoleClient()
    const results: UpdateResultItem[] = []
    let successCount = 0
    let failedCount = 0

    const parseBigint = (v: string): number | null => {
      const s = String(v).trim()
      if (!s || !/^-?\d+$/.test(s)) return null
      const n = parseInt(s, 10)
      return Number.isNaN(n) ? null : n
    }

    for (const item of items) {
      const sabreIdRaw = String(item?.sabreId ?? '').trim()
      const htlMasterId = item?.htlMasterId != null ? String(item.htlMasterId).trim() : ''

      if (!sabreIdRaw) {
        results.push({ sabreId: '(빈값)', success: false, error: 'Sabre ID가 비어 있습니다.' })
        failedCount++
        continue
      }

      const sabreIdNum = parseBigint(sabreIdRaw)
      if (sabreIdNum == null) {
        results.push({ sabreId: sabreIdRaw, success: false, error: 'Sabre ID는 숫자 형태여야 합니다.' })
        failedCount++
        continue
      }

      let paragonIdToSet: number | null = null
      if (htlMasterId !== '') {
        const parsed = parseBigint(htlMasterId)
        if (parsed == null) {
          results.push({
            sabreId: sabreIdRaw,
            success: false,
            error: `Paragon ID(htlMasterId)는 숫자 형태여야 합니다: "${htlMasterId}"`,
          })
          failedCount++
          continue
        }
        paragonIdToSet = parsed
      }

      const { data, error } = await supabase
        .from('select_hotels')
        .update({ paragon_id: paragonIdToSet })
        .eq('sabre_id', sabreIdNum)
        .select('sabre_id, paragon_id')
        .maybeSingle()

      if (error) {
        results.push({
          sabreId: sabreIdRaw,
          success: false,
          error: error.message ?? '업데이트 실패',
        })
        failedCount++
        continue
      }

      if (!data) {
        results.push({ sabreId: sabreIdRaw, success: false, error: '업데이트 대상 호텔이 DB에 없습니다.' })
        failedCount++
        continue
      }

      results.push({
        sabreId: sabreIdRaw,
        success: true,
        updatedParagonId: data.paragon_id != null ? String(data.paragon_id) : null,
      })
      successCount++
    }

    const responseData = {
      successCount,
      failedCount,
      results,
    }
    console.log('[paragon-id-update] 구글시트 Paragon ID to Select DB Paragon ID 업데이트 결과:', responseData)
    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error('[sabre-id/paragon-id-update] unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Paragon ID 업데이트 중 오류가 발생했습니다.',
      },
      { status: 500 },
    )
  }
}
