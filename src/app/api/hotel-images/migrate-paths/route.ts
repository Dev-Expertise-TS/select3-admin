import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { 
  buildPublicFilename, 
  buildPublicPath,
  MEDIA_BUCKET
} from '@/lib/media-naming'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabreId, hotelSlug } = body
    
    if (!sabreId || !hotelSlug) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID와 호텔 슬러그는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log('경로 마이그레이션 요청:', { sabreId, hotelSlug })

    const supabase = createServiceRoleClient()

    // 현재 호텔 정보 조회
    const { data: hotel, error: fetchError } = await supabase
      .from('select_hotels')
      .select('sabre_id, image_1, image_2, image_3, image_4, image_5')
      .eq('sabre_id', sabreId)
      .single()

    if (fetchError || !hotel) {
      console.error('호텔 조회 오류:', fetchError)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // Supabase Storage URL 생성
    const newImageUrls = []
    const updateData: Record<string, string | null> = {}
    
    for (let i = 1; i <= 5; i++) {
      const publicFilename = buildPublicFilename({
        hotelSlug,
        sabreId,
        seq: i,
        width: 1600,
        format: 'avif'
      })

      const publicPath = buildPublicPath(hotelSlug, publicFilename)
      
      // Supabase Storage 공개 URL 생성
      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(publicPath)

      const newUrl = publicUrlData.publicUrl
      newImageUrls.push(newUrl)
      updateData[`image_${i}`] = newUrl

      console.log(`이미지 ${i}: ${hotel[`image_${i}` as keyof typeof hotel]} → ${newUrl}`)
    }

    // 데이터베이스 업데이트
    const { data: updateResult, error: updateError } = await supabase
      .from('select_hotels')
      .update(updateData)
      .eq('sabre_id', sabreId)
      .select()

    if (updateError) {
      console.error('데이터베이스 업데이트 오류:', updateError)
      return NextResponse.json(
        { success: false, error: '데이터베이스 업데이트에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 업데이트된 결과 확인
    const updatedCount = Object.values(updateData).filter(url => url !== null).length

    return NextResponse.json({
      success: true,
      data: {
        sabreId,
        hotelSlug,
        updatedImages: updatedCount,
        newUrls: newImageUrls,
        updateData
      },
      message: `${updatedCount}개의 이미지 경로가 Supabase Storage URL로 업데이트되었습니다.`
    })

  } catch (error) {
    console.error('경로 마이그레이션 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '경로 마이그레이션 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

// GET 요청으로 현재 이미지 경로 상태 확인
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

    // 호텔 이미지 정보 조회
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, image_1, image_2, image_3, image_4, image_5')
      .eq('sabre_id', sabreId)
      .single()

    if (error || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const currentImages = [
      hotel.image_1,
      hotel.image_2,
      hotel.image_3,
      hotel.image_4,
      hotel.image_5
    ].filter((url): url is string => Boolean(url && url.trim()))

    return NextResponse.json({
      success: true,
      data: {
        sabreId,
        currentImages,
        totalImages: currentImages.length,
        imagePaths: {
          image_1: hotel.image_1,
          image_2: hotel.image_2,
          image_3: hotel.image_3,
          image_4: hotel.image_4,
          image_5: hotel.image_5
        }
      }
    })

  } catch (error) {
    console.error('이미지 경로 조회 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '이미지 경로 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
