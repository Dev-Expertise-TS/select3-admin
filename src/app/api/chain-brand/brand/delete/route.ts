import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const brand_id = Number(formData.get('id'))
    if (!brand_id) return NextResponse.json({ success: false, error: 'brand_id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()
    
    // 먼저 해당 브랜드에 연결된 호텔이 있는지 확인
    const { data: hotels } = await supabase
      .from('select_hotels')
      .select('sabre_id')
      .eq('brand_id', brand_id)
    
    if (hotels && hotels.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 브랜드에 연결된 호텔이 있어 삭제할 수 없습니다.' 
      }, { status: 409 })
    }

    const { error } = await supabase.from('hotel_brands').delete().eq('brand_id', brand_id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[brand-delete] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


