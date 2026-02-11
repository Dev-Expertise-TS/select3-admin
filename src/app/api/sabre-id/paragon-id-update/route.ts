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

    for (const item of items) {
      const sabreId = String(item?.sabreId ?? '').trim()
      const htlMasterId = item?.htlMasterId != null ? String(item.htlMasterId).trim() : ''

      if (!sabreId) {
        results.push({ sabreId: '(빈값)', success: false, error: 'Sabre ID가 비어 있습니다.' })
        failedCount++
        continue
      }

      const paragonIdToSet = htlMasterId === '' ? null : htlMasterId

      const { error } = await supabase
        .from('select_hotels')
        .update({ paragon_id: paragonIdToSet })
        .eq('sabre_id', sabreId)
        .select()
        .single()

      if (error) {
        results.push({
          sabreId,
          success: false,
          error: error.message ?? '업데이트 실패',
        })
        failedCount++
        continue
      }

      results.push({ sabreId, success: true })
      successCount++
    }

    return NextResponse.json({
      success: true,
      data: {
        successCount,
        failedCount,
        results,
      },
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
