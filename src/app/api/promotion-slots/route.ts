import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: select_feature_slots에서 surface가 특정 값인 목록 조회 (기본: '프로모션')
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const surface = searchParams.get('surface') ?? '프로모션'

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
      .eq('surface', surface)
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

// POST: select_feature_slots에 surface가 특정 값(기본: '프로모션')인 새 항목 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabre_id, slot_key } = body
    const surfaceFromBody: string | undefined = body.surface
    const start_date: string | null | undefined = body.start_date ?? null
    const end_date: string | null | undefined = body.end_date ?? null

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
      : '프로모션' // 기본 surface

    // 중복 검사 (동일 sabre_id, surface, slot_key 조합 방지)
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
        slot_key,
        start_date,
        end_date
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
        message: '항목이 성공적으로 생성되었습니다.'
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
