import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hotels/list
 * 전체 호텔 목록 조회 (필터링 지원)
 * 
 * Query Parameters:
 * - rate_plan_filter: 'all' | 'has_codes' | 'no_codes' | 'specific_code'
 * - rate_plan_code: string (rate_plan_filter가 'specific_code'일 때 필수)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ratePlanFilter = searchParams.get('rate_plan_filter') || 'all'
    const ratePlanCode = searchParams.get('rate_plan_code') || ''

    const supabase = await createClient()

    // 먼저 테이블 구조 확인을 위해 샘플 데이터 조회
    const { data: sampleData } = await supabase
      .from('select_hotels')
      .select('*')
      .limit(1)
    
    let ratePlanColumn = 'rate_plan_code' // 기본값
    
    if (sampleData && sampleData.length > 0) {
      const availableColumns = Object.keys(sampleData[0])
      console.log('🔍 select_hotels 테이블의 사용 가능한 컬럼:', availableColumns)
      
      // rate_plan 관련 컬럼 찾기 (우선순위: rate_plan_code > rate_plan_codes > rate_code)
      const ratePlanCandidates = [
        'rate_plan_code',
        'rate_plan_codes', 
        'rate_code',
        ...availableColumns.filter(col => 
          col.toLowerCase().includes('rate') && col.toLowerCase().includes('plan')
        )
      ]
      
      const foundColumn = ratePlanCandidates.find(col => availableColumns.includes(col))
      if (foundColumn) {
        ratePlanColumn = foundColumn
        console.log('✅ rate_plan 컬럼 발견:', ratePlanColumn)
      } else {
        console.warn('⚠️ rate_plan 관련 컬럼을 찾을 수 없습니다. 기본값 사용:', ratePlanColumn)
      }
    }

    // 기본 쿼리: 동적으로 찾은 컬럼명 사용
    const query = supabase
      .from('select_hotels')
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en,
        ${ratePlanColumn},
        brand_id,
        brand_id_2,
        city_ko,
        country_ko,
        vcc
      `)
      .order('sabre_id', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('❌ 호텔 목록 조회 실패:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: '호텔 목록을 조회하는데 실패했습니다.',
          details: error.message 
        },
        { status: 500 }
      )
    }

    // 디버깅: 첫 번째 호텔 데이터의 구조 확인
    if (data && data.length > 0) {
      console.log('🔍 첫 번째 호텔 데이터 샘플:', data[0])
      console.log(`🔍 ${ratePlanColumn} 타입:`, typeof data[0][ratePlanColumn as keyof typeof data[0]])
      console.log(`🔍 ${ratePlanColumn} 값:`, data[0][ratePlanColumn as keyof typeof data[0]])
      console.log(`🔍 ${ratePlanColumn} Array.isArray:`, Array.isArray(data[0][ratePlanColumn as keyof typeof data[0]]))
    }

    // 클라이언트 측 필터링 (빈 배열을 확인하기 위해)
    // 컬럼명 정규화: 모든 호텔 데이터에서 rate_plan_code로 통일
    let filteredData = (data || []).map(hotel => {
      const normalizedHotel = { ...hotel }
      if (ratePlanColumn !== 'rate_plan_code' && ratePlanColumn in hotel) {
        normalizedHotel.rate_plan_code = hotel[ratePlanColumn as keyof typeof hotel]
        delete normalizedHotel[ratePlanColumn as keyof typeof normalizedHotel]
      }
      return normalizedHotel
    })

    // brand_id와 brand_id_2로 브랜드 정보 조회
    const brandIds = new Set<number>()
    filteredData.forEach((hotel: any) => {
      if (hotel.brand_id !== null && hotel.brand_id !== undefined) {
        brandIds.add(Number(hotel.brand_id))
      }
      if (hotel.brand_id_2 !== null && hotel.brand_id_2 !== undefined) {
        brandIds.add(Number(hotel.brand_id_2))
      }
    })

    // hotel_brands 테이블에서 브랜드 정보 조회
    let brandMap = new Map<number, { brand_id: number; brand_name_ko: string | null }>()
    if (brandIds.size > 0) {
      const { data: brandsData, error: brandsError } = await supabase
        .from('hotel_brands')
        .select('brand_id, brand_name_ko')
        .in('brand_id', Array.from(brandIds))

      if (brandsError) {
        console.error('❌ 브랜드 정보 조회 실패:', brandsError)
      } else {
        (brandsData || []).forEach((brand: any) => {
          brandMap.set(Number(brand.brand_id), {
            brand_id: Number(brand.brand_id),
            brand_name_ko: brand.brand_name_ko || null,
          })
        })
      }
    }

    // Rate Plan Code 유효성 검사 헬퍼 함수
    const hasRatePlanCodes = (codes: unknown): boolean => {
      if (codes === null || codes === undefined) return false
      if (Array.isArray(codes)) return codes.length > 0
      if (typeof codes === 'string') return codes.trim().length > 0
      return false
    }

    // rate_plan_code 필터링 적용
    if (ratePlanFilter === 'has_codes') {
      // rate_plan_code가 null이 아니고 빈 배열/문자열이 아닌 경우
      filteredData = filteredData.filter((hotel) => hasRatePlanCodes(hotel.rate_plan_code))
    } else if (ratePlanFilter === 'no_codes') {
      // rate_plan_code가 null이거나 빈 배열/문자열인 경우
      filteredData = filteredData.filter((hotel) => !hasRatePlanCodes(hotel.rate_plan_code))
    } else if (ratePlanFilter === 'specific_code' && ratePlanCode) {
      // 특정 rate_plan_code를 포함하는 경우
      filteredData = filteredData.filter((hotel) => {
        const codes = hotel.rate_plan_code
        if (Array.isArray(codes)) {
          return codes.includes(ratePlanCode)
        }
        if (typeof codes === 'string') {
          return codes.includes(ratePlanCode)
        }
        return false
      })
    }

    // rate_plan_code가 빈 배열인 경우 null로 정규화 및 브랜드 정보 매핑
    const normalizedData = filteredData.map((hotel: any) => {
      const brand1 = hotel.brand_id !== null && hotel.brand_id !== undefined 
        ? brandMap.get(Number(hotel.brand_id)) 
        : null
      const brand2 = hotel.brand_id_2 !== null && hotel.brand_id_2 !== undefined 
        ? brandMap.get(Number(hotel.brand_id_2)) 
        : null

      return {
        ...hotel,
        rate_plan_code: Array.isArray(hotel.rate_plan_code) && hotel.rate_plan_code.length === 0 
          ? null 
          : hotel.rate_plan_code,
        brand_name_ko: brand1?.brand_name_ko || null,
        brand_id_2_name_ko: brand2?.brand_name_ko || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: normalizedData,
      meta: {
        count: normalizedData.length,
        filter: ratePlanFilter,
        ...(ratePlanCode && { rate_plan_code: ratePlanCode }),
      },
    })
  } catch (error) {
    console.error('❌ 호텔 목록 조회 중 예외 발생:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

