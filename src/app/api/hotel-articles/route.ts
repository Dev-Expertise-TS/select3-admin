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

    // 전체 개수를 가져오기 위한 별도 쿼리
    let countQuery = supabase
      .from('select_hotel_blogs')
      .select('*', { count: 'exact', head: true })

    // 검색 조건 추가
    if (search) {
      countQuery = countQuery.or(`main_title.ilike.%${search}%,sub_title.ilike.%${search}%`)
    }

    // 발행 상태 필터
    if (publish) {
      countQuery = countQuery.eq('publish', publish === 'true')
    }

    const { count } = await countQuery
    
    // 실제 데이터를 가져옴
    const { data, error } = await query
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

// POST: 호텔 블로그 생성 또는 업데이트 (slug 기준 upsert)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[블로그 API] 받은 데이터:', body)
    console.log('[블로그 API] brand_id_connect (문자열):', body.brand_id_connect)
    console.log('[블로그 API] brand_id_connect 타입:', typeof body.brand_id_connect)
    
    const {
      slug,
      publish = false,
      main_title,
      sub_title,
      main_image,
      brand_id_connect,
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

    // 1. slug로 기존 블로그 조회
    const { data: existingBlog } = await supabase
      .from('select_hotel_blogs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (existingBlog) {
      // 2-1. 기존 블로그가 있으면 업데이트
      const updateData: Record<string, unknown> = {
        publish,
        main_title,
        sub_title: sub_title || '',
        main_image: main_image || '',
        updated_at: new Date().toISOString()
      }

      // brand_id_connect 업데이트 (TEXT 타입: 쉼표 구분 문자열)
      if (brand_id_connect !== undefined) {
        console.log('[블로그 API] brand_id_connect 업데이트:', brand_id_connect)
        console.log('[블로그 API] brand_id_connect 타입:', typeof brand_id_connect)
        // 빈 문자열이면 null로 저장
        updateData.brand_id_connect = brand_id_connect && brand_id_connect.trim() ? brand_id_connect : null
      } else {
        console.log('[블로그 API] brand_id_connect는 undefined')
      }

      // undefined가 아닌 필드만 업데이트
      if (s1_contents !== undefined) updateData.s1_contents = s1_contents || ''
      if (s2_contents !== undefined) updateData.s2_contents = s2_contents || ''
      if (s3_contents !== undefined) updateData.s3_contents = s3_contents || ''
      if (s4_contents !== undefined) updateData.s4_contents = s4_contents || ''
      if (s5_contents !== undefined) updateData.s5_contents = s5_contents || ''
      if (s6_contents !== undefined) updateData.s6_contents = s6_contents || ''
      if (s7_contents !== undefined) updateData.s7_contents = s7_contents || ''
      if (s8_contents !== undefined) updateData.s8_contents = s8_contents || ''
      if (s9_contents !== undefined) updateData.s9_contents = s9_contents || ''
      if (s10_contents !== undefined) updateData.s10_contents = s10_contents || ''
      if (s11_contents !== undefined) updateData.s11_contents = s11_contents || ''
      if (s12_contents !== undefined) updateData.s12_contents = s12_contents || ''
      if (s1_sabre_id !== undefined) updateData.s1_sabre_id = s1_sabre_id || null
      if (s2_sabre_id !== undefined) updateData.s2_sabre_id = s2_sabre_id || null
      if (s3_sabre_id !== undefined) updateData.s3_sabre_id = s3_sabre_id || null
      if (s4_sabre_id !== undefined) updateData.s4_sabre_id = s4_sabre_id || null
      if (s5_sabre_id !== undefined) updateData.s5_sabre_id = s5_sabre_id || null
      if (s6_sabre_id !== undefined) updateData.s6_sabre_id = s6_sabre_id || null
      if (s7_sabre_id !== undefined) updateData.s7_sabre_id = s7_sabre_id || null
      if (s8_sabre_id !== undefined) updateData.s8_sabre_id = s8_sabre_id || null
      if (s9_sabre_id !== undefined) updateData.s9_sabre_id = s9_sabre_id || null
      if (s10_sabre_id !== undefined) updateData.s10_sabre_id = s10_sabre_id || null
      if (s11_sabre_id !== undefined) updateData.s11_sabre_id = s11_sabre_id || null
      if (s12_sabre_id !== undefined) updateData.s12_sabre_id = s12_sabre_id || null

      console.log('[블로그 API] 업데이트할 데이터:', updateData)
      
      const { data, error } = await supabase
        .from('select_hotel_blogs')
        .update(updateData)
        .eq('id', existingBlog.id)
        .eq('slug', slug)
        .select('*')
        .single()

      if (error) {
        console.error('[블로그 API] 업데이트 오류:', error)
        console.error('[블로그 API] 에러 상세:', JSON.stringify(error, null, 2))
        return NextResponse.json(
          { success: false, error: '호텔 블로그를 업데이트할 수 없습니다.', details: error.message },
          { status: 500 }
        )
      }

      console.log('[블로그 API] 업데이트 성공! 저장된 데이터:', data)
      console.log('[블로그 API] 저장된 brand_id_connect:', data?.brand_id_connect)

      return NextResponse.json({
        success: true,
        data,
        isNew: false
      })

    } else {
      // 2-2. 기존 블로그가 없으면 새로 생성
      const { data, error } = await supabase
        .from('select_hotel_blogs')
        .insert({
          slug,
          publish,
          main_title,
          sub_title: sub_title || '',
          main_image: main_image || '',
          brand_id_connect: brand_id_connect && brand_id_connect.trim() ? brand_id_connect : null,
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
          s1_sabre_id: s1_sabre_id || null,
          s2_sabre_id: s2_sabre_id || null,
          s3_sabre_id: s3_sabre_id || null,
          s4_sabre_id: s4_sabre_id || null,
          s5_sabre_id: s5_sabre_id || null,
          s6_sabre_id: s6_sabre_id || null,
          s7_sabre_id: s7_sabre_id || null,
          s8_sabre_id: s8_sabre_id || null,
          s9_sabre_id: s9_sabre_id || null,
          s10_sabre_id: s10_sabre_id || null,
          s11_sabre_id: s11_sabre_id || null,
          s12_sabre_id: s12_sabre_id || null,
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
        data,
        isNew: true
      }, { status: 201 })
    }

  } catch (error) {
    console.error('호텔 블로그 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
