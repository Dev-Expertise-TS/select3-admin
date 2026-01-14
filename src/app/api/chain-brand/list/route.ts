import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // 환경 변수 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[chain-brand-list] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { success: false, error: 'Supabase Service Role Key가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const supabase = createServiceRoleClient()

    // 먼저 테이블이 존재하는지 확인
    const { error: tableCheckError } = await supabase
      .from('hotel_chains')
      .select('chain_id')
      .limit(1)
    
    if (tableCheckError) {
      console.error('[chain-brand-list] hotel_chains table check error:', tableCheckError)
      if (tableCheckError.message.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'hotel_chains 테이블이 존재하지 않습니다. Supabase에서 테이블을 생성해주세요.' },
          { status: 500 }
        )
      }
      return NextResponse.json(
        { success: false, error: `테이블 접근 오류: ${tableCheckError.message}` },
        { status: 500 }
      )
    }

    // 실제 테이블 구조 확인을 위해 샘플 데이터 조회
    const { data: chainsSample, error: chainsSampleError } = await supabase
      .from('hotel_chains')
      .select('*')
      .limit(1)
    
    if (chainsSampleError) {
      console.error('[chain-brand-list] hotel_chains sample error:', chainsSampleError)
      return NextResponse.json(
        { success: false, error: `체인 샘플 데이터 조회 오류: ${chainsSampleError.message}` },
        { status: 500 }
      )
    }

    const { data: brandsSample, error: brandsSampleError } = await supabase
      .from('hotel_brands')
      .select('*')
      .limit(1)
    
    if (brandsSampleError) {
      console.error('[chain-brand-list] hotel_brands sample error:', brandsSampleError)
      return NextResponse.json(
        { success: false, error: `브랜드 샘플 데이터 조회 오류: ${brandsSampleError.message}` },
        { status: 500 }
      )
    }

    // 실제 컬럼명 확인
    const chainsColumns = chainsSample && chainsSample.length > 0 ? Object.keys(chainsSample[0]) : []
    const brandsColumns = brandsSample && brandsSample.length > 0 ? Object.keys(brandsSample[0]) : []
    
    console.log('[chain-brand-list] Actual hotel_chains columns:', chainsColumns)
    console.log('[chain-brand-list] Actual hotel_brands columns:', brandsColumns)

    // 체인 데이터 조회 (chain_sort_order로 정렬, 없으면 chain_id로 정렬)
    const chainsRes = await supabase
      .from('hotel_chains')
      .select('*')
      .order('chain_sort_order', { ascending: true, nullsFirst: false })
      .order('chain_id', { ascending: true })
    if (chainsRes.error) {
      console.error('[chain-brand-list] hotel_chains query error:', chainsRes.error)
      return NextResponse.json(
        { success: false, error: `체인 목록 조회 중 오류가 발생했습니다: ${chainsRes.error.message}` },
        { status: 500 }
      )
    }

    // 브랜드 데이터 조회
    const brandsRes = await supabase.from('hotel_brands').select('*').order('brand_id', { ascending: true })
    if (brandsRes.error) {
      console.error('[chain-brand-list] hotel_brands query error:', brandsRes.error)
      return NextResponse.json(
        { success: false, error: `브랜드 목록 조회 중 오류가 발생했습니다: ${brandsRes.error.message}` },
        { status: 500 }
      )
    }

    console.log('[chain-brand-list] Raw chains data:', chainsRes.data)
    console.log('[chain-brand-list] Raw brands data:', brandsRes.data)

    // 타입 안전한 값 추출 헬퍼 함수
    const safeString = (value: unknown): string | null => {
      if (typeof value === 'string') return value
      if (value === null || value === undefined) return null
      return String(value)
    }

    // 동적으로 컬럼 매핑 - 체인
    const chains = (chainsRes.data ?? []).map((r: Record<string, unknown>) => {
      // chain_id 컬럼 찾기 (chain_id, id, chainId 등)
      const chainIdKey = chainsColumns.find(key => 
        key.toLowerCase().includes('chain') && key.toLowerCase().includes('id')
      ) || 'chain_id'
      
      // name_ko 컬럼 찾기 (name_ko, chain_name_ko, name_kr 등)
      const nameKrKey = chainsColumns.find(key => 
        key.toLowerCase().includes('name') && (key.toLowerCase().includes('kr') || key.toLowerCase().includes('ko'))
      ) || 'name_kr'
      
      // name_en 컬럼 찾기 (name_en, name_en, chain_name_en 등)
      const nameEnKey = chainsColumns.find(key => 
        key.toLowerCase().includes('name') && key.toLowerCase().includes('en')
      ) || 'name_en'
      
      // slug 컬럼 찾기 (slug, chain_slug 등 다양한 케이스 대응)
      const slugKey = chainsColumns.find(key => {
        const k = key.toLowerCase()
        return k === 'slug' || k === 'chain_slug' || k.includes('slug')
      }) || 'slug'
      
      // chain_sort_order 컬럼 찾기
      const sortOrderKey = chainsColumns.find(key => 
        key.toLowerCase().includes('sort') && key.toLowerCase().includes('order')
      ) || 'chain_sort_order'

      return {
        chain_id: Number(r[chainIdKey] ?? 0),
        name_kr: safeString(r[nameKrKey]),
        name_en: safeString(r[nameEnKey]),
        slug: safeString(r[slugKey]),
        chain_sort_order: r[sortOrderKey] ? Number(r[sortOrderKey]) : null,
      }
    })

    // 동적으로 컬럼 매핑 - 브랜드
    const brands = (brandsRes.data ?? []).map((r: Record<string, unknown>) => {
      // brand_id 컬럼 찾기
      const brandIdKey = brandsColumns.find(key => 
        key.toLowerCase().includes('brand') && key.toLowerCase().includes('id')
      ) || 'brand_id'
      
      // chain_id 컬럼 찾기
      const chainIdKey = brandsColumns.find(key => 
        key.toLowerCase().includes('chain') && key.toLowerCase().includes('id')
      ) || 'chain_id'
      
      // name_kr 컬럼 찾기
      const nameKrKey = brandsColumns.find(key => 
        key.toLowerCase().includes('name') && (key.toLowerCase().includes('kr') || key.toLowerCase().includes('ko'))
      ) || 'name_kr'
      
      // name_en 컬럼 찾기
      const nameEnKey = brandsColumns.find(key => 
        key.toLowerCase().includes('name') && key.toLowerCase().includes('en')
      ) || 'name_en'

      return {
        brand_id: Number(r[brandIdKey] ?? 0),
        chain_id: r[chainIdKey] ? Number(r[chainIdKey]) : null,
        name_kr: safeString(r[nameKrKey]),
        name_en: safeString(r[nameEnKey]),
      }
    })

    console.log('[chain-brand-list] Processed chains:', chains)
    console.log('[chain-brand-list] Processed brands:', brands)

    return NextResponse.json({
      success: true,
      data: { chains, brands },
      debug: {
        chainsCount: chains.length,
        brandsCount: brands.length,
        chainsColumns: chainsColumns,
        rawChainsCount: chainsRes.data?.length || 0
      }
    })
  } catch (error) {
    console.error('[chain-brand-list] error:', error)
    return NextResponse.json(
      { success: false, error: '체인/브랜드 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
