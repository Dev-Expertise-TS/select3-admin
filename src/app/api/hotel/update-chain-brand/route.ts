import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabre_id, brand_id } = body

    if (!sabre_id) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // brand_id 업데이트 (null 허용)
    const { error } = await supabase
      .from('select_hotels')
      .update({ brand_id: brand_id || null })
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
