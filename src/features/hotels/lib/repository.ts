import { createServiceRoleClient } from '@/lib/supabase/server'

type HotelRow = Record<string, unknown>

export async function getHotelBySabreOrParagon(params: { sabreId: string | null; paragonId: string | null }) {
  const { sabreId, paragonId } = params
  const supabase = createServiceRoleClient()
  
  // 먼저 호텔 정보만 가져오기
  let hotelQuery = supabase.from('select_hotels').select('*').limit(1)
  if (sabreId) hotelQuery = hotelQuery.eq('sabre_id', sabreId)
  if (!sabreId && paragonId) hotelQuery = hotelQuery.eq('paragon_id', paragonId)
  
  const { data: hotelData, error: hotelError } = await hotelQuery.single<HotelRow>()
  if (hotelError || !hotelData) return { data: hotelData, error: hotelError }
  
  // 호텔의 체인/브랜드 ID가 있다면 별도로 조회
  const hotel = hotelData as Record<string, unknown>
  let chainData = null
  let brandData = null
  
  // 디버깅: Sabre ID 313016인 경우
  if (String(hotel.sabre_id) === '313016') {
    console.log('=== Repository 호텔 데이터 디버깅 ===')
    console.log('전체 호텔 데이터:', hotel)
    console.log('rate_code 값:', hotel.rate_code)
    console.log('rate_plan_codes 값:', hotel.rate_plan_codes)
    console.log('=====================================')
  }
  
  // 먼저 브랜드 정보를 조회 (fallback 로직 포함)
  if (hotel.brand_id) {
    // 디버깅: Sabre ID 313016인 경우
    if (String(hotel.sabre_id) === '313016') {
      console.log('=== Repository 브랜드 조회 디버깅 ===')
      console.log('hotel.brand_id:', hotel.brand_id)
    }
    
    // hotel_brands 테이블 구조 확인을 위해 샘플 데이터 조회
    const { data: brandSample, error: brandSampleError } = await supabase
      .from('hotel_brands')
      .select('*')
      .limit(1)
    
    if (brandSampleError) {
      console.error('hotel_brands 테이블 구조 확인 오류:', brandSampleError)
    } else if (brandSample && brandSample.length > 0) {
      const brandColumns = Object.keys(brandSample[0])
      console.log('hotel_brands 테이블 컬럼:', brandColumns)
      
      // 실제 컬럼명 찾기
      const brandIdColumn = brandColumns.find(col => 
        col.toLowerCase().includes('brand') && col.toLowerCase().includes('id')
      ) || 'brand_id'
      
      const brandNameKrColumn = brandColumns.find(col => 
        col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
      ) || 'name_kr'
      
      const brandNameEnColumn = brandColumns.find(col => 
        col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
      ) || 'name_en'
      
      const chainIdColumn = brandColumns.find(col => 
        col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
      ) || 'chain_id'
      
      console.log('브랜드 컬럼 매핑:', {
        brandIdColumn,
        brandNameKrColumn,
        brandNameEnColumn,
        chainIdColumn
      })
      
      // hotel_brands 테이블에서 브랜드 정보 조회
      const brandRes = await supabase
        .from('hotel_brands')
        .select(`${brandIdColumn}, ${brandNameKrColumn}, ${brandNameEnColumn}, ${chainIdColumn}`)
        .eq(brandIdColumn, hotel.brand_id)
        .single()
      
      // 디버깅: 조회 결과
      if (String(hotel.sabre_id) === '313016') {
        console.log('hotel_brands 테이블 조회 결과:', brandRes)
        console.log('오류:', brandRes.error)
        console.log('데이터:', brandRes.data)
      }
      
      if (brandRes.data) {
        // 조회된 데이터를 표준 형식으로 변환
        brandData = {
          brand_id: brandRes.data[brandIdColumn as keyof typeof brandRes.data],
          name_kr: brandRes.data[brandNameKrColumn as keyof typeof brandRes.data],
          name_en: brandRes.data[brandNameEnColumn as keyof typeof brandRes.data],
          chain_id: brandRes.data[chainIdColumn as keyof typeof brandRes.data]
        }
        
        // 디버깅: 최종 brandData
        if (String(hotel.sabre_id) === '313016') {
          console.log('최종 brandData:', brandData)
        }
        
        // 브랜드의 chain_id로 체인 정보 조회
        if (brandData.chain_id) {
          // hotel_chains 테이블 구조 확인
          const { data: chainSample, error: chainSampleError } = await supabase
            .from('hotel_chains')
            .select('*')
            .limit(1)
          
          if (chainSampleError) {
            console.error('hotel_chains 테이블 구조 확인 오류:', chainSampleError)
          } else if (chainSample && chainSample.length > 0) {
            const chainColumns = Object.keys(chainSample[0])
            console.log('hotel_chains 테이블 컬럼:', chainColumns)
            
            // 체인 컬럼명 찾기
            const chainIdColumnChain = chainColumns.find(col => 
              col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
            ) || 'chain_id'
            
            const chainNameKrColumn = chainColumns.find(col => 
              col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
            ) || 'name_kr'
            
            const chainNameEnColumn = chainColumns.find(col => 
              col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
            ) || 'name_en'
            
            console.log('체인 컬럼 매핑:', {
              chainIdColumnChain,
              chainNameKrColumn,
              chainNameEnColumn
            })
            
            // hotel_chains 테이블에서 체인 정보 조회
            const chainRes = await supabase
              .from('hotel_chains')
              .select(`${chainIdColumnChain}, ${chainNameKrColumn}, ${chainNameEnColumn}`)
              .eq(chainIdColumnChain, brandData.chain_id)
              .single()
            
            // 디버깅: 체인 조회 결과
            if (String(hotel.sabre_id) === '313016') {
              console.log('hotel_chains 테이블 조회 결과:', chainRes)
              console.log('체인 오류:', chainRes.error)
              console.log('체인 데이터:', chainRes.data)
            }
            
            if (chainRes.data) {
              // 조회된 데이터를 표준 형식으로 변환
              chainData = {
                chain_id: chainRes.data[chainIdColumnChain as keyof typeof chainRes.data],
                name_kr: chainRes.data[chainNameKrColumn as keyof typeof chainRes.data],
                name_en: chainRes.data[chainNameEnColumn as keyof typeof chainRes.data]
              }
              
              // 디버깅: 최종 chainData
              if (String(hotel.sabre_id) === '313016') {
                console.log('최종 chainData:', chainData)
              }
            }
          }
        }
      }
    }
  }
  
  // 만약 브랜드가 없고 호텔에 직접 chain_id가 있다면 (fallback)
  if (!chainData && hotel.chain_id) {
    console.log('브랜드 없이 직접 체인 조회 시도:', hotel.chain_id)
    
    // hotel_chains 테이블 구조 확인
    const { data: chainSample, error: chainSampleError } = await supabase
      .from('hotel_chains')
      .select('*')
      .limit(1)
    
    if (!chainSampleError && chainSample && chainSample.length > 0) {
      const chainColumns = Object.keys(chainSample[0])
      
      const chainIdColumn = chainColumns.find(col => 
        col.toLowerCase().includes('chain') && col.toLowerCase().includes('id')
      ) || 'chain_id'
      
      const chainNameKrColumn = chainColumns.find(col => 
        col.toLowerCase().includes('name') && (col.toLowerCase().includes('kr') || col.toLowerCase().includes('ko'))
      ) || 'name_kr'
      
      const chainNameEnColumn = chainColumns.find(col => 
        col.toLowerCase().includes('name') && col.toLowerCase().includes('en')
      ) || 'name_en'
      
      const chainRes = await supabase
        .from('hotel_chains')
        .select(`${chainIdColumn}, ${chainNameKrColumn}, ${chainNameEnColumn}`)
        .eq(chainIdColumn, hotel.chain_id)
        .single()
      
      // 디버깅: 직접 체인 조회 결과
      if (String(hotel.sabre_id) === '313016') {
        console.log('호텔 직접 chain_id로 조회 결과:', chainRes)
        console.log('직접 체인 오류:', chainRes.error)
        console.log('직접 체인 데이터:', chainRes.data)
      }
      
      if (chainRes.data) {
        chainData = {
          chain_id: chainRes.data[chainIdColumn as keyof typeof chainRes.data],
          name_kr: chainRes.data[chainNameKrColumn as keyof typeof chainRes.data],
          name_en: chainRes.data[chainNameEnColumn as keyof typeof chainRes.data]
        }
      }
    }
  }
  
  // rate_code 값을 rate_plan_codes로 변환 (하위 호환성 유지)
  let ratePlanCodes = null
  if (hotel.rate_code) {
    // rate_code가 문자열인 경우 처리
    if (typeof hotel.rate_code === 'string') {
      // JSON 문자열인지 확인 (배열 형태의 문자열)
      if (hotel.rate_code.startsWith('[') && hotel.rate_code.endsWith(']')) {
        try {
          // JSON 파싱 시도
          const parsedCodes = JSON.parse(hotel.rate_code)
          if (Array.isArray(parsedCodes)) {
            ratePlanCodes = parsedCodes.filter(code => typeof code === 'string' && code.trim().length > 0)
          }
        } catch (parseError) {
          console.error('rate_code JSON 파싱 오류:', parseError)
          // JSON 파싱 실패 시 콤마로 분리 시도
          ratePlanCodes = hotel.rate_code.split(',').map(code => code.trim()).filter(Boolean)
        }
      } else {
        // 일반 콤마로 구분된 문자열
        ratePlanCodes = hotel.rate_code.split(',').map(code => code.trim()).filter(Boolean)
      }
    }
    // rate_code가 이미 배열인 경우 그대로 사용
    else if (Array.isArray(hotel.rate_code)) {
      ratePlanCodes = hotel.rate_code.filter(code => typeof code === 'string' && code.trim().length > 0)
    }
    
    // 디버깅: rate_code 변환 결과
    if (String(hotel.sabre_id) === '313016') {
      console.log('=== rate_code 변환 디버깅 ===')
      console.log('원본 rate_code:', hotel.rate_code)
      console.log('rate_code 타입:', typeof hotel.rate_code)
      console.log('변환된 rate_plan_codes:', ratePlanCodes)
      console.log('변환된 타입:', Array.isArray(ratePlanCodes) ? 'array' : typeof ratePlanCodes)
      console.log('================================')
    }
  }
  
  // 결과 조합
  const combinedData = {
    ...hotel,
    hotel_chains: chainData,
    hotel_brands: brandData,
    // rate_code가 있으면 변환된 값을 사용, 없으면 기존 rate_plan_codes 사용
    rate_plan_codes: ratePlanCodes || hotel.rate_plan_codes
  }
  
  // 디버깅: 최종 결과
  if (String(hotel.sabre_id) === '313016') {
    console.log('=== Repository 최종 결과 ===')
    console.log('combinedData:', combinedData)
    console.log('hotel_chains:', combinedData.hotel_chains)
    console.log('hotel_brands:', combinedData.hotel_brands)
    console.log('최종 rate_plan_codes:', combinedData.rate_plan_codes)
    console.log('===============================')
  }
  
  return { data: combinedData, error: null }
}

