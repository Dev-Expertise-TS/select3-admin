import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 여러 도시의 첫 번째 이미지를 배치로 가져오기
 * POST /api/city-images/batch
 * Body: { cities: Array<{ cityCode?: string, cityKo?: string, cityEn?: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const cities = body.cities as Array<{ cityCode?: string; cityKo?: string; cityEn?: string }>

    if (!Array.isArray(cities) || cities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'cities 배열이 필요합니다.' },
        { status: 400 }
      )
    }

    // 최대 50개로 제한
    const limitedCities = cities.slice(0, 50)

    const supabase = createServiceRoleClient()
    const results: Record<string, string> = {}

    // 병렬로 처리 (Promise.all)
    await Promise.all(
      limitedCities.map(async (city) => {
        const { cityCode, cityKo, cityEn } = city
        const cacheKey = `${cityCode || cityKo || cityEn || 'none'}`

        try {
          let query = supabase
            .from('select_city_media')
            .select('public_url')
            .order('image_seq', { ascending: true })
            .limit(1)

          if (cityCode) {
            query = query.eq('city_code', cityCode)
          } else if (cityKo) {
            query = query.eq('city_ko', cityKo)
          } else if (cityEn) {
            query = query.eq('city_en', cityEn)
          } else {
            results[cacheKey] = ''
            return
          }

          const { data, error } = await query.maybeSingle()

          if (error) {
            console.error('[batch] Query error for', cacheKey, error)
            results[cacheKey] = ''
          } else {
            results[cacheKey] = data?.public_url || ''
          }
        } catch (err) {
          console.error('[batch] Error for', cacheKey, err)
          results[cacheKey] = ''
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error('[city-images/batch] Error:', error)
    return NextResponse.json(
      { success: false, error: '배치 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

