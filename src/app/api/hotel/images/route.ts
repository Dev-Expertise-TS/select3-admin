import { NextRequest, NextResponse } from 'next/server'
import { getSabreToken } from '@/lib/sabre'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { parseSabreImages, extractImageUrlsFromText, urlsToHotelImages, type HotelImage } from '@/lib/sabre-image-parser'
import { SABRE_CONFIG, getSabreBaseUrl, hasSabreCredentials, sabreDebugLog } from '@/config/sabre'

// HotelImage 타입은 이제 sabre-image-parser에서 import

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

    // 먼저 select_hotels 테이블에서 이미지 컬럼들을 가져옴
    const supabase = createServiceRoleClient()
    const { data: hotelData, error: hotelError } = await supabase
      .from('select_hotels')
      .select('image_1, image_2, image_3, image_4, image_5, property_name_ko, property_name_en')
      .eq('sabre_id', sabreCode)
      .single()

    const images: HotelImage[] = []

    // select_hotels 테이블의 이미지들을 우선적으로 추가
    if (hotelData && !hotelError) {
      const hotelImages = [
        hotelData.image_1,
        hotelData.image_2,
        hotelData.image_3,
        hotelData.image_4,
        hotelData.image_5
      ].filter(Boolean) // null/undefined 값 제거

      hotelImages.forEach((imageUrl, index) => {
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
          images.push({
            id: `hotel-${index + 1}`,
            url: imageUrl.trim(),
            caption: `${hotelData.property_name_ko || hotelData.property_name_en || '호텔'} 이미지 ${index + 1}`,
            category: 'hotel',
            width: 800,
            height: 600
          })
        }
      })
    }

    // Sabre Hotel Image REST API 호출
    // 참고: https://developer.sabre.com/docs/rest_apis/hotel/search/get_hotel_image/reference-documentation
    const sabreBaseUrl = getSabreBaseUrl()
    const sabreImagesCandidates = (code: string) => 
      SABRE_CONFIG.IMAGE_ENDPOINTS(SABRE_CONFIG.BASE_URL, SABRE_CONFIG.VERSION, code)

    // Sabre 이미지 파서는 이제 별도 모듈에서 import

    // 인증 없이 사용할 수 있는 내부 프록시 폴백 호출
    const fetchViaProxy = async (hotelCode: string): Promise<HotelImage[] | null> => {
      try {
        // 1) POST with HotelCode
        const base = SABRE_CONFIG.PROXY.BASE_URL
        const postResp = await fetch(`${base}/hotel-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ HotelCode: hotelCode }),
          signal: AbortSignal.timeout(SABRE_CONFIG.TIMEOUT.PROXY),
        })
        if (postResp.ok) {
          const json = await postResp.json().catch(() => null)
          if (json) {
            const images = parseSabreImages(json)
            if (images.length > 0) return images
          }
        }
        // 2) POST with "hotelCode" shape (alternate input)
        const postAlt = await fetch(`${base}/hotel-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelCode: hotelCode }),
          signal: AbortSignal.timeout(SABRE_CONFIG.TIMEOUT.PROXY),
        })
        if (postAlt.ok) {
          const json = await postAlt.json().catch(() => null)
          if (json) {
            const images = parseSabreImages(json)
            if (images.length > 0) return images
          }
        }
        // 3) GET with query (HotelCode)
        const getResp1 = await fetch(`${base}/hotel-images?HotelCode=${encodeURIComponent(hotelCode)}`, { signal: AbortSignal.timeout(15000) })
        if (getResp1.ok) {
          const json = await getResp1.json().catch(() => null)
          if (json) {
            const images = parseSabreImages(json)
            if (images.length > 0) return images
          }
        }
        // 4) GET with query (hotelCode)
        const getResp2 = await fetch(`${base}/hotel-images?hotelCode=${encodeURIComponent(hotelCode)}`, { signal: AbortSignal.timeout(15000) })
        if (getResp2.ok) {
          const json = await getResp2.json().catch(() => null)
          if (json) {
            const images = parseSabreImages(json)
            if (images.length > 0) return images
          }
        }
        return null
      } catch {
        return null
      }
    }
    
    // 1) 프록시 우선 시도 (인증 없이도 가능할 수 있음)
    const proxyFirst = await fetchViaProxy(sabreCode)
    if (proxyFirst && proxyFirst.length > 0) {
      return NextResponse.json<SabreImageResponse>({ success: true, data: proxyFirst }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    }

    // 2) Sabre API 인증 정보 확인 후 공식 API 호출 시도
    if (!hasSabreCredentials()) {
      // 인증 정보 없고 프록시도 실패 → 데모
      const demoImages: HotelImage[] = [
        { id: '1', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop', caption: '호텔 외관', category: 'Exterior', width: 800, height: 600 },
        { id: '2', url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop', caption: '로비', category: 'Lobby', width: 800, height: 600 },
        { id: '3', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4cb85b?w=800&h=600&fit=crop', caption: '객실', category: 'Room', width: 800, height: 600 },
      ]
      return NextResponse.json<SabreImageResponse>({ success: true, data: demoImages, error: '데모 모드: Sabre API 인증 정보가 설정되지 않았습니다.' }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    }
    
    try {
      // Sabre Hotel Image REST API 호출 (사양 상 다양한 쿼리 조합 시도)
      let finalImages: HotelImage[] = []
      let ok = false
      const token = await getSabreToken()
      for (const url of sabreImagesCandidates(sabreCode)) {
        sabreDebugLog('try official:', url)
        try {
          const resp = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(SABRE_CONFIG.TIMEOUT.DEFAULT),
          })
          sabreDebugLog('official status:', resp.status, resp.statusText)
          if (!resp.ok) continue
          const ctype = resp.headers.get('content-type') || ''
          if (ctype.includes('application/json')) {
            const json = await resp.json().catch(() => null)
            if (json) {
              finalImages = parseSabreImages(json)
              if (finalImages.length > 0) { ok = true; break }
            }
          } else {
            const text = await resp.text().catch(() => '')
            // 텍스트에서 이미지 URL 추출
            const urls = extractImageUrlsFromText(text)
            if (urls.length > 0) {
              finalImages = urlsToHotelImages(urls)
              ok = true
              break
            }
          }
        } catch (e) {
          sabreDebugLog('official failed:', url, e instanceof Error ? e.message : String(e))
        }
      }
      if (!ok) {
        throw new Error('Sabre 이미지 API 응답이 비어있습니다.')
      }
      const images = finalImages
      sabreDebugLog('parsed official images:', images.length)

      // select_hotels 테이블의 이미지들과 Sabre API 이미지들을 합침
      const allImages = [...images, ...finalImages]
      
      if (allImages.length > 0) {
        return NextResponse.json<SabreImageResponse>({ success: true, data: allImages }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      } else {
        // 공식 API 결과가 없으면 프록시 폴백
        sabreDebugLog('fallback to proxy with code:', sabreCode)
        const proxyImages = await fetchViaProxy(sabreCode)
        if (proxyImages && proxyImages.length > 0) {
          sabreDebugLog('proxy images count:', proxyImages.length)
          // select_hotels 이미지와 프록시 이미지 합침
          const allImagesWithProxy = [...images, ...proxyImages]
          return NextResponse.json<SabreImageResponse>({ success: true, data: allImagesWithProxy }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
        }
        // select_hotels에 이미지가 있으면 그것만이라도 반환
        if (images.length > 0) {
          return NextResponse.json<SabreImageResponse>({ success: true, data: images }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
        }
        return NextResponse.json<SabreImageResponse>({ success: false, error: '해당 호텔의 이미지를 찾을 수 없습니다.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
      }

    } catch (sabreError) {
      console.error('Sabre API 호출 오류:', sabreError)
      // 공식 API 실패 시 프록시 폴백 시도
      sabreDebugLog('catch: fallback to proxy with code:', sabreCode)
      const proxyImages = await fetchViaProxy(sabreCode)
      if (proxyImages && proxyImages.length > 0) {
        sabreDebugLog('catch: proxy images count:', proxyImages.length)
        // select_hotels 이미지와 프록시 이미지 합침
        const allImagesWithProxy = [...images, ...proxyImages]
        return NextResponse.json<SabreImageResponse>({ success: true, data: allImagesWithProxy }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      }
      // select_hotels에 이미지가 있으면 그것만이라도 반환
      if (images.length > 0) {
        return NextResponse.json<SabreImageResponse>({ success: true, data: images }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      }
      // 폴백 실패 시 데모 + 오류 메시지
      const errorFallbackImages: HotelImage[] = [
        { id: '1', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop', caption: '호텔 외관 (API 오류로 인한 대체 이미지)', category: 'Exterior', width: 800, height: 600 },
      ]
      return NextResponse.json<SabreImageResponse>({ success: true, data: errorFallbackImages, error: `Sabre API 오류: ${sabreError instanceof Error ? sabreError.message : '알 수 없는 오류'}. 실제 API 키 설정 시 호텔 실제 이미지를 확인할 수 있습니다.` }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
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
