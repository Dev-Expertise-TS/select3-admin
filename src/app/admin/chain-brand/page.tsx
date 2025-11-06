import { createServiceRoleClient } from '@/lib/supabase/server'
import { ChainBrandTabs } from './_components/ChainBrandTabs'

type Chain = { 
  chain_id: number
  name_kr: string | null
  name_en: string | null
  chain_slug: string | null
  chain_sort_order?: number | null
  status?: string | null
}
type Brand = { 
  brand_id: number
  name_kr: string | null
  name_en: string | null
  brand_slug: string | null
  chain_id: number | null
  brand_sort_order?: number | null
  status?: string | null
}

async function getData() {
  const supabase = createServiceRoleClient()
  
  // 환경 키 존재 여부 확인

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[chain-brand] SUPABASE_SERVICE_ROLE_KEY is not set')
    throw new Error('Supabase Service Role Key가 설정되지 않았습니다.')
  }

  try {
    // 체인 데이터 조회 - 최신 레코드가 맨 위에 오도록 내림차순 정렬
    console.log('[chain-brand] Fetching chains data...')
    const chainsRes = await supabase.from('hotel_chains').select('*').order('chain_id', { ascending: false })
    if (chainsRes.error) {
      console.error('[chain-brand] chains query error:', chainsRes.error)
      throw new Error(`체인 목록 조회 중 오류가 발생했습니다: ${chainsRes.error.message}`)
    }
    console.log(`[chain-brand] Fetched ${chainsRes.data?.length || 0} chains`)

    // 브랜드 데이터 조회 - 최신 레코드가 맨 위에 오도록 내림차순 정렬
    console.log('[chain-brand] Fetching brands data...')
    const brandsRes = await supabase.from('hotel_brands').select('*').order('brand_id', { ascending: false })
    if (brandsRes.error) {
      console.error('[chain-brand] brands query error:', brandsRes.error)
      console.error('[chain-brand] brands query error details:', {
        code: brandsRes.error.code,
        details: brandsRes.error.details,
        hint: brandsRes.error.hint,
        message: brandsRes.error.message
      })
      throw new Error(`브랜드 목록 조회 중 오류가 발생했습니다: ${brandsRes.error.message}`)
    }
    console.log(`[chain-brand] Fetched ${brandsRes.data?.length || 0} brands`)

    // 실제 컬럼명 확인 (데이터가 있을 때만)
    const chainsColumns = chainsRes.data && chainsRes.data.length > 0 ? Object.keys(chainsRes.data[0]) : []
    const brandsColumns = brandsRes.data && brandsRes.data.length > 0 ? Object.keys(brandsRes.data[0]) : []
    
    console.log('[chain-brand] Available chains columns:', chainsColumns)
    console.log('[chain-brand] Available brands columns:', brandsColumns)



    // 타입 안전한 값 추출 헬퍼 함수
    const safeString = (value: unknown): string | null => {
      if (typeof value === 'string') return value
      if (value === null || value === undefined) return null
      return String(value)
    }

    // 동적으로 컬럼 매핑
    const chains: Chain[] = (chainsRes.data ?? []).map((r: Record<string, unknown>) => {
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
      
      // chain_slug 컬럼 찾기
      const chainSlugKey = chainsColumns.find(key => 
        key.toLowerCase() === 'chain_slug' || key.toLowerCase() === 'slug'
      ) || 'chain_slug'
      
      // chain_sort_order 컬럼 찾기
      const sortOrderKey = chainsColumns.find(key => 
        key.toLowerCase().includes('sort') && key.toLowerCase().includes('order')
      ) || 'chain_sort_order'
      
      // status 컬럼 찾기
      const statusKey = chainsColumns.find(key => 
        key.toLowerCase() === 'status'
      ) || 'status'

      const mappedChain = {
        chain_id: Number(r[chainIdKey] ?? 0),
        name_kr: safeString(r[nameKrKey]),
        name_en: safeString(r[nameEnKey]),
        chain_slug: safeString(r[chainSlugKey]),
        chain_sort_order: r[sortOrderKey] ? Number(r[sortOrderKey]) : null,
        status: safeString(r[statusKey]) || 'active',
      }
      
      console.log('[chain-brand] Mapped chain:', mappedChain)
      return mappedChain
    })

    const brands: Brand[] = (brandsRes.data ?? []).map((r: Record<string, unknown>) => {
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
      
      // brand_slug 컬럼 찾기
      const brandSlugKey = brandsColumns.find(key => 
        key.toLowerCase() === 'brand_slug' || key.toLowerCase() === 'slug'
      ) || 'brand_slug'
      
      // brand_sort_order 컬럼 찾기
      const sortOrderKey = brandsColumns.find(key => 
        key.toLowerCase().includes('sort') && key.toLowerCase().includes('order')
      ) || 'brand_sort_order'
      
      // status 컬럼 찾기
      const statusKey = brandsColumns.find(key => 
        key.toLowerCase() === 'status'
      ) || 'status'

      const mappedBrand = {
        brand_id: Number(r[brandIdKey] ?? 0),
        chain_id: r[chainIdKey] ? Number(r[chainIdKey]) : null,
        name_kr: safeString(r[nameKrKey]),
        name_en: safeString(r[nameEnKey]),
        brand_slug: safeString(r[brandSlugKey]),
        brand_sort_order: r[sortOrderKey] ? Number(r[sortOrderKey]) : null,
        status: safeString(r[statusKey]) || 'active',
      }
      
      console.log('[chain-brand] Mapped brand:', mappedBrand)
      return mappedBrand
    })


    return { chains, brands }
  } catch (error) {
    console.error('[chain-brand] getData exception:', error)
    
    // 더 자세한 에러 정보 출력
    if (error instanceof Error) {
      console.error('[chain-brand] Error name:', error.name)
      console.error('[chain-brand] Error message:', error.message)
      console.error('[chain-brand] Error stack:', error.stack)
    }
    
    throw error
  }
}