export async function getMappedBenefitsBySabreId(sabreId: string) {
  const supabase = createServiceRoleClient()
  type MapRow = { benefit_id: string; sort: number | null }
  type BenefitRow = { benefit_id: string | number; benefit: string | null; benefit_description: string | null; start_date: string | null; end_date: string | null }

  const { data: mapRows } = await supabase
    .from('select_hotel_benefits_map')
    .select('benefit_id, sort')
    .eq('sabre_id', sabreId)
    .order('sort', { ascending: true, nullsFirst: true })

  const ids = (mapRows as MapRow[] | null)?.map((r) => String(r.benefit_id)).filter(Boolean) ?? []
  if (ids.length === 0) return [] as BenefitRow[]

  const { data: benefitRows } = await supabase
    .from('select_hotel_benefits')
    .select('benefit_id, benefit, benefit_description, start_date, end_date')
    .in('benefit_id', ids)

  const rows = (benefitRows as BenefitRow[] | null) ?? []
  const order = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a, b) => (order.get(String(a.benefit_id)) ?? 0) - (order.get(String(b.benefit_id)) ?? 0))
  return rows
}

export async function updateHotelRow(params: { sabreId: string | null; paragonId: string | null }, updateData: Record<string, unknown>) {
  const { sabreId, paragonId } = params
  const supabase = createServiceRoleClient()
  
  try {
    // 디버깅: Sabre ID 313016인 경우
    if (sabreId === '313016') {
      console.log('=== updateHotelRow 디버깅 ===')
      console.log('params:', params)
      console.log('updateData:', updateData)
    }
    
    // select_hotels 테이블에 chain_id 컬럼이 없으므로 제거
    if ('chain_id' in updateData) {
      console.log('[updateHotelRow] chain_id 컬럼이 테이블에 없어 제거됨')
      delete updateData.chain_id
    }
    
    // 디버깅: 최종 업데이트 데이터
    if (sabreId === '313016') {
      console.log('최종 업데이트 데이터:', updateData)
    }
    
    // 업데이트 쿼리 실행
    let query = supabase.from('select_hotels').update(updateData)
    
    if (sabreId) {
      query = query.eq('sabre_id', sabreId)
    } else if (paragonId) {
      query = query.eq('paragon_id', paragonId)
    } else {
      throw new Error('sabre_id 또는 paragon_id가 필요합니다.')
    }
    
    const { data, error } = await query.select('sabre_id, paragon_id, property_name_ko, property_name_en, rate_code, brand_id').single()
    
    if (error) {
      console.error('호텔 업데이트 오류:', error)
      throw error
    }
    
    // 디버깅: 업데이트 결과
    if (sabreId === '313016') {
      console.log('업데이트 성공:', data)
    }
    
    return { data, error: null }
    
  } catch (error) {
    console.error('updateHotelRow 오류:', error)
    return { data: null, error: error as Error }
  }
}

export async function replaceBenefitMappings(options: {
  originalSabreId: string | null
  targetSabreId: string
  mappedIds: string[]
  sortMap: Map<string, number>
}) {
  const { originalSabreId, targetSabreId, mappedIds, sortMap } = options
  const supabase = createServiceRoleClient()

  if (originalSabreId && originalSabreId !== targetSabreId) {
    await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', originalSabreId)
  }

  await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', targetSabreId)

  const uniqueIds = Array.from(new Set(mappedIds.map(String)))
  if (uniqueIds.length === 0) return
  const rows = uniqueIds.map((id) => ({ sabre_id: targetSabreId, benefit_id: id, sort: sortMap.get(id) ?? 0 }))
  await supabase.from('select_hotel_benefits_map').insert(rows)
}


