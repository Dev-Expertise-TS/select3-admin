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

    // 1. 호텔 정보 조회 (slug, property_details)
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('slug, property_details, sabre_id')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel) {
      console.error('[import-from-details] 호텔 조회 실패:', hotelError)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { slug, property_details } = hotel

    if (!slug) {
      return NextResponse.json(
        { success: false, error: '호텔 slug가 없습니다.' },
        { status: 400 }
      )
    }

    if (!property_details) {
      return NextResponse.json(
        { success: false, error: '호텔 상세 정보(property_details)가 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`[import-from-details] 시작: sabreId=${sabreId}, slug=${slug}`)

    // 2. property_details에서 이미지 URL 추출
    const imageUrls = extractImageUrls(property_details)
    
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: '상세 정보에서 이미지를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`[import-from-details] 추출된 이미지 개수: ${imageUrls.length}`)

    // 3. Storage 폴더 생성 (public, originals)
    const publicFolder = `public/${slug}`
    const originalsFolder = `originals/${slug}`

    // 폴더 존재 확인 (빈 파일로 폴더 생성)
    const { error: publicFolderError } = await supabase.storage
      .from('hotel-images')
      .upload(`${publicFolder}/.keep`, new Blob([''], { type: 'text/plain' }), {
        upsert: true
      })

    const { error: originalsFolderError } = await supabase.storage
      .from('hotel-images')
      .upload(`${originalsFolder}/.keep`, new Blob([''], { type: 'text/plain' }), {
        upsert: true
      })

    if (publicFolderError) {
      console.warn('[import-from-details] public 폴더 생성 경고:', publicFolderError)
    }
    if (originalsFolderError) {
      console.warn('[import-from-details] originals 폴더 생성 경고:', originalsFolderError)
    }

    // 4. 각 이미지 다운로드 및 업로드
    const results = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      const seq = String(i + 1).padStart(2, '0')
      
      try {
        // 이미지 다운로드
        const imageRes = await fetch(url)
        if (!imageRes.ok) {
          throw new Error(`HTTP ${imageRes.status}`)
        }

        const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
        const ext = getExtensionFromContentType(contentType) || getExtensionFromUrl(url) || 'jpg'
        
        const buffer = await imageRes.arrayBuffer()
        const blob = new Blob([buffer], { type: contentType })

        // 파일명: [slug]_[sabreId]_[seq].[ext]
        const filename = `${slug}_${sabreId}_${seq}.${ext}`

        // originals에 원본 저장
        const originalsPath = `${originalsFolder}/${filename}`
        const { error: uploadError } = await supabase.storage
          .from('hotel-images')
          .upload(originalsPath, blob, {
            contentType,
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        successCount++
        results.push({
          url,
          filename,
          success: true,
          path: originalsPath
        })

        console.log(`[import-from-details] 업로드 성공 (${i + 1}/${imageUrls.length}): ${filename}`)

      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          url,
          success: false,
          error: errorMsg
        })
        console.error(`[import-from-details] 업로드 실패 (${i + 1}/${imageUrls.length}):`, url, errorMsg)
      }
    }

    console.log(`[import-from-details] 완료: 성공 ${successCount}/${imageUrls.length}, 실패 ${errorCount}`)

    return NextResponse.json({
      success: true,
      data: {
        total: imageUrls.length,
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
 * property_details JSON에서 이미지 URL 추출
 */
function extractImageUrls(propertyDetails: any): string[] {
  const urls: string[] = []
  
  if (!propertyDetails || typeof propertyDetails !== 'object') {
    return urls
  }

  // 재귀적으로 모든 키-값 검색
  function traverse(obj: any) {
    if (!obj) return

    if (typeof obj === 'string') {
      // URL 패턴 검색 (http/https로 시작하고 이미지 확장자로 끝나는)
      const urlPattern = /https?:\/\/[^\s<>"]+?\.(?:jpg|jpeg|png|gif|webp|avif|svg)(?:\?[^\s<>"]*)?/gi
      const matches = obj.match(urlPattern)
      if (matches) {
        matches.forEach(url => {
          // 중복 제거
          if (!urls.includes(url)) {
            urls.push(url)
          }
        })
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item))
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(value => traverse(value))
    }
  }

  traverse(propertyDetails)
  return urls
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

