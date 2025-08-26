import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const brand_id_raw = formData.get('brand_id')
    const brand_id = brand_id_raw && brand_id_raw !== '' ? Number(brand_id_raw) : null
    const name_kr_raw = String(formData.get('name_kr') ?? '')
    const name_en_raw = String(formData.get('name_en') ?? '')
    const name_kr = name_kr_raw.trim()
    const name_en = name_en_raw.trim()
    const chain_id_raw = formData.get('chain_id')
    const chain_id = chain_id_raw == null || String(chain_id_raw).trim() === '' ? null : Number(chain_id_raw)

    console.log('[brand][server] received form:', {
      brand_id,
      name_kr,
      name_en,
      chain_id,
      brand_id_raw,
      chain_id_raw
    })

    // 유효성 검사
    if (!name_kr && !name_en) {
      return NextResponse.json({ 
        success: false, 
        error: '브랜드(한글) 또는 브랜드(영문) 중 하나는 입력해야 합니다.' 
      }, { status: 422 })
    }

    if (!chain_id) {
      return NextResponse.json({ 
        success: false, 
        error: '체인 ID가 필요합니다. 체인을 먼저 선택해주세요.' 
      }, { status: 422 })
    }

    const supabase = createServiceRoleClient()
    
    // 먼저 테이블 구조를 확인
    const { data: sampleData, error: sampleError } = await supabase
      .from('hotel_brands')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('[chain-brand][brand/save] table structure check error:', sampleError)
      return NextResponse.json({ 
        success: false, 
        error: `테이블 구조 확인 오류: ${sampleError.message}` 
      }, { status: 500 })
    }

    // 실제 컬럼명 찾기
    const actualColumns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
    console.log('[chain-brand][brand/save] actual columns:', actualColumns)

    // 컬럼명 매핑
    const brandIdColumn = actualColumns.find(col => 
      col.toLowerCase().includes('brand') && col.toLowerCase().includes('id')
    ) || 'brand_id'
    
    const chainIdColumn = actualColumns.find(col => 
      col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
    ) || 'chain_id'
    
    const nameKrColumn = actualColumns.find(col => 
      col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
    ) || 'name_kr'
    
    const nameEnColumn = actualColumns.find(col => 
      col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
    ) || null // name_en 컬럼이 없을 수 있음

    console.log('[chain-brand][brand/save] column mapping:', {
      brandIdColumn,
      chainIdColumn,
      nameKrColumn,
      nameEnColumn,
      hasNameEn: !!nameEnColumn
    })

    const operation = brand_id && !Number.isNaN(brand_id) ? 'update' : 'insert'
    
    console.log('[chain-brand][brand/save] operation:', operation, {
      brand_id,
      name_kr,
      name_en,
      chain_id,
    })

    let result
    if (operation === 'update') {
      // 기존 브랜드 업데이트
      const updateData: Record<string, unknown> = { [chainIdColumn]: chain_id }
      if (nameKrColumn) updateData[nameKrColumn] = name_kr || null
      if (nameEnColumn) updateData[nameEnColumn] = name_en || null
      
      console.log('[chain-brand][brand/save] updating with:', updateData)
      
      result = await supabase
        .from('hotel_brands')
        .update(updateData)
        .eq(brandIdColumn, brand_id)
        .select('*')
        .single()
    } else {
      // 새 브랜드 생성
      const insertData: Record<string, unknown> = { [chainIdColumn]: chain_id }
      if (nameKrColumn) insertData[nameKrColumn] = name_kr || null
      if (nameEnColumn) insertData[nameEnColumn] = name_en || null
      
      console.log('[chain-brand][brand/save] inserting:', insertData)
      
      result = await supabase
        .from('hotel_brands')
        .insert(insertData)
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('[chain-brand][brand/save] database error:', result.error)
      
      // 구체적인 에러 메시지 제공
      let errorMessage = '저장 중 오류가 발생했습니다.'
      if (result.error.message.includes('duplicate key')) {
        errorMessage = '이미 존재하는 브랜드입니다.'
      } else if (result.error.message.includes('foreign key')) {
        errorMessage = '존재하지 않는 체인 ID입니다.'
      } else if (result.error.message.includes('not null')) {
        errorMessage = '필수 필드가 누락되었습니다.'
      } else if (result.error.message.includes('column') && result.error.message.includes('does not exist')) {
        errorMessage = `테이블에 필요한 컬럼이 없습니다: ${result.error.message}`
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: result.error.message
      }, { status: 422 })
    }

    console.log('[chain-brand][brand/save] success:', result.data)

    const status = operation === 'update' ? 200 : 201
    return NextResponse.json({ success: true, data: result.data }, { status })
  } catch (e) {
    console.error('[chain-brand][brand/save] unexpected error:', e)
    return NextResponse.json({ 
      success: false, 
      error: '예상치 못한 오류가 발생했습니다.',
      details: e instanceof Error ? e.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}


