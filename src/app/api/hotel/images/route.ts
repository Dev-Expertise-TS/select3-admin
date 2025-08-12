import { NextRequest, NextResponse } from 'next/server'

interface HotelImage {
  id: string
  url: string
  caption?: string
  category?: string
  width?: number
  height?: number
}

interface SabreImageResponse {
  success: boolean
  data?: HotelImage[]
  error?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreCode = searchParams.get('sabreCode')

    if (!sabreCode) {
      return NextResponse.json<SabreImageResponse>(
        { success: false, error: 'Sabre Hotel Code가 필요합니다.' },
        { status: 400 }
      )
    }

    // 실제 Sabre API 호출
    // 참고: https://developer.sabre.com/docs/rest_apis/hotel/search/get_hotel_image
    const sabreApiUrl = `https://api.sabre.com/v2.0.0/shop/hotels/images?hotelCode=${sabreCode}`
    
    // 실제 구현에서는 환경 변수에서 Sabre API 키를 가져와야 합니다
    const sabreApiKey = process.env.SABRE_API_KEY
    const sabreApiSecret = process.env.SABRE_API_SECRET

    if (!sabreApiKey || !sabreApiSecret) {
      // 데모용 더미 데이터 반환 (실제 API 키가 없는 경우)
      const demoImages: HotelImage[] = [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
          caption: '호텔 외관',
          category: 'Exterior',
          width: 800,
          height: 600
        },
        {
          id: '2',
          url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop',
          caption: '로비',
          category: 'Lobby',
          width: 800,
          height: 600
        },
        {
          id: '3',
          url: 'https://images.unsplash.com/photo-1582719478250-c89cae4cb85b?w=800&h=600&fit=crop',
          caption: '객실',
          category: 'Room',
          width: 800,
          height: 600
        },
        {
          id: '4',
          url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop',
          caption: '수영장',
          category: 'Pool',
          width: 800,
          height: 600
        },
        {
          id: '5',
          url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&h=600&fit=crop',
          caption: '레스토랑',
          category: 'Restaurant',
          width: 800,
          height: 600
        },
        {
          id: '6',
          url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=600&fit=crop',
          caption: '스파',
          category: 'Spa',
          width: 800,
          height: 600
        }
      ]

      return NextResponse.json<SabreImageResponse>(
        { 
          success: true, 
          data: demoImages,
          error: '데모 모드: 실제 Sabre API 키가 설정되지 않았습니다.'
        },
        { status: 200 }
      )
    }

    // 실제 Sabre API 호출 로직
    try {
      // Sabre API 인증 토큰 획득
      const tokenResponse = await fetch('https://api.cert.platform.sabre.com/v2/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${sabreApiKey}:${sabreApiSecret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      })

      if (!tokenResponse.ok) {
        throw new Error(`Sabre 인증 실패: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      // 호텔 이미지 API 호출
      const imagesResponse = await fetch(sabreApiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!imagesResponse.ok) {
        throw new Error(`Sabre 이미지 API 오류: ${imagesResponse.status}`)
      }

      const sabreData = await imagesResponse.json()
      
      // Sabre API 응답을 내부 형식으로 변환
      const images: HotelImage[] = sabreData.images?.map((img: unknown, index: number) => {
        const imageData = img as {
          url?: string
          imageUrl?: string
          caption?: string
          description?: string
          category?: string
          type?: string
          width?: number
          height?: number
        }
        
        return {
          id: String(index + 1),
          url: imageData.url || imageData.imageUrl,
          caption: imageData.caption || imageData.description || `이미지 ${index + 1}`,
          category: imageData.category || imageData.type || 'General',
          width: imageData.width || 800,
          height: imageData.height || 600
        }
      }) || []

      return NextResponse.json<SabreImageResponse>(
        { success: true, data: images },
        { status: 200 }
      )

    } catch (sabreError) {
      console.error('Sabre API 오류:', sabreError)
      
      // Sabre API 오류 시 데모 데이터 반환
      const fallbackImages: HotelImage[] = [
        {
          id: '1',
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
          caption: '호텔 외관 (API 오류로 인한 대체 이미지)',
          category: 'Exterior',
          width: 800,
          height: 600
        }
      ]

      return NextResponse.json<SabreImageResponse>(
        { 
          success: true, 
          data: fallbackImages,
          error: `Sabre API 오류: ${sabreError instanceof Error ? sabreError.message : '알 수 없는 오류'}`
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('호텔 이미지 API 오류:', error)
    
    return NextResponse.json<SabreImageResponse>(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
