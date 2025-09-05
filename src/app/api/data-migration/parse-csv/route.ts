import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 선택되지 않았습니다' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'CSV 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV 파일이 비어있습니다' },
        { status: 400 }
      )
    }

    // CSV 파싱 (정교한 CSV 파서 - 따옴표와 쉼표 처리)
    const parseCSV = (csvText: string) => {
      // 다양한 줄바꿈 문자 처리
      const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const lines = normalizedText.split('\n')
      
      if (lines.length === 0) return { headers: [], data: [] }
      
      // 빈 행이 아닌 행만 필터링 (헤더는 제외)
      const nonEmptyLines = lines.filter((line, index) => {
        // 첫 번째 행(헤더)은 항상 포함
        if (index === 0) return true
        // 나머지 행은 빈 행이 아닌 경우만 포함
        return line.trim().length > 0
      })

      // CSV 행 파싱 함수 (따옴표 내부의 쉼표 처리)
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        let i = 0

        while (i < line.length) {
          const char = line[i]
          const nextChar = line[i + 1]

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // 이스케이프된 따옴표
              current += '"'
              i += 2
            } else {
              // 따옴표 시작/끝
              inQuotes = !inQuotes
              i++
            }
          } else if (char === ',' && !inQuotes) {
            // 쉼표 (따옴표 밖에서만)
            result.push(current.trim())
            current = ''
            i++
          } else {
            current += char
            i++
          }
        }

        // 마지막 필드 추가
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(nonEmptyLines[0])
      const data = nonEmptyLines.slice(1).map((line, lineIndex) => {
        const values = parseCSVLine(line)
        const row: Record<string, string> = {}
        
        // 헤더와 값의 개수가 다를 경우 경고
        if (values.length !== headers.length) {
          console.warn(`행 ${lineIndex + 2}: 헤더 개수(${headers.length})와 값 개수(${values.length})가 다릅니다`)
        }
        
        headers.forEach((header, index) => {
          // 값이 없으면 빈 문자열로 설정
          row[header] = values[index] || ''
        })
        return row
      })

      return { headers, data, nonEmptyLinesCount: nonEmptyLines.length }
    }

    const { headers, data, nonEmptyLinesCount } = parseCSV(text)

    // 디버깅을 위한 로그 추가
    console.log('CSV 파싱 결과:')
    console.log('Headers:', headers)
    console.log('첫 번째 데이터 행:', data[0])
    console.log('데이터 행 수:', data.length)
    console.log('마지막 데이터 행:', data[data.length - 1])
    console.log('원본 텍스트 길이:', text.length)
    console.log('원본 라인 수:', text.split('\n').length)
    console.log('필터링된 라인 수:', nonEmptyLinesCount)

    // select_hotels 테이블의 컬럼과 매핑 확인
    const selectHotelsColumns = [
      'id_old', 'sort_id', 'sabre_id', 'slug', 'paragon_id', 'property_name_ko', 
      'property_name_en', 'city', 'city_ko', 'city_en', 'country_ko', 'country_en',
      'continent_ko', 'continent_en', 'chain_ko', 'chain_en', 'property_address', 
      'destination_sort', 'property_location', 'link', 'property_details', 'created_at',
      'image_1', 'image_2', 'image_3', 'image_4', 'image_5', 'badge', 'badge_1', 
      'badge_2', 'badge_3', 'benefit', 'benefit_1', 'benefit_2', 'benefit_3', 
      'benefit_4', 'benefit_5', 'benefit_6', 'benefit_details', 'benefit_1_details', 
      'benefit_2_details', 'benefit_3_details', 'benefit_4_details', 'benefit_5_details', 
      'benefit_6_details', 'event_1', 'event_1_details_1', 'event_1_details_2', 
      'event_1_details_3', 'event_1_details_4', 'event_1_details_5', 'event_2', 
      'event_2_details_1', 'event_2_details_2', 'event_2_details_3', 'event_2_details_4',
      'blogs', 'blogs_s1', 'blogs_s2', 'blogs_s3', 'blogs_s4', 'blogs_s5', 'blogs_s6', 
      'blogs_s7', 'rate_code', 'rate_plan_codes', 'brand_id', 'id'
    ]

    // 매핑 가능한 컬럼 찾기
    const mappableColumns = headers.filter(header => 
      selectHotelsColumns.includes(header.toLowerCase()) || 
      selectHotelsColumns.includes(header)
    )

    return NextResponse.json({
      success: true,
      data: {
        headers,
        data: data, // 모든 레코드 반환
        totalRows: data.length,
        mappableColumns,
        selectHotelsColumns
      }
    }, { status: 200 })

  } catch (error) {
    console.error('CSV 파싱 오류:', error)
    return NextResponse.json(
      { success: false, error: 'CSV 파일 파싱 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
