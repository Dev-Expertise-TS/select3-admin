import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface UpdateImagesRequest {
  sabre_id: string
  image_1?: string | null
  image_2?: string | null
  image_3?: string | null
  image_4?: string | null
  image_5?: string | null
}

interface HotelImageData {
  sabre_id: string | null
  property_name_ko: string | null
  property_name_en: string | null
  image_1: string | null
  image_2: string | null
  image_3: string | null
  image_4: string | null
  image_5: string | null
}

interface UpdateImagesResponse {
  success: boolean
  data?: HotelImageData
  error?: string
}

export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateImagesRequest = await request.json()
    const { sabre_id, image_1, image_2, image_3, image_4, image_5 } = body

    if (!sabre_id) {
      return NextResponse.json<UpdateImagesResponse>(
        { success: false, error: 'Sabre ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 빈 문자열을 null로 변환
    const updateData = {
      image_1: image_1 === '' ? null : image_1,
      image_2: image_2 === '' ? null : image_2,
      image_3: image_3 === '' ? null : image_3,
      image_4: image_4 === '' ? null : image_4,
      image_5: image_5 === '' ? null : image_5,
    }

    const supabase = createServiceRoleClient()
    
    // select_hotels 테이블에서 해당 호텔의 이미지 정보 업데이트
    const { data: updatedHotel, error: updateError } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabre_id)
      .select(`
        sabre_id,
        property_name_ko,
        property_name_en,
        image_1,
        image_2,
        image_3,
        image_4,
        image_5
      `)
      .single()

    if (updateError) {
      console.error('호텔 이미지 업데이트 오류:', updateError)
      return NextResponse.json<UpdateImagesResponse>(
        { success: false, error: '호텔 이미지 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    if (!updatedHotel) {
      return NextResponse.json<UpdateImagesResponse>(
        { success: false, error: '해당 Sabre ID의 호텔을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json<UpdateImagesResponse>({
      success: true,
      data: updatedHotel
    })

  } catch (error) {
    console.error('호텔 이미지 업데이트 오류:', error)
    return NextResponse.json<UpdateImagesResponse>(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}