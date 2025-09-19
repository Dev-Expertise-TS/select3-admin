import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { success: false, error: '검색어가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    try {
      // 검색어가 숫자인지 확인
      const isNumeric = !isNaN(Number(query))
      
      let searchQuery
      if (isNumeric) {
        // 숫자인 경우: sabre_id 정확 일치 또는 property_name_en 부분 일치
        searchQuery = supabase
          .from('sabre_hotels')
          .select(`
            sabre_id,
            property_name_en,
            property_name_ko
          `)
          .or(`sabre_id.eq.${query},property_name_en.ilike.%${query}%`)
      } else {
        // 문자열인 경우: property_name_en만 부분 일치
        searchQuery = supabase
          .from('sabre_hotels')
          .select(`
            sabre_id,
            property_name_en,
            property_name_ko
          `)
          .ilike('property_name_en', `%${query}%`)
      }

      const { data, error } = await searchQuery
        .order('property_name_en', { ascending: true })
        .limit(50) // 최대 50개 결과로 제한

      if (error) {
        console.error('Supabase 검색 오류:', error)
        return NextResponse.json(
          { 
            success: false, 
            error: '데이터베이스 검색 중 오류가 발생했습니다.' 
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

    } catch (dbError) {
      console.error('DB 검색 오류:', dbError)
      return NextResponse.json(
        { 
          success: false, 
          error: '데이터베이스 연결 중 오류가 발생했습니다.' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('DB 검색 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
