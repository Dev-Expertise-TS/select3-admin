import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // 체인 데이터 조회
    let chainsRes = await supabase.from('hotel_chains').select('*').order('chain_id', { ascending: true })
    if (chainsRes.error) {
      console.error('[chain-brand-list] hotel_chains query error:', chainsRes.error)
      const fb = await supabase.from('hotel_chain').select('*').order('id', { ascending: true })
      if (!fb.error) chainsRes = fb
    }

    // 브랜드 데이터 조회
    let brandsRes = await supabase.from('hotel_brands').select('*').order('brand_id', { ascending: true })
    if (brandsRes.error) {
      console.error('[chain-brand-list] hotel_brands query error:', brandsRes.error)
      const fb = await supabase.from('hotel_brand').select('*').order('id', { ascending: true })
      if (!fb.error) brandsRes = fb
    }

    const getStr = (row: Record<string, unknown>, key: string): string | null => {
      const v = row[key]
      return typeof v === 'string' && v.length > 0 ? v : null
    }

    const chainsRaw = (chainsRes.data ?? []) as Array<Record<string, unknown>>
    const brandsRaw = (brandsRes.data ?? []) as Array<Record<string, unknown>>

    const chains = chainsRaw.map((r) => ({
      chain_id: Number(r.chain_id ?? 0),
      chain_code: String(r.chain_code ?? ''),
      name_kr: getStr(r, 'name_kr') ?? getStr(r, 'chain_name') ?? null,
      name_en: getStr(r, 'name_en') ?? null,
    }))

    const brands = brandsRaw.map((r) => ({
      brand_id: Number(r.brand_id ?? 0),
      brand_code: String(r.brand_code ?? ''),
      chain_id: typeof r.chain_id === 'number' ? (r.chain_id as number) : Number(r.chain_id ?? NaN) || null,
      name_kr: getStr(r, 'name_kr') ?? getStr(r, 'brand_name') ?? null,
      name_en: getStr(r, 'name_en') ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: { chains, brands }
    })
  } catch (error) {
    console.error('[chain-brand-list] error:', error)
    return NextResponse.json(
      { success: false, error: '체인/브랜드 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
