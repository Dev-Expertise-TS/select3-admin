import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const brand_id = Number(formData.get('brand_id'))
    // brand_code는 현재 스키마에서 사용하지 않을 수 있으므로 무시
    const name_kr_raw = String(formData.get('name_kr') ?? '')
    const name_en_raw = String(formData.get('name_en') ?? '')
    const name_kr = name_kr_raw.trim()
    const name_en = name_en_raw.trim()
    const chain_id_raw = formData.get('chain_id')
    const chain_id = chain_id_raw == null || String(chain_id_raw).trim() === '' ? null : Number(chain_id_raw)

    console.log('[brand][server] received form:', {
      brand_id,
      name_kr,
      name_en,
      chain_id,
    })

    // brand_code 제약이 없는 스키마를 가정하므로 생성/저장은 name_kr/name_en/chain_id 중심으로 수행

    const supabase = createServiceRoleClient()
    console.log('[chain-brand][brand/save] op:', brand_id ? 'update' : 'insert', {
      brand_id,
      name_kr,
      name_en,
      chain_id,
    })
    const doUpsert = async (table: 'hotel_brands' | 'hotel_brand') => {
      if (brand_id && !Number.isNaN(brand_id)) {
        return supabase
          .from(table)
          .update({ name_kr: name_kr || null, name_en: name_en || null, chain_id })
          .eq('brand_id', brand_id)
          .select('*')
          .single()
      }
      if (!name_kr && !name_en) {
        return { data: null, error: { message: 'Either name_kr or name_en is required' } as unknown }
      }
      return supabase
        .from(table)
        .insert({ name_kr: name_kr || null, name_en: name_en || null, chain_id })
        .select('*')
        .single()
    }

    let result = await doUpsert('hotel_brands')
    if (result.error) {
      console.error('[chain-brand][brand/save] primary table error:', result.error)
      result = await doUpsert('hotel_brand')
    }
    if (result.error) {
      return NextResponse.json({ success: false, error: (result.error as { message?: string })?.message || 'Save failed' }, { status: 422 })
    }

    const status = brand_id && !Number.isNaN(brand_id) ? 200 : 201
    return NextResponse.json({ success: true, data: result.data }, { status })
  } catch (e) {
    console.error('[chain-brand][brand/save] error:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


