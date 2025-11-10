import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// API route config - body size limit 증가
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export async function PATCH(request: NextRequest) {
  try {
    const { sabre_id, property_details, property_location } = await request.json()

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 업데이트할 필드만 포함
    const updateData: Record<string, unknown> = {}
    if (property_details !== undefined) updateData.property_details = property_details
    if (property_location !== undefined) updateData.property_location = property_location

    const { data, error } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabre_id)
      .select()
      .single()

    if (error) {
      console.error('호텔 콘텐츠 업데이트 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 콘텐츠 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      message: '호텔 콘텐츠가 성공적으로 업데이트되었습니다.'
    })

  } catch (error) {
    console.error('호텔 콘텐츠 업데이트 중 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabre_id = searchParams.get('sabre_id')

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_details, property_location')
      .eq('sabre_id', sabre_id)
      .single()

    if (error) {
      console.error('호텔 콘텐츠 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 콘텐츠를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('호텔 콘텐츠 조회 중 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
