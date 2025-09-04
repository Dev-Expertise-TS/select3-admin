import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다' },
        { status: 400 }
      )
    }

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

    const fileContent = await file.text()
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: '유효한 CSV 파일이 아닙니다' },
        { status: 400 }
      )
    }

    // CSV 파싱
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || null
      })
      return row
    })

    const supabase = createServiceRoleClient()

    // 데이터 삽입
    const { error } = await supabase
      .from(table)
      .insert(rows)

    if (error) {
      console.error('데이터 가져오기 오류:', error)
      return NextResponse.json(
        { success: false, error: '데이터 삽입 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        message: `${rows.length}개의 레코드가 성공적으로 가져와졌습니다`,
        count: rows.length
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('데이터 가져오기 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
