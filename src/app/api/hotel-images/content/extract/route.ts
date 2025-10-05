import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabreId } = body
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log('본문 이미지 추출 요청:', { sabreId })

    const supabase = createServiceRoleClient()

    // 호텔 정보 조회
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, slug, property_details, property_location')
      .eq('sabre_id', sabreId)
      .single()

    if (error || !hotel) {
      console.error('호텔 조회 오류:', error)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: '호텔에 slug가 설정되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    // 이미지 URL 추출 함수
    const extractImageUrls = (content: string, source: 'property_details' | 'property_location') => {
      if (!content) return []
      
      const imageUrls: { url: string; source: string; context?: string }[] = []
      
      // HTML img 태그에서 src 추출
      const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
      let match
      
      while ((match = imgRegex.exec(content)) !== null) {
        const url = match[1].trim()
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          // 이미지 주변 텍스트 추출 (컨텍스트)
          const contextStart = Math.max(0, match.index - 100)
          const contextEnd = Math.min(content.length, match.index + match[0].length + 100)
          const context = content.substring(contextStart, contextEnd).replace(/<[^>]*>/g, '').trim()
          
          imageUrls.push({
            url,
            source,
            context: context.length > 50 ? context : undefined
          })
        }
      }

      // 일반적인 이미지 URL 패턴 추출 (img 태그가 없는 경우)
      const urlRegex = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"']*)?/gi
      while ((match = urlRegex.exec(content)) !== null) {
        const url = match[0].trim()
        if (!imageUrls.some(img => img.url === url)) {
          imageUrls.push({
            url,
            source
          })
        }
      }

      return imageUrls
    }

    // property_details에서 이미지 URL 추출
    const detailsImages = extractImageUrls(hotel.property_details || '', 'property_details')
    
    // property_location에서 이미지 URL 추출
    const locationImages = extractImageUrls(hotel.property_location || '', 'property_location')

    // 모든 이미지 URL 합치기
    const extractedImages = [...detailsImages, ...locationImages]

    // 중복 URL 제거
    const uniqueImages = extractedImages.filter((image, index, self) => 
      index === self.findIndex(img => img.url === image.url)
    )

    console.log(`호텔 ${sabreId}에서 ${uniqueImages.length}개 이미지 추출:`, {
      details: detailsImages.length,
      location: locationImages.length,
      unique: uniqueImages.length
    })

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          sabreId: hotel.sabre_id,
          slug: hotel.slug
        },
        extractedImages: uniqueImages,
        statistics: {
          detailsImages: detailsImages.length,
          locationImages: locationImages.length,
          totalImages: uniqueImages.length
        }
      },
      message: `${uniqueImages.length}개의 본문 이미지를 추출했습니다.`
    })

  } catch (error) {
    console.error('본문 이미지 추출 오류:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '본문 이미지 추출 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}
