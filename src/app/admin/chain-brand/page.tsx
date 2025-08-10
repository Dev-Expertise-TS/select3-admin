import { createServiceRoleClient } from '@/lib/supabase/server'
import { ChainBrandManager } from './_components/ChainBrandManager'
import { Network } from 'lucide-react'

export const revalidate = 0
export const dynamic = 'force-dynamic'

type Chain = { chain_id: number; chain_code: string; name_kr: string | null; name_en: string | null }
type Brand = { brand_id: number; brand_code: string; name_kr: string | null; name_en: string | null; chain_id: number | null }

async function getData() {
  const supabase = createServiceRoleClient()
  // 환경 키 존재 여부(값은 노출하지 않음)
  console.log('[chain-brand] env SUPABASE_SERVICE_ROLE_KEY set:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))
  console.log('[chain-brand] env NEXT_PUBLIC_SUPABASE_URL set:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))

  // 우선 기본 테이블명으로 조회, 실패 시 단수형으로 폴백
  let chainsRes = await supabase.from('hotel_chains').select('*').order('chain_id', { ascending: true })
  if (chainsRes.error) {
    console.error('[chain-brand] hotel_chains query error:', chainsRes.error)
    const fb = await supabase.from('hotel_chain').select('*').order('id', { ascending: true })
    if (!fb.error) chainsRes = fb
  }

  let brandsRes = await supabase.from('hotel_brands').select('*').order('brand_id', { ascending: true })
  if (brandsRes.error) {
    console.error('[chain-brand] hotel_brands query error:', brandsRes.error)
    const fb = await supabase.from('hotel_brand').select('*').order('id', { ascending: true })
    if (!fb.error) brandsRes = fb
  }

  const getStr = (row: Record<string, unknown>, key: string): string | null => {
    const v = row[key]
    return typeof v === 'string' && v.length > 0 ? v : null
  }

  const chainsRaw = (chainsRes.data ?? []) as Array<Record<string, unknown>>
  const brandsRaw = (brandsRes.data ?? []) as Array<Record<string, unknown>>

  const chains: Chain[] = chainsRaw.map((r) => ({
    chain_id: Number(r.chain_id ?? 0),
    chain_code: String(r.chain_code ?? ''),
    name_kr: getStr(r, 'name_kr') ?? getStr(r, 'chain_name') ?? null,
    name_en: getStr(r, 'name_en') ?? null,
  }))

  const brands: Brand[] = brandsRaw.map((r) => ({
    brand_id: Number(r.brand_id ?? 0),
    brand_code: String(r.brand_code ?? ''),
    chain_id: typeof r.chain_id === 'number' ? (r.chain_id as number) : Number(r.chain_id ?? NaN) || null,
    name_kr: getStr(r, 'name_kr') ?? getStr(r, 'brand_name') ?? null,
    name_en: getStr(r, 'name_en') ?? null,
  }))

  return { chains, brands }
}

export default async function ChainBrandPage() {
  const { chains, brands } = await getData()
  // 서버 콘솔 로깅: 호텔 체인 원시 데이터
  // 주의: 서비스 환경에서는 과도한 로깅을 피하세요
  console.log('[chain-brand] fetched chains:', chains.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Network className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">체인 브랜드 관리</h1>
          <p className="text-sm text-gray-600 mt-1">호텔 체인/브랜드 데이터를 조회하고 관리합니다.</p>
        </div>
      </div>

      <ChainBrandManager chains={chains} brands={brands} />
    </div>
  )
}


