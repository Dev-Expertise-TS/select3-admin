/**
 * Sabre 이미지 API 응답 파서
 * 다양한 Sabre API 응답 형식을 파싱하여 표준화된 이미지 배열로 변환
 */

export interface HotelImage {
  id: string
  url: string
  caption?: string
  category?: string
  width?: number
  height?: number
}

/**
 * Sabre API 응답에서 이미지 데이터를 추출하고 표준화
 * @param payload - Sabre API 응답 데이터
 * @returns 표준화된 호텔 이미지 배열
 */
export function parseSabreImages(payload: unknown): HotelImage[] {
  const images: HotelImage[] = []
  let imageData: unknown[] = []

  // 응답 래퍼 제거 함수
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

  // 다양한 Sabre API 응답 구조에서 이미지 데이터 추출
  const rs = (root as Record<string, unknown>)?.GetHotelImageRS as Record<string, unknown> | undefined
  const hotelImages = rs?.HotelImages as Record<string, unknown> | undefined
  const hotelImage = hotelImages?.HotelImage as unknown
  const altImages = ((root as Record<string, unknown>)?.Images as Record<string, unknown> | undefined)?.Image as unknown
  const contentItems = ((root as Record<string, unknown>)?.HotelContentRS as Record<string, unknown> | undefined)?.HotelContent as Record<string, unknown> | undefined
  const mediaItems = contentItems?.MediaItems as Record<string, unknown> | undefined
  const mediaItem = mediaItems?.MediaItem as unknown
  const hotelImageList = ((root as Record<string, unknown>)?.HotelImageList as Record<string, unknown> | undefined)?.HotelImage as unknown

  // 이미지 데이터 배열로 변환
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

  // 이미지 추가 함수
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

  // 노드에서 이미지 수집 함수
  const collectFromNode = (node: unknown): number => {
    if (!node) return 0
    let added = 0
    
    if (typeof node === 'string') {
      const u = node.trim()
      if (u) { 
        pushImage(u, images.length, {}) 
        added += 1 
      }
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
    
    // 중첩된 배열 구조 처리
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

  // URL 중복 제거
  const deduped: HotelImage[] = []
  const seen = new Set<string>()
  for (const im of images) {
    if (!seen.has(im.url)) { 
      seen.add(im.url)
      deduped.push(im) 
    }
  }
  
  return deduped
}

/**
 * 텍스트에서 이미지 URL 추출 (HTML/XML 응답용)
 * @param text - HTML/XML 텍스트
 * @returns 추출된 이미지 URL 배열
 */
export function extractImageUrlsFromText(text: string): string[] {
  const urls = Array.from(
    new Set(
      (text.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi) || [])
        .map((u) => u.trim())
    )
  )
  return urls
}

/**
 * 텍스트에서 추출한 URL을 HotelImage 배열로 변환
 * @param urls - 이미지 URL 배열
 * @returns HotelImage 배열
 */
export function urlsToHotelImages(urls: string[]): HotelImage[] {
  return urls.map((url, index) => ({
    id: String(index + 1),
    url,
    caption: `호텔 이미지 ${index + 1}`,
    category: 'General',
    width: 800,
    height: 600
  }))
}
