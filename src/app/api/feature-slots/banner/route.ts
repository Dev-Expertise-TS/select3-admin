import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 상단 베너 슬롯 조회
export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_feature_slots')
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        start_date,
        end_date,
        created_at,
        select_hotels!inner(property_name_ko)
      `)
      .eq('surface', '상단베너')
      .order('start_date', { ascending: true }) // 시작일 순으로 정렬

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
        data: data || [], // 모든 레코드 반환
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
    const { sabre_id, slot_key, start_date, end_date } = body

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

    // 여러 상단 베너를 스케줄링할 수 있도록 중복 체크 제거

    const { data, error } = await supabase
      .from('select_feature_slots')
      .insert({
        sabre_id,
        surface,
        slot_key,
        start_date,
        end_date
      })
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        start_date,
        end_date,
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
    const { id, sabre_id, slot_key, start_date, end_date } = body

    // 필수 필드 검증
    if (!id || !sabre_id || !slot_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'id, sabre_id, slot_key는 필수 입력값입니다.' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_feature_slots')
      .update({
        sabre_id,
        slot_key,
        start_date,
        end_date
      })
      .eq('id', id)
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        start_date,
        end_date,
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
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '삭제할 레코드의 ID가 필요합니다.' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_feature_slots')
      .delete()
      .eq('id', id)

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
