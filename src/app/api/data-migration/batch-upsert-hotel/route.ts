import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { records, columnMapping } = await request.json()

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: '처리할 레코드가 없습니다' },
        { status: 400 }
      )
    }

    if (!columnMapping || Object.keys(columnMapping).length === 0) {
      return NextResponse.json(
        { success: false, error: '컬럼 매핑이 설정되지 않았습니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    let createdCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // 각 레코드를 순차적으로 처리
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      try {
        // 컬럼 매핑을 적용하여 데이터 변환
        const mappedData: Record<string, unknown> = {}
        
        Object.entries(columnMapping).forEach(([csvColumn, selectHotelsColumn]) => {
          if (selectHotelsColumn && record[csvColumn] !== undefined) {
            let value = record[csvColumn]
            
            // 데이터 타입 변환
            if (selectHotelsColumn === 'destination_sort' || selectHotelsColumn === 'brand_id') {
              value = value ? Number(value) : null
            } else if (selectHotelsColumn === 'rate_code' || selectHotelsColumn === 'rate_plan_codes') {
              // 빈 문자열을 null로 변환
              value = value && value.trim() ? value.trim() : null
            } else {
              // 빈 문자열을 null로 변환
              value = value && value.trim() ? value.trim() : null
            }
            
            mappedData[selectHotelsColumn as string] = value
          }
        })

        // sabre_id가 없으면 건너뛰기
        if (!mappedData.sabre_id) {
          errors.push(`레코드 ${i + 1}: sabre_id가 없습니다`)
          continue
        }

        // 기존 호텔 확인
        const { data: existingHotel, error: selectError } = await supabase
          .from('select_hotels')
          .select('sabre_id')
          .eq('sabre_id', mappedData.sabre_id)
          .single()

        if (selectError && selectError.code !== 'PGRST116') {
          errors.push(`레코드 ${i + 1}: 기존 호텔 조회 오류 - ${selectError.message}`)
          continue
        }

        if (existingHotel) {
          // 업데이트
          const { error: updateError } = await supabase
            .from('select_hotels')
            .update(mappedData)
            .eq('sabre_id', mappedData.sabre_id)

          if (updateError) {
            errors.push(`레코드 ${i + 1}: 업데이트 오류 - ${updateError.message}`)
          } else {
            updatedCount++
          }
        } else {
          // 생성
          const { error: insertError } = await supabase
            .from('select_hotels')
            .insert(mappedData)

          if (insertError) {
            errors.push(`레코드 ${i + 1}: 생성 오류 - ${insertError.message}`)
          } else {
            createdCount++
          }
        }
      } catch (error) {
        errors.push(`레코드 ${i + 1}: 처리 중 오류 - ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }

    // 결과 반환
    const result = {
      success: true,
      data: {
        totalProcessed: records.length,
        createdCount,
        updatedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    }

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('일괄 upsert 오류:', error)
    return NextResponse.json(
      { success: false, error: '일괄 upsert 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
