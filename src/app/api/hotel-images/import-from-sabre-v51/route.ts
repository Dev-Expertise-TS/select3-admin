import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/hotel-images/import-from-sabre-v51
 * 
 * Sabre API v5.1을 사용하여 호텔 이미지를 가져와서 Storage에 저장
 */
export async function POST(req: NextRequest) {
  console.log('[import-from-sabre-v51] API 엔드포인트 호출됨')
  try {
    const body = await req.json()
    const { sabreId } = body

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'sabreId가 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 1. 호텔 정보 조회 (slug)
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('slug, sabre_id')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel) {
      console.error('[import-from-sabre-v51] 호텔 조회 실패:', hotelError)
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const { slug } = hotel

    if (!slug) {
      return NextResponse.json(
        { success: false, error: '호텔 slug가 없습니다.' },
        { status: 400 }
      )
    }

    console.log(`[import-from-sabre-v51] 시작: sabreId=${sabreId}, slug=${slug}`)

    // 2. Sabre API v5.1 호출
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() + 14)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 16)

    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }

    // Sabre API v5.1 요청 바디
    // 백엔드 서버가 간단한 형식을 받아서 내부적으로 GetHotelDetailsRQ로 변환하는 것으로 보임
    // 하지만 MediaRef를 명시적으로 포함하여 LARGE 이미지를 확실히 요청
    // 참고: LARGE는 큰 사이즈 이미지이며, Sabre API에서 제공하는 최대 크기 이미지입니다
    // 원본(Original) 이미지는 별도로 요청해야 할 수 있으나, 일반적으로 LARGE가 가장 큰 사이즈입니다
    const requestBody = {
      HotelCode: sabreId,
      CurrencyCode: 'KRW',
      StartDate: formatDate(startDate),
      EndDate: formatDate(endDate),
      Adults: 2,
      // MediaRef를 명시적으로 포함하여 LARGE 이미지 요청
      // 백엔드 서버가 이를 GetHotelDetailsRQ.HotelContentRef.MediaRef로 변환할 것으로 예상
      MediaRef: {
        MaxItems: 'ALL',
        MediaTypes: {
          Image: [
            { Type: 'LARGE' }
          ]
        },
        AdditionalInfo: {
          Info: [
            { Type: 'CAPTION' },
            { Type: 'ROOM_TYPE_CODE' }
          ]
        },
        Languages: {
          Language: 'EN'
        },
        Categories: {
          Category: Array.from({ length: 22 }, (_, i) => ({ Code: i + 1 }))
        }
      }
    }
    
    console.log(`[import-from-sabre-v51] 요청 바디:`, JSON.stringify(requestBody))
    console.log(`[import-from-sabre-v51] 참고: LARGE 이미지는 Sabre API에서 제공하는 큰 사이즈 이미지입니다. 원본과 동일할 수 있으나, 실제 원본 크기는 Sabre API 스펙에 따라 다를 수 있습니다.`)

    console.log(`[import-from-sabre-v51] Sabre API v5.1 호출 중...`)

    // 백엔드 서버의 v5.1 엔드포인트 호출
    const sabreResponse = await fetch(
      'https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/v5.1/hotel-details',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30초 타임아웃
      }
    )

    console.log(`[import-from-sabre-v51] Sabre API 응답 상태: ${sabreResponse.status} ${sabreResponse.statusText}`)

    // 응답을 먼저 텍스트로 받기
    const responseText = await sabreResponse.text()
    console.log(`[import-from-sabre-v51] 응답 텍스트 샘플:`, responseText.substring(0, 500))

    // Content-Type 확인
    const contentType = sabreResponse.headers.get('content-type') || ''
    
    // HTML 응답인 경우 (에러 페이지)
    if (contentType.includes('text/html') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<!doctype')) {
      console.error(`[import-from-sabre-v51] HTML 응답 수신 (에러 페이지)`)
      // HTML에서 에러 메시지 추출 시도
      const errorMatch = responseText.match(/<title>(.*?)<\/title>/i) || responseText.match(/<h1>(.*?)<\/h1>/i)
      const errorMessage = errorMatch ? errorMatch[1] : '서버에서 HTML 에러 페이지를 반환했습니다'
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Sabre API 호출 실패: ${sabreResponse.status} ${sabreResponse.statusText}. ${errorMessage}` 
        },
        { status: sabreResponse.status || 500 }
      )
    }

    if (!sabreResponse.ok) {
      console.error(`[import-from-sabre-v51] Sabre API 호출 실패: ${sabreResponse.status}`, responseText.substring(0, 500))
      return NextResponse.json(
        { success: false, error: `Sabre API 호출 실패: ${sabreResponse.status} ${sabreResponse.statusText}` },
        { status: sabreResponse.status }
      )
    }

    // JSON 파싱 시도
    let sabreData: unknown = null
    try {
      sabreData = JSON.parse(responseText)
      console.log(`[import-from-sabre-v51] Sabre API 응답 파싱 성공`)
    } catch (parseError) {
      console.error(`[import-from-sabre-v51] JSON 파싱 실패:`, parseError)
      return NextResponse.json(
        { 
          success: false, 
          error: `Sabre API 응답 파싱 실패: 응답이 유효한 JSON 형식이 아닙니다. 응답 샘플: ${responseText.substring(0, 200)}` 
        },
        { status: 500 }
      )
    }

    // 3. 응답에서 이미지 URL 추출
    const imageUrls = extractImageUrls(sabreData)
    console.log(`[import-from-sabre-v51] 추출된 이미지 개수: ${imageUrls.length}`)
    
    // 디버깅: 응답 구조 로깅
    if (imageUrls.length === 0) {
      console.log(`[import-from-sabre-v51] 응답 구조 디버깅:`, JSON.stringify(sabreData, null, 2).substring(0, 2000))
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sabre API 응답에서 이미지를 찾을 수 없습니다.' },
        { status: 400 }
      )
    }

    // 4. Storage 폴더 생성 (public, originals)
    const publicFolder = `public/${slug}`
    const originalsFolder = `originals/${slug}`

    // 1x1 투명 PNG (67 bytes) - 폴더 생성용 마커 파일
    const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const pngBuffer = Buffer.from(transparentPngBase64, 'base64')
    const keepFile = new Blob([pngBuffer], { type: 'image/png' })

    // 폴더 존재 확인 (1x1 투명 PNG로 폴더 생성)
    await supabase.storage
      .from('hotel-media')
      .upload(`${publicFolder}/.keep`, keepFile, {
        contentType: 'image/png',
        upsert: true
      })

    await supabase.storage
      .from('hotel-media')
      .upload(`${originalsFolder}/.keep`, keepFile, {
        contentType: 'image/png',
        upsert: true
      })

    // 5. 각 이미지 다운로드 및 업로드
    const results = []
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const seq = String(i + 1).padStart(2, '0')
      
      try {
        console.log(`[import-from-sabre-v51] 이미지 다운로드 중 [${i + 1}/${imageUrls.length}]:`, imageUrl.substring(0, 100))
        
        // 이미지 다운로드
        const imageRes = await fetch(imageUrl, {
          signal: AbortSignal.timeout(15000) // 15초 타임아웃
        })
        
        if (!imageRes.ok) {
          throw new Error(`HTTP ${imageRes.status}`)
        }

        const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
        const ext = getExtensionFromContentType(contentType) || getExtensionFromUrl(imageUrl) || 'jpg'
        
        const arrayBuffer = await imageRes.arrayBuffer()
        const blob = new Blob([arrayBuffer], { type: contentType })
        
        // 이미지 크기 정보 로깅 (원본 확인용)
        const imageSizeKB = (blob.size / 1024).toFixed(2)
        console.log(`[import-from-sabre-v51] 이미지 정보 [${i + 1}/${imageUrls.length}]: 크기=${imageSizeKB}KB, 타입=${contentType}, URL=${imageUrl.substring(0, 80)}...`)

        // 파일명: [slug]_[sabreId]_[seq].[ext]
        const filename = `${slug}_${sabreId}_${seq}.${ext}`

        // 1. originals에 저장 (LARGE 사이즈 이미지 - Sabre API에서 제공하는 큰 사이즈)
        // 참고: LARGE는 Sabre API에서 제공하는 최대 크기 이미지이며, 실제 원본과 동일할 수 있으나
        // Sabre API 스펙에 따라 원본보다 작을 수도 있습니다.
        const originalsPath = `${originalsFolder}/${filename}`
        const { error: originalsUploadError } = await supabase.storage
          .from('hotel-media')
          .upload(originalsPath, blob, {
            contentType,
            upsert: true
          })

        if (originalsUploadError) {
          throw originalsUploadError
        }

        // 2. public 폴더에도 동일한 파일 저장
        const publicPath = `${publicFolder}/${filename}`
        const { error: publicUploadError } = await supabase.storage
          .from('hotel-media')
          .upload(publicPath, blob, {
            contentType,
            upsert: true
          })

        if (publicUploadError) {
          // public 업로드 실패는 경고만 하고 계속 진행
          console.warn(`[import-from-sabre-v51] Public 폴더 업로드 실패 (${i + 1}/${imageUrls.length}): ${publicUploadError.message}`)
        }

        successCount++
        results.push({
          url: imageUrl.substring(0, 100),
          filename,
          success: true,
          originalsPath,
          publicPath: publicUploadError ? null : publicPath
        })

        console.log(`[import-from-sabre-v51] 업로드 성공 (${i + 1}/${imageUrls.length}): ${filename} (originals: ✓, public: ${publicUploadError ? '✗' : '✓'})`)

      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({
          url: imageUrl.substring(0, 100),
          success: false,
          error: errorMsg
        })
        console.error(`[import-from-sabre-v51] 업로드 실패 (${i + 1}/${imageUrls.length}):`, errorMsg)
      }
    }

    console.log(`[import-from-sabre-v51] 완료: 성공 ${successCount}/${imageUrls.length}, 실패 ${errorCount}`)

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
    console.error('[import-from-sabre-v51] 예외 발생:', error)
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
 * Sabre API v5.1 응답에서 이미지 URL 추출
 */
function extractImageUrls(sabreData: unknown): string[] {
  const urls: string[] = []
  
  if (!sabreData || typeof sabreData !== 'object') {
    return urls
  }

  const data = sabreData as Record<string, unknown>

  // hotelMediaInfo.images에서 추출
  const hotelMediaInfo = data.hotelMediaInfo as Record<string, unknown> | undefined
  if (hotelMediaInfo?.images && Array.isArray(hotelMediaInfo.images)) {
    for (const img of hotelMediaInfo.images) {
      if (img && typeof img === 'object') {
        const imgObj = img as Record<string, unknown>
        if (typeof imgObj.url === 'string' && imgObj.url) {
          urls.push(imgObj.url)
        }
      }
    }
  }

  // roomDescriptions[].images에서 추출
  const roomDescriptions = data.roomDescriptions as Array<Record<string, unknown>> | undefined
  if (Array.isArray(roomDescriptions)) {
    for (const room of roomDescriptions) {
      if (room.images && Array.isArray(room.images)) {
        for (const img of room.images) {
          if (img && typeof img === 'object') {
            const imgObj = img as Record<string, unknown>
            if (typeof imgObj.url === 'string' && imgObj.url) {
              urls.push(imgObj.url)
            }
          }
        }
      }
    }
  }

  // GetHotelDetailsRS.HotelDetailsInfo.HotelContent.MediaItems.MediaItem에서 추출
  const getHotelDetailsRS = data.GetHotelDetailsRS as Record<string, unknown> | undefined
  if (getHotelDetailsRS) {
    const hotelDetailsInfo = getHotelDetailsRS.HotelDetailsInfo as Record<string, unknown> | undefined
    if (hotelDetailsInfo) {
      const hotelContent = hotelDetailsInfo.HotelContent as Record<string, unknown> | undefined
      if (hotelContent) {
        const mediaItems = hotelContent.MediaItems as Record<string, unknown> | undefined
        if (mediaItems) {
          const mediaItem = mediaItems.MediaItem as unknown
          if (Array.isArray(mediaItem)) {
            for (const item of mediaItem) {
              if (item && typeof item === 'object') {
                const itemObj = item as Record<string, unknown>
                if (itemObj.URL && typeof itemObj.URL === 'string' && itemObj.URL) {
                  urls.push(itemObj.URL)
                }
              }
            }
          } else if (mediaItem && typeof mediaItem === 'object') {
            const itemObj = mediaItem as Record<string, unknown>
            if (itemObj.URL && typeof itemObj.URL === 'string' && itemObj.URL) {
              urls.push(itemObj.URL)
            }
          }
        }
      }
    }
  }

  // 중복 제거
  return Array.from(new Set(urls))
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
