import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 호텔명으로 호텔 검색
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '검색어를 입력해주세요.' 
        },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en
      `)
      .or(`property_name_ko.ilike.%${query}%,property_name_en.ilike.%${query}%`)
      .order('property_name_ko', { ascending: true })
      .limit(50)

    if (error) {
      console.error('호텔 검색 오류:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 검색 중 오류가 발생했습니다.' 
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
    console.error('호텔 검색 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}