import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 상단 베너 슬롯 조회
export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_feature_slots')
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        created_at,
        select_hotels!inner(property_name_ko)
      `)
      .eq('surface', '상단베너')
      .order('created_at', { ascending: false })
      .limit(1) // 상단 베너는 하나만 존재

    if (error) {
      console.error('상단 베너 슬롯 조회 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터를 불러오는 중 오류가 발생했습니다.' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data: data?.[0] || null, // 첫 번째 레코드만 반환
        count: data?.length || 0
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('상단 베너 슬롯 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// POST: 상단 베너 슬롯 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, slot_key } = body

    // 필수 필드 검증
    if (!sabre_id || !slot_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'sabre_id, slot_key는 필수 입력값입니다.' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const surface = '상단베너'

    // 기존 상단 베너가 있는지 확인
    const { data: existingData, error: _checkError } = await supabase
      .from('select_feature_slots')
      .select('id')
      .eq('surface', surface)
      .single()

    if (existingData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '상단 베너는 하나만 설정할 수 있습니다. 기존 설정을 수정하거나 삭제해주세요.' 
        },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('select_feature_slots')
      .insert({
        sabre_id,
        surface,
        slot_key
      })
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        created_at,
        select_hotels!inner(property_name_ko)
      `)
      .single()

    if (error) {
      console.error('상단 베너 슬롯 생성 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터 생성 중 오류가 발생했습니다.' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data,
        message: '상단 베너가 성공적으로 생성되었습니다.'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('상단 베너 슬롯 생성 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// PUT: 상단 베너 슬롯 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, slot_key } = body

    // 필수 필드 검증
    if (!sabre_id || !slot_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'sabre_id, slot_key는 필수 입력값입니다.' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 기존 상단 베너 찾기
    const { data: existingData, error: findError } = await supabase
      .from('select_feature_slots')
      .select('id')
      .eq('surface', '상단베너')
      .single()

    if (findError || !existingData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '수정할 상단 베너를 찾을 수 없습니다.' 
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('select_feature_slots')
      .update({
        sabre_id,
        slot_key
      })
      .eq('id', existingData.id)
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        created_at,
        select_hotels!inner(property_name_ko)
      `)
      .single()

    if (error) {
      console.error('상단 베너 슬롯 수정 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터 수정 중 오류가 발생했습니다.' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data,
        message: '상단 베너가 성공적으로 수정되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('상단 베너 슬롯 수정 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// DELETE: 상단 베너 슬롯 삭제
export async function DELETE(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // 기존 상단 베너 찾기
    const { data: existingData, error: findError } = await supabase
      .from('select_feature_slots')
      .select('id')
      .eq('surface', '상단베너')
      .single()

    if (findError || !existingData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '삭제할 상단 베너를 찾을 수 없습니다.' 
        },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('select_feature_slots')
      .delete()
      .eq('id', existingData.id)

    if (error) {
      console.error('상단 베너 슬롯 삭제 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터 삭제 중 오류가 발생했습니다.' 
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: '상단 베너가 성공적으로 삭제되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('상단 베너 슬롯 삭제 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
