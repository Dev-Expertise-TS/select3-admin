import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 특정 promotion slot 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_feature_slots')
      .select(`
        id,
        sabre_id,
        surface,
        slot_key,
        created_at
      `)
      .eq('id', id)
      .eq('surface', '프로모션')
      .single()

    if (error) {
      console.error('Promotion slot 조회 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터를 찾을 수 없습니다.' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Promotion slot 조회 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// PUT: 특정 promotion slot 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { sabre_id, slot_key } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      )
    }

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

    // 중복 검사 (자기 자신 제외)
    const { data: existingData, error: checkError } = await supabase
      .from('select_feature_slots')
      .select('id')
      .eq('sabre_id', sabre_id)
      .eq('surface', surface)
      .eq('slot_key', slot_key)
      .neq('id', id)
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
      .update({
        sabre_id,
        surface,
        slot_key
      })
      .eq('id', id)
      .eq('surface', '프로모션')
      .select()
      .single()

    if (error) {
      console.error('Promotion slot 수정 오류:', error)
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
        message: '프로모션 항목이 성공적으로 수정되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Promotion slot 수정 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// DELETE: 특정 promotion slot 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_feature_slots')
      .delete()
      .eq('id', id)
      .eq('surface', '프로모션')

    if (error) {
      console.error('Promotion slot 삭제 오류:', error)
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
        message: '프로모션 항목이 성공적으로 삭제되었습니다.'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Promotion slot 삭제 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
