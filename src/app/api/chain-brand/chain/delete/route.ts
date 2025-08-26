import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const chain_id = Number(formData.get('chain_id'))
    if (!chain_id) return NextResponse.json({ success: false, error: 'chain_id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()
    
    // 먼저 해당 체인에 연결된 브랜드가 있는지 확인
    const { data: brands } = await supabase
      .from('hotel_brands')
      .select('brand_id')
      .eq('chain_id', chain_id)
    
    if (brands && brands.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: '해당 체인에 연결된 브랜드가 있어 삭제할 수 없습니다.' 
      }, { status: 409 })
    }

    const { error } = await supabase.from('hotel_chains').delete().eq('chain_id', chain_id)
    if (error) throw error

    revalidatePath('/admin/chain-brand')
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[chain-delete] error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}


