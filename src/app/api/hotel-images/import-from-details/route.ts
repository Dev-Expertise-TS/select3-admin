import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/hotel-images/import-from-details
 * 
 * 호텔 상세 페이지(property_details)에서 이미지를 추출하여 Storage에 저장
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sabreId } = body

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'sabreId가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 호텔 정보 조회 (slug, property_details, property_location)
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('slug, property_details, property_location, sabre_id')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel) {
      console.error('[import-from-details] 호텔 조회 실패:', hotelError)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { slug, property_details, property_location } = hotel

    if (!slug) {
      return NextResponse.json(
        { success: false, error: '호텔 slug가 없습니다.' },
        { status: 400 }
      )
    }

    if (!property_details && !property_location) {
      return NextResponse.json(
        { success: false, error: '호텔 상세 정보(property_details, property_location)가 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`[import-from-details] 시작: sabreId=${sabreId}, slug=${slug}`)
    console.log(`[import-from-details] property_details 타입:`, typeof property_details)
    console.log(`[import-from-details] property_location 타입:`, typeof property_location)

    // property_details가 객체인 경우 문자열로 변환
    let detailsContent = property_details
    let locationContent = property_location

    if (typeof property_details === 'object' && property_details !== null) {
      console.log(`[import-from-details] property_details는 객체입니다. JSON.stringify 적용`)
      detailsContent = JSON.stringify(property_details)
    }

    if (typeof property_location === 'object' && property_location !== null) {
      console.log(`[import-from-details] property_location은 객체입니다. JSON.stringify 적용`)
      locationContent = JSON.stringify(property_location)
    }

    // 샘플 출력 (처음 500자)
    if (detailsContent) {
      console.log(`[import-from-details] property_details 샘플 (500자):`, 
        detailsContent.substring(0, 500))
    }
    if (locationContent) {
      console.log(`[import-from-details] property_location 샘플 (500자):`, 
        locationContent.substring(0, 500))
    }

    // 2. property_details와 property_location에서 이미지 추출 (URL + base64)
    const detailsImages = extractImages(detailsContent)
    const locationImages = extractImages(locationContent)
    
    // 중복 제거 (base64는 내용 기준, URL은 URL 기준)
    const allImages = [...detailsImages, ...locationImages]
    const uniqueImages = allImages.filter((img, idx, arr) => 
      arr.findIndex(i => 
        i.type === img.type && 
        (i.type === 'url' ? i.data === img.data : i.data.substring(0, 100) === img.data.substring(0, 100))
      ) === idx
    )
    
    console.log(`[import-from-details] property_details에서 추출: ${detailsImages.length}개`)
    console.log(`[import-from-details] property_location에서 추출: ${locationImages.length}개`)
    console.log(`[import-from-details] 총 ${uniqueImages.length}개 (중복 제거 후)`)
    console.log(`[import-from-details] URL 타입: ${uniqueImages.filter(i => i.type === 'url').length}개`)
    console.log(`[import-from-details] Base64 타입: ${uniqueImages.filter(i => i.type === 'base64').length}개`)
    
    if (uniqueImages.length > 0) {
      const firstImg = uniqueImages[0]
      console.log(`[import-from-details] 첫 번째 이미지 타입: ${firstImg.type}`)
      if (firstImg.type === 'url') {
        console.log(`[import-from-details] 첫 번째 URL 샘플:`, firstImg.data.substring(0, 100))
      } else {
        console.log(`[import-from-details] 첫 번째 base64 샘플 (100자):`, firstImg.data.substring(0, 100))
      }
    }
    
    if (uniqueImages.length === 0) {
      console.log(`[import-from-details] property_details 길이:`, detailsContent?.length || 0)
      console.log(`[import-from-details] property_location 길이:`, locationContent?.length || 0)
      
      return NextResponse.json(
        { success: false, error: '상세 정보에서 이미지를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`[import-from-details] 추출된 이미지 개수: ${uniqueImages.length}`)

    // 3. Storage 폴더 생성 (public, originals)
    const publicFolder = `public/${slug}`
    const originalsFolder = `originals/${slug}`

    // 1x1 투명 PNG (67 bytes) - 폴더 생성용 마커 파일
    const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const pngBuffer = Buffer.from(transparentPngBase64, 'base64')
    const keepFile = new Blob([pngBuffer], { type: 'image/png' })

    // 폴더 존재 확인 (1x1 투명 PNG로 폴더 생성)
    const { error: publicFolderError } = await supabase.storage
      .from('hotel-media')
      .upload(`${publicFolder}/.keep`, keepFile, {
        contentType: 'image/png',
        upsert: true
      })

    const { error: originalsFolderError } = await supabase.storage
      .from('hotel-media')
      .upload(`${originalsFolder}/.keep`, keepFile, {
        contentType: 'image/png',
        upsert: true
      })

    if (publicFolderError) {
      console.warn('[import-from-details] public 폴더 생성 경고:', publicFolderError)
    }
    if (originalsFolderError) {
      console.warn('[import-from-details] originals 폴더 생성 경고:', originalsFolderError)
    }

    // 4. 각 이미지 처리 (URL 다운로드 또는 base64 디코딩) 및 업로드
    const results = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < uniqueImages.length; i++) {
      const image = uniqueImages[i]
      const seq = String(i + 1).padStart(2, '0')
      
      try {
        let blob: Blob
        let ext: string
        let contentType: string

        if (image.type === 'url') {
          // URL에서 이미지 다운로드
          console.log(`[import-from-details] URL 다운로드 중 [${i + 1}/${uniqueImages.length}]:`, image.data.substring(0, 100))
          const imageRes = await fetch(image.data)
          if (!imageRes.ok) {
            throw new Error(`HTTP ${imageRes.status}`)
          }

          contentType = imageRes.headers.get('content-type') || 'image/jpeg'
          ext = getExtensionFromContentType(contentType) || getExtensionFromUrl(image.data) || 'jpg'
          
          const arrayBuffer = await imageRes.arrayBuffer()
          blob = new Blob([arrayBuffer], { type: contentType })
          
        } else {
          // base64 디코딩
          console.log(`[import-from-details] Base64 디코딩 중 [${i + 1}/${uniqueImages.length}]`)
          const base64Data = image.data
          const base64Match = base64Data.match(/^data:image\/([a-z]+);base64,(.+)$/i)
          
          if (!base64Match) {
            throw new Error('Invalid base64 format')
          }

          ext = base64Match[1].toLowerCase()
          const base64String = base64Match[2]
          
          // base64를 Buffer로 디코딩
          const buffer = Buffer.from(base64String, 'base64')
          contentType = `image/${ext}`
          blob = new Blob([buffer], { type: contentType })
        }

        // 파일명: [slug]_[sabreId]_[seq].[ext]
        const filename = `${slug}_${sabreId}_${seq}.${ext}`

        // originals에 원본 저장
        const originalsPath = `${originalsFolder}/${filename}`
        const { error: uploadError } = await supabase.storage
          .from('hotel-media')
          .upload(originalsPath, blob, {
            contentType,
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        successCount++
        results.push({
          source: image.type === 'url' ? image.data.substring(0, 100) : 'base64',
          filename,
          success: true,
          path: originalsPath
        })

        console.log(`[import-from-details] 업로드 성공 (${i + 1}/${uniqueImages.length}): ${filename}`)

      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          source: image.type === 'url' ? image.data.substring(0, 100) : 'base64',
          success: false,
          error: errorMsg
        })
        console.error(`[import-from-details] 업로드 실패 (${i + 1}/${uniqueImages.length}):`, errorMsg)
      }
    }

    console.log(`[import-from-details] 완료: 성공 ${successCount}/${uniqueImages.length}, 실패 ${errorCount}`)

    return NextResponse.json({
      success: true,
      data: {
        total: uniqueImages.length,
        uploaded: successCount,
        failed: errorCount,
        results
      }
    })

  } catch (error) {
    console.error('[import-from-details] 예외 발생:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

/**
 * property_details에서 이미지 추출 (URL + base64)
 */
interface ExtractedImage {
  type: 'url' | 'base64'
  data: string
}

function extractImages(content: string | null): ExtractedImage[] {
  if (!content) return []
  
  const images: ExtractedImage[] = []
  
  // 1. HTML img 태그에서 src 추출
  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi
  let match
  
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1].trim()
    
    if (!src) continue
    
    // base64 이미지 확인
    if (src.startsWith('data:image/')) {
      images.push({ type: 'base64', data: src })
    }
    // HTTP/HTTPS URL 확인
    else if (src.startsWith('http://') || src.startsWith('https://')) {
      images.push({ type: 'url', data: src })
    }
  }
  
  // 2. 일반 이미지 URL 패턴 추출 (img 태그가 없는 경우)
  const urlRegex = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"']*)?/gi
  
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0].trim()
    // 중복 체크
    if (!images.some(img => img.type === 'url' && img.data === url)) {
      images.push({ type: 'url', data: url })
    }
  }
  
  return images
}

/**
 * Content-Type에서 확장자 추출
 */
function getExtensionFromContentType(contentType: string): string | null {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg'
  }
  return map[contentType.toLowerCase()] || null
}

/**
 * URL에서 확장자 추출
 */
function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.([a-z0-9]+)(?:\?|$)/i)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}
