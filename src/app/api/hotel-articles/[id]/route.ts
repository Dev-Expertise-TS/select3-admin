import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 특정 호텔 블로그 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '블로그 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotel_blogs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('호텔 블로그 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 블로그를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('호텔 블로그 조회 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT: 호텔 블로그 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      slug,
      publish,
      main_title,
      sub_title,
      main_image,
      s1_contents,
      s2_contents,
      s3_contents,
      s4_contents,
      s5_contents,
      s6_contents,
      s7_contents,
      s8_contents,
      s9_contents,
      s10_contents,
      s11_contents,
      s12_contents,
      s1_sabre_id,
      s2_sabre_id,
      s3_sabre_id,
      s4_sabre_id,
      s5_sabre_id,
      s6_sabre_id,
      s7_sabre_id,
      s8_sabre_id,
      s9_sabre_id,
      s10_sabre_id,
      s11_sabre_id,
      s12_sabre_id
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '블로그 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 업데이트할 데이터 준비
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (slug !== undefined) updateData.slug = slug
    if (publish !== undefined) updateData.publish = publish
    if (main_title !== undefined) updateData.main_title = main_title
    if (sub_title !== undefined) updateData.sub_title = sub_title
    if (main_image !== undefined) updateData.main_image = main_image
    if (s1_contents !== undefined) updateData.s1_contents = s1_contents
    if (s2_contents !== undefined) updateData.s2_contents = s2_contents
    if (s3_contents !== undefined) updateData.s3_contents = s3_contents
    if (s4_contents !== undefined) updateData.s4_contents = s4_contents
    if (s5_contents !== undefined) updateData.s5_contents = s5_contents
    if (s6_contents !== undefined) updateData.s6_contents = s6_contents
    if (s7_contents !== undefined) updateData.s7_contents = s7_contents
    if (s8_contents !== undefined) updateData.s8_contents = s8_contents
    if (s9_contents !== undefined) updateData.s9_contents = s9_contents
    if (s10_contents !== undefined) updateData.s10_contents = s10_contents
    if (s11_contents !== undefined) updateData.s11_contents = s11_contents
    if (s12_contents !== undefined) updateData.s12_contents = s12_contents
    if (s1_sabre_id !== undefined) updateData.s1_sabre_id = s1_sabre_id
    if (s2_sabre_id !== undefined) updateData.s2_sabre_id = s2_sabre_id
    if (s3_sabre_id !== undefined) updateData.s3_sabre_id = s3_sabre_id
    if (s4_sabre_id !== undefined) updateData.s4_sabre_id = s4_sabre_id
    if (s5_sabre_id !== undefined) updateData.s5_sabre_id = s5_sabre_id
    if (s6_sabre_id !== undefined) updateData.s6_sabre_id = s6_sabre_id
    if (s7_sabre_id !== undefined) updateData.s7_sabre_id = s7_sabre_id
    if (s8_sabre_id !== undefined) updateData.s8_sabre_id = s8_sabre_id
    if (s9_sabre_id !== undefined) updateData.s9_sabre_id = s9_sabre_id
    if (s10_sabre_id !== undefined) updateData.s10_sabre_id = s10_sabre_id
    if (s11_sabre_id !== undefined) updateData.s11_sabre_id = s11_sabre_id
    if (s12_sabre_id !== undefined) updateData.s12_sabre_id = s12_sabre_id

    const { data, error } = await supabase
      .from('select_hotel_blogs')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('호텔 블로그 수정 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 블로그를 수정할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('호텔 블로그 수정 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 호텔 블로그 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: '블로그 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('select_hotel_blogs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('호텔 블로그 삭제 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 블로그를 삭제할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '호텔 블로그가 성공적으로 삭제되었습니다.'
    })

  } catch (error) {
    console.error('호텔 블로그 삭제 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
