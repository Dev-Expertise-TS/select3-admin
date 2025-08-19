import { NextRequest, NextResponse } from 'next/server'
import { getSabreToken } from '@/lib/sabre'

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

    // Sabre Hotel Image REST API 호출
    // 참고: https://developer.sabre.com/docs/rest_apis/hotel/search/get_hotel_image/reference-documentation
    // 표준 Sabre API 엔드포인트 (환경에 따라 호스트 전환)
    const SABRE_BASE_URL = process.env.SABRE_BASE_URL || 'https://api-crt.cert.sabre.com'
    const SABRE_VERSION = process.env.SABRE_API_VERSION || 'v1.0.0'
    const sabreBaseUrl = `${SABRE_BASE_URL}/${SABRE_VERSION}`.replace(/\/$/, '')
    const SABRE_DEBUG = String(process.env.SABRE_DEBUG || '').toLowerCase() === 'true'
    const dbg = (...args: unknown[]) => { if (SABRE_DEBUG) { try { console.log('[SABRE_IMG_DEBUG]', ...args) } catch {} } }
    const sabreImagesCandidates = (
      code: string,
    ) => [
      `${sabreBaseUrl}/shop/hotels/images?hotelCode=${encodeURIComponent(code)}&imageSize=Large`,
      `${sabreBaseUrl}/shop/hotels/images?hotelCode=${encodeURIComponent(code)}&category=ALL`,
      `${sabreBaseUrl}/shop/hotels/images?hotelCode=${encodeURIComponent(code)}`,
      `${sabreBaseUrl}/shop/hotels/images?HotelCode=${encodeURIComponent(code)}`,
      `${sabreBaseUrl}/shop/hotels/image?hotelCode=${encodeURIComponent(code)}`,
    ]

    // Sabre 이미지 응답 파서 (다양한 응답 포맷 및 래퍼 대응)
    const parseSabreImages = (payload: unknown): HotelImage[] => {
      const images: HotelImage[] = []
      let imageData: unknown[] = []

      const unwrap = (obj: unknown): unknown => {
        if (!obj || typeof obj !== 'object') return obj
        const r = obj as Record<string, unknown>
        if (Array.isArray(r.data)) return r.data
        if (r.data && typeof r.data === 'object') return r.data
        if (Array.isArray(r.result)) return r.result
        if (r.result && typeof r.result === 'object') return r.result
        if (r.payload) return r.payload as unknown
        return obj
      }

      const root0 = unwrap(payload)
      const root = (root0 && typeof root0 === 'object' ? root0 : payload) as Record<string, unknown>

      const rs = (root as Record<string, unknown>)?.GetHotelImageRS as Record<string, unknown> | undefined
      const hotelImages = rs?.HotelImages as Record<string, unknown> | undefined
      const hotelImage = hotelImages?.HotelImage as unknown
      const altImages = ((root as Record<string, unknown>)?.Images as Record<string, unknown> | undefined)?.Image as unknown
      const contentItems = ((root as Record<string, unknown>)?.HotelContentRS as Record<string, unknown> | undefined)?.HotelContent as Record<string, unknown> | undefined
      const mediaItems = contentItems?.MediaItems as Record<string, unknown> | undefined
      const mediaItem = mediaItems?.MediaItem as unknown
      const hotelImageList = ((root as Record<string, unknown>)?.HotelImageList as Record<string, unknown> | undefined)?.HotelImage as unknown

      if (Array.isArray(hotelImage)) imageData = hotelImage
      else if (hotelImage) imageData = [hotelImage]
      else if (Array.isArray(altImages)) imageData = altImages
      else if (altImages) imageData = [altImages]
      else if (Array.isArray(mediaItem)) imageData = mediaItem
      else if (mediaItem) imageData = [mediaItem]
      else if (Array.isArray(hotelImageList)) imageData = hotelImageList
      else if (hotelImageList) imageData = [hotelImageList]
      else if (Array.isArray(root0)) imageData = root0 as unknown[]
      else if (Array.isArray(payload)) imageData = payload as unknown[]

      const pushImage = (url: string, idx: number, meta?: Record<string, unknown>) => {
        const caption = (meta?.Caption || meta?.caption || meta?.description || meta?.alt) as string | undefined
        const category = (meta?.Category || meta?.category || meta?.type || meta?.imageType) as string | undefined
        const widthRaw = (meta?.Width || meta?.width) as string | number | undefined
        const heightRaw = (meta?.Height || meta?.height) as string | number | undefined
        images.push({
          id: String(idx + 1),
          url,
          caption: caption ?? `호텔 이미지 ${idx + 1}`,
          category: category ?? 'General',
          width: typeof widthRaw === 'number' ? widthRaw : parseInt(String(widthRaw || '800')) || 800,
          height: typeof heightRaw === 'number' ? heightRaw : parseInt(String(heightRaw || '600')) || 600,
        })
      }

      const collectFromNode = (node: unknown) => {
        if (!node) return 0
        let added = 0
        if (typeof node === 'string') {
          const u = node.trim()
          if (u) { pushImage(u, images.length, {}) ; added += 1 }
          return added
        }
        if (Array.isArray(node)) {
          node.forEach((n) => { added += collectFromNode(n) })
          return added
        }
        const obj = node as Record<string, unknown>
        const directUrl = (obj.URL || obj.Url || obj.url || obj.imageURL || obj.imageUrl || obj.src || obj.href) as string | undefined
        if (typeof directUrl === 'string' && directUrl.trim()) {
          pushImage(directUrl, images.length, obj)
          added += 1
        }
        // nested arrays: Image / Images.Image / MediaItems.MediaItem / Links.Link
        const image = obj.Image as unknown
        const imagesNode = (obj.Images as Record<string, unknown> | undefined)?.Image as unknown
        const media = (obj.MediaItems as Record<string, unknown> | undefined)?.MediaItem as unknown
        const links = (obj.Links as Record<string, unknown> | undefined)?.Link as unknown
        if (image) added += collectFromNode(image)
        if (imagesNode) added += collectFromNode(imagesNode)
        if (media) added += collectFromNode(media)
        if (links) added += collectFromNode(links)
        return added
      }

      collectFromNode(imageData)

      // dedupe by URL
      const deduped: HotelImage[] = []
      const seen = new Set<string>()
      for (const im of images) {
        if (!seen.has(im.url)) { seen.add(im.url); deduped.push(im) }
      }
      return deduped
    }

    // 인증 없이 사용할 수 있는 내부 프록시 폴백 호출
    const fetchViaProxy = async (hotelCode: string): Promise<HotelImage[] | null> => {
      try {
        // 1) POST with HotelCode
        const base = 'https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre'
        const postResp = await fetch(`${base}/hotel-images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ HotelCode: hotelCode }),
          signal: AbortSignal.timeout(15000),
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
          signal: AbortSignal.timeout(15000),
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
    const clientId = process.env.SABRE_CLIENT_ID
    const clientSecret = process.env.SABRE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
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
        dbg('try official:', url)
        try {
          const resp = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(12000),
          })
          dbg('official status:', resp.status, resp.statusText)
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
            // 간단 URL 추출 (jpg/png/webp)
            const urls = Array.from(new Set((text.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi) || []).map((u) => u.trim())))
            if (urls.length > 0) {
              finalImages = urls.map((u, i) => ({ id: String(i + 1), url: u, caption: `호텔 이미지 ${i + 1}`, category: 'General', width: 800, height: 600 }))
              ok = true
              break
            }
          }
        } catch (e) {
          dbg('official failed:', url, e instanceof Error ? e.message : String(e))
        }
      }
      if (!ok) {
        throw new Error('Sabre 이미지 API 응답이 비어있습니다.')
      }
      const images = finalImages
      dbg('parsed official images:', images.length)

      if (images.length > 0) {
        return NextResponse.json<SabreImageResponse>({ success: true, data: images }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      } else {
        // 공식 API 결과가 없으면 프록시 폴백
        dbg('fallback to proxy with code:', sabreCode)
        const proxyImages = await fetchViaProxy(sabreCode)
        if (proxyImages && proxyImages.length > 0) {
          dbg('proxy images count:', proxyImages.length)
          return NextResponse.json<SabreImageResponse>({ success: true, data: proxyImages }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
        }
        return NextResponse.json<SabreImageResponse>({ success: false, error: '해당 호텔의 이미지를 찾을 수 없습니다.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
      }

    } catch (sabreError) {
      console.error('Sabre API 호출 오류:', sabreError)
      // 공식 API 실패 시 프록시 폴백 시도
      dbg('catch: fallback to proxy with code:', sabreCode)
      const proxyImages = await fetchViaProxy(sabreCode)
      if (proxyImages && proxyImages.length > 0) {
        dbg('catch: proxy images count:', proxyImages.length)
        return NextResponse.json<SabreImageResponse>({ success: true, data: proxyImages }, { status: 200, headers: { 'Cache-Control': 'no-store' } })
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
