import { NextRequest, NextResponse } from 'next/server'
import { updateHotelRow, replaceBenefitMappings } from '@/features/hotels/lib/repository'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    const sabreId = (formData.get('sabre_id') as string | null) ?? null
    const sabreIdEditable = (formData.get('sabre_id_editable') as string | null)?.trim() || null
    const property_name_kor = (formData.get('property_name_kor') as string | null) ?? null
    const property_name_eng = (formData.get('property_name_eng') as string | null) ?? null
    const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
    const ratePlanCodesParsed = ratePlanCodesRaw ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
    const rate_plan_codes = ratePlanCodesParsed.length > 0 ? ratePlanCodesParsed : null
    
    // 체인/브랜드 정보
    const chain_id_raw = formData.get('chain_id')
    const brand_id_raw = formData.get('brand_id')
    
    const chain_id = chain_id_raw ? Number(chain_id_raw) || null : null
    const brand_id = brand_id_raw ? Number(brand_id_raw) || null : null

    // 호텔 기본 정보 업데이트 (체인/브랜드 포함)
    const updatePayload = { 
      property_name_kor, 
      property_name_eng, 
      rate_plan_codes, 
      sabre_id: sabreIdEditable,
      chain_id,
      brand_id
    }
    await updateHotelRow({ sabreId, paragonId: null }, updatePayload)

    // Benefits 매핑 업데이트
    const mappedIds = formData.getAll('mapped_benefit_id').map((v) => String(v))
    const mappedSortPairs: Array<{ id: string; sort: number }> = mappedIds.map((id, idx) => {
      const key = `mapped_sort__${id}`
      const raw = formData.get(key) as string | null
      const sort = raw != null ? Number(raw) : idx
      return { id, sort: Number.isFinite(sort) ? sort : idx }
    })
    const targetSabreId = sabreIdEditable || sabreId || null
    if (targetSabreId) {
      const uniqueIds = Array.from(new Set(mappedIds.map(String)))
      const sortMap = new Map(mappedSortPairs.map((p) => [p.id, p.sort]))
      await replaceBenefitMappings({ originalSabreId: sabreId, targetSabreId, mappedIds: uniqueIds, sortMap })
    }

    return NextResponse.json({ 
      success: true, 
      data: { sabre_id: sabreIdEditable || sabreId }
    })
  } catch (error) {
    console.error('호텔 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
