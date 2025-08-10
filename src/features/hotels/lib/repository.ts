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
  
  // 먼저 브랜드 정보를 조회 (fallback 로직 포함)
  if (hotel.brand_id) {
    // 디버깅: Sabre ID 313016인 경우
    if (String(hotel.sabre_id) === '313016') {
      console.log('=== Repository 브랜드 조회 디버깅 ===')
      console.log('hotel.brand_id:', hotel.brand_id)
    }
    
    // hotel_brands 테이블에서 존재하는 컬럼만 조회
    let brandRes = await supabase
      .from('hotel_brands')
      .select('brand_id, name_kr, name_en, chain_id')
      .eq('brand_id', hotel.brand_id)
      .single()
    
    // 디버깅: 조회 결과
    if (String(hotel.sabre_id) === '313016') {
      console.log('hotel_brands 테이블 조회 결과:', brandRes)
      console.log('오류:', brandRes.error)
      console.log('데이터:', brandRes.data)
    }
    
    brandData = brandRes.data
    
    // 디버깅: 최종 brandData
    if (String(hotel.sabre_id) === '313016') {
      console.log('최종 brandData:', brandData)
      console.log('===============================')
    }
    
    // 브랜드의 chain_id로 체인 정보 조회
    if (brandRes.data?.chain_id) {
      let chainRes = await supabase
        .from('hotel_chains')
        .select('chain_id, name_kr, name_en')
        .eq('chain_id', brandRes.data.chain_id)
        .single()
      
      // 디버깅: 체인 조회 결과
      if (String(hotel.sabre_id) === '313016') {
        console.log('hotel_chains 테이블 조회 결과:', chainRes)
        console.log('체인 오류:', chainRes.error)
        console.log('체인 데이터:', chainRes.data)
      }
      
      chainData = chainRes.data
    }
  }
  
  // 만약 브랜드가 없고 호텔에 직접 chain_id가 있다면 (fallback)
  if (!chainData && hotel.chain_id) {
    let chainRes = await supabase
      .from('hotel_chains')
      .select('chain_id, name_kr, name_en')
      .eq('chain_id', hotel.chain_id)
      .single()
    
    // 디버깅: 직접 체인 조회 결과
    if (String(hotel.sabre_id) === '313016') {
      console.log('호텔 직접 chain_id로 조회 결과:', chainRes)
      console.log('직접 체인 오류:', chainRes.error)
      console.log('직접 체인 데이터:', chainRes.data)
    }
    
    chainData = chainRes.data
  }
  
  // 결과 조합
  const combinedData = {
    ...hotel,
    hotel_chains: chainData,
    hotel_brands: brandData
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

export async function updateHotelRow(match: { sabreId: string | null; paragonId: string | null }, updates: Record<string, unknown>) {
  const supabase = createServiceRoleClient()
  let query = supabase.from('select_hotels').update(updates)
  if (match.sabreId) query = query.eq('sabre_id', match.sabreId)
  else if (match.paragonId) query = query.eq('paragon_id', match.paragonId)
  return query.select('sabre_id').single()
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