export default async function ChainBrandPage() {
  try {
    const { chains, brands } = await getData()

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            {/* Network icon removed as per new_code */}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">체인 브랜드 관리</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 체인/브랜드 데이터를 조회하고 관리합니다.</p>
          </div>
        </div>

        {/* 스키마 정보 표시 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-900">테이블 스키마 정보</h3>
            <details className="text-xs text-blue-700">
              <summary className="cursor-pointer hover:text-blue-900">자세히 보기</summary>
              <div className="mt-2 space-y-2 text-xs">
                <div>
                  <strong>hotel_chains:</strong> {chains.length > 0 ? `${Object.keys(chains[0]).join(', ')}` : '데이터 없음'}
                </div>
                <div>
                  <strong>hotel_brands:</strong> {brands.length > 0 ? `${Object.keys(brands[0]).join(', ')}` : '데이터 없음'}
                </div>
                <div className="text-blue-600">
                  💡 실제 테이블 컬럼명이 변경된 경우 자동으로 매핑됩니다.
                </div>
              </div>
            </details>
          </div>
        </div>

        <ChainBrandTabs initialChains={chains} initialBrands={brands} />
      </div>
    )
  } catch (error) {
    console.error('[chain-brand] page error:', error)
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            {/* Network icon removed as per new_code */}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">체인 브랜드 관리</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 체인/브랜드 데이터를 조회하고 관리합니다.</p>
          </div>
        </div>

        <div className="p-8 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>데이터 조회 오류:</strong> {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
          </div>
          
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">문제 해결 방법:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>환경 변수 <code>SUPABASE_SERVICE_ROLE_KEY</code>가 설정되어 있는지 확인</li>
              <li>Supabase에서 <code>hotel_chains</code>와 <code>hotel_brands</code> 테이블이 생성되어 있는지 확인</li>
              <li>테이블 스키마가 올바른지 확인</li>
              <li>Supabase 프로젝트가 활성 상태인지 확인</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
}


