import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    
    const supabase = createServiceRoleClient()
    
    if (!table) {
      return NextResponse.json(
        { success: false, error: '테이블명이 필요합니다' },
        { status: 400 }
      )
    }

    // 허용된 테이블 목록
    const allowedTables = [
      'select_hotels',
      'hotel_chains',
      'hotel_brands',
      'select_hotel_benefits',
      'select_hotel_benefits_map'
    ]

    if (!allowedTables.includes(table)) {
      return NextResponse.json(
        { success: false, error: '허용되지 않은 테이블입니다' },
        { status: 400 }
      )
    }

    // 데이터 조회
    const { data, error } = await supabase
      .from(table)
      .select('*')

    if (error) {
      console.error('데이터 내보내기 오류:', error)
      return NextResponse.json(
        { success: false, error: '데이터 조회 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    // CSV 형태로 변환
    if (data && data.length > 0) {
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // CSV에서 쉼표나 따옴표가 포함된 경우 처리
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value ?? ''
          }).join(',')
        )
      ].join('\n')

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table}_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json(
      { success: true, data: [], message: '내보낼 데이터가 없습니다' },
      { status: 200 }
    )

  } catch (error) {
    console.error('데이터 내보내기 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
