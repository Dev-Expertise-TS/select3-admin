import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabre_id, brand_id, brand_id_2, brand_id_3, brand_position } = body

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 브랜드 정보 조회 (brand_name도 함께 업데이트하기 위해)
    const brandIds = [brand_id, brand_id_2, brand_id_3].filter(Boolean) as number[]
    let brandMap = new Map<number, { brand_name_ko: string | null; brand_name_en: string | null }>()

    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from('hotel_brands')
        .select('brand_id, brand_name_ko, brand_name_en')
        .in('brand_id', brandIds)

      if (brands) {
        brands.forEach(brand => {
          brandMap.set(brand.brand_id, {
            brand_name_ko: brand.brand_name_ko,
            brand_name_en: brand.brand_name_en
          })
        })
      }
    }

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    // 브랜드1 업데이트
    if (brand_position === 1 || brand_position === undefined) {
      updateData.brand_id = brand_id || null
      if (brand_id && brandMap.has(brand_id)) {
        const brand = brandMap.get(brand_id)!
        updateData.brand_name_kr = brand.brand_name_ko
        updateData.brand_name_en = brand.brand_name_en
      } else if (!brand_id) {
        updateData.brand_name_kr = null
        updateData.brand_name_en = null
      }
    }

    // 브랜드2 업데이트
    if (brand_position === 2 || brand_position === undefined) {
      updateData.brand_id_2 = brand_id_2 || null
      if (brand_id_2 && brandMap.has(brand_id_2)) {
        const brand = brandMap.get(brand_id_2)!
        updateData.brand_name_kr_2 = brand.brand_name_ko
        updateData.brand_name_en_2 = brand.brand_name_en
      } else if (!brand_id_2) {
        updateData.brand_name_kr_2 = null
        updateData.brand_name_en_2 = null
      }
    }

    // 브랜드3 업데이트
    if (brand_position === 3 || brand_position === undefined) {
      updateData.brand_id_3 = brand_id_3 || null
      if (brand_id_3 && brandMap.has(brand_id_3)) {
        const brand = brandMap.get(brand_id_3)!
        updateData.brand_name_kr_3 = brand.brand_name_ko
        updateData.brand_name_en_3 = brand.brand_name_en
      } else if (!brand_id_3) {
        updateData.brand_name_kr_3 = null
        updateData.brand_name_en_3 = null
      }
    }

    // 모든 브랜드 업데이트 (brand_position이 지정되지 않은 경우)
    if (brand_position === undefined) {
      updateData.brand_id = brand_id || null
      updateData.brand_id_2 = brand_id_2 || null
      updateData.brand_id_3 = brand_id_3 || null

      if (brand_id && brandMap.has(brand_id)) {
        const brand = brandMap.get(brand_id)!
        updateData.brand_name_kr = brand.brand_name_ko
        updateData.brand_name_en = brand.brand_name_en
      } else if (!brand_id) {
        updateData.brand_name_kr = null
        updateData.brand_name_en = null
      }

      if (brand_id_2 && brandMap.has(brand_id_2)) {
        const brand = brandMap.get(brand_id_2)!
        updateData.brand_name_kr_2 = brand.brand_name_ko
        updateData.brand_name_en_2 = brand.brand_name_en
      } else if (!brand_id_2) {
        updateData.brand_name_kr_2 = null
        updateData.brand_name_en_2 = null
      }

      if (brand_id_3 && brandMap.has(brand_id_3)) {
        const brand = brandMap.get(brand_id_3)!
        updateData.brand_name_kr_3 = brand.brand_name_ko
        updateData.brand_name_en_3 = brand.brand_name_en
      } else if (!brand_id_3) {
        updateData.brand_name_kr_3 = null
        updateData.brand_name_en_3 = null
      }
    }

    const { error } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabre_id)

    if (error) {
      console.error('[hotel/update-chain-brand] 업데이트 오류:', error)
      return NextResponse.json(
        { success: false, error: `업데이트 실패: ${error.message}` },
        { status: 500 }
      )
    }

    // 캐시 무효화
    revalidatePath('/admin/hotel-update')
    revalidatePath(`/admin/hotel-update/${sabre_id}`)

    return NextResponse.json({ 
      success: true,
      message: '체인/브랜드 정보가 저장되었습니다.'
    })
  } catch (e) {
    console.error('[hotel/update-chain-brand] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
