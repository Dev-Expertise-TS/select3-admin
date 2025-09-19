import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 호텔 블로그 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const publish = searchParams.get('publish') || ''

    const supabase = createServiceRoleClient()
    
    let query = supabase
      .from('select_hotel_blogs')
      .select('*')

    // 검색 조건 추가
    if (search) {
      query = query.or(`main_title.ilike.%${search}%,sub_title.ilike.%${search}%`)
    }

    // 발행 상태 필터
    if (publish) {
      query = query.eq('publish', publish === 'true')
    }

    // 페이지네이션
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('호텔 블로그 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 블로그를 조회할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('호텔 블로그 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 호텔 블로그 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      slug,
      publish = false,
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

    if (!slug || !main_title) {
      return NextResponse.json(
        { success: false, error: 'slug와 main_title은 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotel_blogs')
      .insert({
        slug,
        publish,
        main_title,
        sub_title: sub_title || '',
        main_image: main_image || '',
        s1_contents: s1_contents || '',
        s2_contents: s2_contents || '',
        s3_contents: s3_contents || '',
        s4_contents: s4_contents || '',
        s5_contents: s5_contents || '',
        s6_contents: s6_contents || '',
        s7_contents: s7_contents || '',
        s8_contents: s8_contents || '',
        s9_contents: s9_contents || '',
        s10_contents: s10_contents || '',
        s11_contents: s11_contents || '',
        s12_contents: s12_contents || '',
        s1_sabre_id: s1_sabre_id || '',
        s2_sabre_id: s2_sabre_id || '',
        s3_sabre_id: s3_sabre_id || '',
        s4_sabre_id: s4_sabre_id || '',
        s5_sabre_id: s5_sabre_id || '',
        s6_sabre_id: s6_sabre_id || '',
        s7_sabre_id: s7_sabre_id || '',
        s8_sabre_id: s8_sabre_id || '',
        s9_sabre_id: s9_sabre_id || '',
        s10_sabre_id: s10_sabre_id || '',
        s11_sabre_id: s11_sabre_id || '',
        s12_sabre_id: s12_sabre_id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) {
      console.error('호텔 블로그 생성 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 블로그를 생성할 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 })

  } catch (error) {
    console.error('호텔 블로그 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
