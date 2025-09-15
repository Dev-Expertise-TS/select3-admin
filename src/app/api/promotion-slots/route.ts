import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: select_feature_slots에서 surface가 '프로모션'인 목록 조회
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
        created_at,
        select_hotels!inner(property_name_ko)
      `)
      .eq('surface', '프로모션')
      .order('slot_key', { ascending: true })

    if (error) {
      console.error('Promotion slots 조회 오류:', error)
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
        data: data || [],
        count: data?.length || 0
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Promotion slots API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// POST: select_feature_slots에 surface가 '프로모션'인 새 항목 생성
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
    const surface = '프로모션' // 프로모션은 항상 '프로모션' surface 사용

    // 중복 검사
    const { data: existingData } = await supabase
      .from('select_feature_slots')
      .select('id')
      .eq('sabre_id', sabre_id)
      .eq('surface', surface)
      .eq('slot_key', slot_key)
      .single()

    if (existingData) {
      return NextResponse.json(
        { 
          success: false, 
          error: '이미 존재하는 조합입니다. (sabre_id, slot_key)' 
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
      .select()
      .single()

    if (error) {
      console.error('Promotion slot 생성 오류:', error)
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
        message: '프로모션 항목이 성공적으로 생성되었습니다.'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Promotion slot 생성 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
