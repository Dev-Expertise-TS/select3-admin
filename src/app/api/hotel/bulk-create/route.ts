import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateHotelSlug, slugWithSuffix } from '@/lib/hotel-slug'
import { getRatePlanCodeForChain, getBrandIdForChain } from '@/config/chain-rate-plan-map'

export const runtime = 'nodejs'
export const maxDuration = 300

type BulkCreateItem = {
  sabreId: string
  hotelName?: string | null
  paragonId?: string | null
  chain?: string | null
}

type BulkCreateResultItem = {
  sabreId: string
  success: boolean
  created?: boolean
  updated?: boolean
  error?: string
}

/** 기존 rate_plan_code에 새 코드를 병합 (중복 제거, 콤마 구분) */
function mergeRatePlanCodes(
  existing: string | null | undefined,
  newCodes: string | null | undefined
): string | null {
  const parse = (s: string | null | undefined): string[] =>
    (s ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  const combined = [...new Set([...parse(existing), ...parse(newCodes)])]
  return combined.length > 0 ? combined.join(',') : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items?: BulkCreateItem[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '등록할 시설 목록(items)이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const results: BulkCreateResultItem[] = []
    let createdCount = 0
    let updatedCount = 0
    let failedCount = 0

    /** 구글 시트 내에서 이미 처리된 sabre_id (같은 배치에서 두 번째 이상 등장 시 brand_id_2 적용) */
    const seenSabreIdsInBatch = new Set<string>()

    const duplicateMessage =
      '동일한 Sabre ID가 이미 존재합니다. 호텔 정보 수정은 호텔 정보 업데이트 메뉴에서 진행해주세요.'

    for (const item of items) {
      const sabreId = String(item?.sabreId ?? '').trim()
      if (!sabreId) {
        results.push({ sabreId: '(빈값)', success: false, error: 'Sabre ID가 비어 있습니다.' })
        failedCount++
        continue
      }

      /** 구글 시트 E열(Chain) 값으로 brand_id 매핑; 시트 내 중복 sabre_id 행이면 brand_id_2로 저장 */
      const isDuplicateSabreInBatch = seenSabreIdsInBatch.has(sabreId)
      const brandIdFromChain = getBrandIdForChain(item?.chain ?? null)

      // 구글 시트에서 전달된 값만 사용하여 select_hotels 필수 컬럼을 생성
      const hotelName = item?.hotelName?.trim() || ''
      const propertyNameEn: string | null = hotelName || null
      const propertyNameKo: string | null = null
      const propertyAddress: string | null = null

      const chainEn = item?.chain?.trim() || null
      const newRatePlanCode = getRatePlanCodeForChain(chainEn)

      const { data: existingHotel, error: checkError } = await supabase
        .from('select_hotels')
        .select('sabre_id, rate_plan_code')
        .eq('sabre_id', sabreId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        results.push({
          sabreId,
          success: false,
          error: '존재 여부 확인 중 오류가 발생했습니다.',
        })
        failedCount++
        continue
      }

      if (existingHotel) {
        const mergedRatePlanCode = mergeRatePlanCodes(
          (existingHotel as { rate_plan_code?: string | null }).rate_plan_code,
          newRatePlanCode
        )
        const updateData: Record<string, unknown> = {}
        if (mergedRatePlanCode != null) {
          updateData.rate_plan_code = mergedRatePlanCode
        }
        if (brandIdFromChain != null) {
          const { data: brandRow } = await supabase
            .from('hotel_brands')
            .select('brand_name_ko, brand_name_en')
            .eq('brand_id', brandIdFromChain)
            .single()
          const brandNameKo = (brandRow as { brand_name_ko?: string | null } | null)?.brand_name_ko ?? null
          const brandNameEn = (brandRow as { brand_name_en?: string | null } | null)?.brand_name_en ?? null

          if (isDuplicateSabreInBatch) {
            updateData.brand_id_2 = brandIdFromChain
            updateData.brand_name_kr_2 = brandNameKo
            updateData.brand_name_en_2 = brandNameEn
          } else {
            updateData.brand_id = brandIdFromChain
            updateData.brand_name_kr = brandNameKo
            updateData.brand_name_en = brandNameEn
          }
        }

        const { error: updateError } = await supabase
          .from('select_hotels')
          .update(updateData)
          .eq('sabre_id', sabreId)
          .select()
          .single()

        if (updateError) {
          results.push({
            sabreId,
            success: false,
            error: '중복 sabre_id 업데이트 실패: rate_plan_code·brand_name_en_2 병합 중 오류가 발생했습니다.',
          })
          failedCount++
          continue
        }

        seenSabreIdsInBatch.add(sabreId)
        results.push({ sabreId, success: true, updated: true })
        updatedCount++
        continue
      }

      const paragonId = item?.paragonId?.trim() || null
      const ratePlanCode = newRatePlanCode

      const slug = generateHotelSlug(propertyNameEn, propertyNameKo, sabreId)
      const insertData: Record<string, unknown> = {
        sabre_id: sabreId,
        paragon_id: paragonId,
        slug,
        property_name_ko: propertyNameKo,
        property_name_en: propertyNameEn,
        property_address: propertyAddress,
        chain_en: chainEn,
        publish: false,
        created_at: new Date().toISOString(),
      }
      if (ratePlanCode != null) {
        insertData.rate_plan_code = ratePlanCode
      }
      if (brandIdFromChain != null && !isDuplicateSabreInBatch) {
        insertData.brand_id = brandIdFromChain
        const { data: brandRow } = await supabase
          .from('hotel_brands')
          .select('brand_name_ko, brand_name_en')
          .eq('brand_id', brandIdFromChain)
          .single()
        const brandNameKo = (brandRow as { brand_name_ko?: string | null } | null)?.brand_name_ko ?? null
        const brandNameEn = (brandRow as { brand_name_en?: string | null } | null)?.brand_name_en ?? null
        insertData.brand_name_kr = brandNameKo
        insertData.brand_name_en = brandNameEn
      }

      let { error: insertError } = await supabase
        .from('select_hotels')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        const err = insertError as { code?: string; message?: string }
        const isUniqueViolation = err.code === '23505'
        const message = (err.message || '').toLowerCase()
        const isSabreIdConflict =
          isUniqueViolation && (message.includes('sabre_id') || message.includes('sabre id'))
        const isSlugConflict = isUniqueViolation && message.includes('slug')

        if (isSabreIdConflict) {
          results.push({ sabreId, success: false, error: duplicateMessage })
          failedCount++
          continue
        }

        if (isSlugConflict) {
          const retryData = { ...insertData, slug: slugWithSuffix(slug, sabreId) }
          const retry = await supabase
            .from('select_hotels')
            .insert(retryData)
            .select()
            .single()

          if (retry.error) {
            results.push({
              sabreId,
              success: false,
              error: '호텔 데이터 생성 중 오류가 발생했습니다.',
            })
            failedCount++
            continue
          }
        } else {
          results.push({
            sabreId,
            success: false,
            error: '호텔 데이터 생성 중 오류가 발생했습니다.',
          })
          failedCount++
          continue
        }
      }

      seenSabreIdsInBatch.add(sabreId)
      results.push({ sabreId, success: true, created: true })
      createdCount++
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        createdCount,
        updatedCount,
        failedCount,
      },
    })
  } catch (error) {
    console.error('[hotel/bulk-create] unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '일괄 등록 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
