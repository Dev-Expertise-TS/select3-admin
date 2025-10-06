import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: select_feature_slots 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const surface = searchParams.get('surface') ?? '히어로'

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
      .eq('surface', surface)
      .order('slot_key', { ascending: true })

    if (error) {
      console.error('Feature slots 조회 오류:', error)
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
    console.error('Feature slots API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// POST: select_feature_slots 새 항목 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, slot_key } = body
    const surfaceFromBody: string | undefined = body.surface

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
    const surface = surfaceFromBody && typeof surfaceFromBody === 'string' && surfaceFromBody.trim().length > 0
      ? surfaceFromBody
      : '히어로'

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
      console.error('Feature slot 생성 오류:', error)
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
        message: '히어로 캐러셀 항목이 성공적으로 생성되었습니다.'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Feature slot 생성 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
