import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreId = searchParams.get('sabreId')
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 호텔 정보 조회
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, slug, image_1, image_2, image_3, image_4, image_5')
      .eq('sabre_id', sabreId)
      .single()

    if (error) {
      console.error('호텔 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: '호텔이 존재하지 않습니다.' },
        { status: 404 }
      )
    }

    // 이미지 URL 배열 생성 (빈 값 제외)
    const imageUrls = [
      hotel.image_1,
      hotel.image_2,
      hotel.image_3,
      hotel.image_4,
      hotel.image_5
    ].filter((url): url is string => Boolean(url && url.trim()))

    console.log('호텔 정보:', {
      sabreId: hotel.sabre_id,
      slug: hotel.slug,
      nameKr: hotel.property_name_ko,
      nameEn: hotel.property_name_en
    })

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          sabreId: hotel.sabre_id,
          nameKr: hotel.property_name_ko,
          nameEn: hotel.property_name_en,
          slug: hotel.slug
        },
        images: imageUrls.map((url, index) => ({
          column: `image_${index + 1}`,
          url,
          role: getImageRole(index + 1),
          seq: index + 1
        })),
        totalImages: imageUrls.length
      }
    })

  } catch (error) {
    console.error('호텔 이미지 조회 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '호텔 이미지 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// 이미지 컬럼 번호에 따른 역할 매핑
function getImageRole(columnNumber: number): 'hero' | 'room' | 'dining' | 'facility' | 'pool' {
  const roleMap: Record<number, 'hero' | 'room' | 'dining' | 'facility' | 'pool'> = {
    1: 'hero',
    2: 'room', 
    3: 'room',
    4: 'dining',
    5: 'facility'
  }
  
  return roleMap[columnNumber] || 'facility'
}
