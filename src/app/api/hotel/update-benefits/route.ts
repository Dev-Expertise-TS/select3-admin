import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabre_id, benefit_ids } = body

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!Array.isArray(benefit_ids)) {
      return NextResponse.json(
        { success: false, error: 'benefit_ids는 배열이어야 합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 기존 매핑 삭제
    const { error: deleteError } = await supabase
      .from('select_hotel_benefits_map')
      .delete()
      .eq('sabre_id', sabre_id)

    if (deleteError) {
      console.error('[hotel/update-benefits] 기존 매핑 삭제 오류:', deleteError)
      return NextResponse.json(
        { success: false, error: `기존 매핑 삭제 실패: ${deleteError.message}` },
        { status: 500 }
      )
    }

    // 새 매핑 추가 (benefit_ids가 비어있으면 삭제만 수행)
    if (benefit_ids.length > 0) {
      const mappings = benefit_ids.map((benefit_id, index) => ({
        sabre_id,
        benefit_id: String(benefit_id),
        sort: index
      }))

      const { error: insertError } = await supabase
        .from('select_hotel_benefits_map')
        .insert(mappings)

      if (insertError) {
        console.error('[hotel/update-benefits] 매핑 추가 오류:', insertError)
        return NextResponse.json(
          { success: false, error: `매핑 추가 실패: ${insertError.message}` },
          { status: 500 }
        )
      }
    }

    // 캐시 무효화
    revalidatePath('/admin/hotel-update')
    revalidatePath(`/admin/hotel-update/${sabre_id}`)

    return NextResponse.json({ 
      success: true,
      message: '혜택 매핑이 저장되었습니다.'
    })
  } catch (e) {
    console.error('[hotel/update-benefits] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
