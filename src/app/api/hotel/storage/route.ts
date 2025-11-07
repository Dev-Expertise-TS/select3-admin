import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC, DIR_ORIGINALS, normalizeSlug } from '@/lib/media-naming'

// GET: 호텔 Storage 폴더 존재 여부 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreId = searchParams.get('sabre_id')
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 호텔 데이터에서 slug 조회
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('slug')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: '호텔에 slug 정보가 없습니다' },
        { status: 400 }
      )
    }

    // Storage 폴더 존재 여부 확인 (두 가지 경로 구조 모두 확인)
    const normalizedSlug = normalizeSlug(hotel.slug as string)
    
    console.log(`[storage] Sabre ID: ${sabreId}, Normalized Slug: ${normalizedSlug}`)
    
    // 1. Public 폴더 확인 - 두 가지 경로 시도
    // 경로 1: public/{slug}
    const publicFolderPath1 = `${DIR_PUBLIC}/${normalizedSlug}`
    // 경로 2: hotel-images/{sabre_id}/public
    const publicFolderPath2 = `hotel-images/${sabreId}/public`
    
    console.log(`[storage] Public 폴더 조회 시도:`, { path1: publicFolderPath1, path2: publicFolderPath2 })
    
    let publicExists = false
    let publicFileCount = 0
    let publicFolderPath = publicFolderPath1
    
    // 첫 번째 경로 시도
    const { data: publicFiles1, error: publicError1 } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(publicFolderPath1, { limit: 100 })
    
    if (!publicError1 && publicFiles1 && publicFiles1.length > 0) {
      publicExists = true
      publicFileCount = publicFiles1.length
      publicFolderPath = publicFolderPath1
      console.log(`[storage] ✓ Public 폴더 발견 (경로 1): ${publicFolderPath}, 파일 수: ${publicFileCount}`)
    } else {
      // 두 번째 경로 시도
      const { data: publicFiles2, error: publicError2 } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(publicFolderPath2, { limit: 100 })
      
      if (!publicError2 && publicFiles2 && publicFiles2.length > 0) {
        publicExists = true
        publicFileCount = publicFiles2.length
        publicFolderPath = publicFolderPath2
        console.log(`[storage] ✓ Public 폴더 발견 (경로 2): ${publicFolderPath}, 파일 수: ${publicFileCount}`)
      } else {
        console.log(`[storage] Public 폴더 없음 (둘 다 시도함)`)
      }
    }

    // 2. Originals 폴더 확인 - 두 가지 경로 시도
    // 경로 1: originals/{slug}
    const originalsFolderPath1 = `${DIR_ORIGINALS}/${normalizedSlug}`
    // 경로 2: hotel-images/{sabre_id}/originals
    const originalsFolderPath2 = `hotel-images/${sabreId}/originals`
    
    console.log(`[storage] Originals 폴더 조회 시도:`, { path1: originalsFolderPath1, path2: originalsFolderPath2 })
    
    let originalsExists = false
    let originalsFileCount = 0
    let originalsFolderPath = originalsFolderPath1
    
    // 첫 번째 경로 시도
    const { data: originalsFiles1, error: originalsError1 } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(originalsFolderPath1, { limit: 100 })
    
    if (!originalsError1 && originalsFiles1 && originalsFiles1.length > 0) {
      originalsExists = true
      originalsFileCount = originalsFiles1.length
      originalsFolderPath = originalsFolderPath1
      console.log(`[storage] ✓ Originals 폴더 발견 (경로 1): ${originalsFolderPath}, 파일 수: ${originalsFileCount}`)
    } else {
      // 두 번째 경로 시도
      const { data: originalsFiles2, error: originalsError2 } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(originalsFolderPath2, { limit: 100 })
      
      if (!originalsError2 && originalsFiles2 && originalsFiles2.length > 0) {
        originalsExists = true
        originalsFileCount = originalsFiles2.length
        originalsFolderPath = originalsFolderPath2
        console.log(`[storage] ✓ Originals 폴더 발견 (경로 2): ${originalsFolderPath}, 파일 수: ${originalsFileCount}`)
      } else {
        console.log(`[storage] Originals 폴더 없음 (둘 다 시도함)`)
      }
    }

    const responseData = {
      // Public 폴더 정보
      exists: publicExists, 
      slug: normalizedSlug,
      folderPath: publicFolderPath,
      path: publicFolderPath,
      fileCount: publicFileCount,
      // Originals 폴더 정보
      originalsExists,
      originalsPath: originalsFolderPath,
      originalsFileCount
    }
    
    console.log('[storage] 최종 응답 데이터:', responseData)

    // 응답 반환 (public과 originals 정보 모두 포함)
    return NextResponse.json(
      { 
        success: true, 
        data: responseData
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Storage 폴더 확인 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// POST: 호텔 Storage 폴더 생성
export async function POST(request: NextRequest) {
  try {
    const { sabreId } = await request.json()
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    
    // 호텔 데이터에서 slug 조회
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('slug')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: '호텔에 slug 정보가 없습니다' },
        { status: 400 }
      )
    }

    // 먼저 폴더가 이미 존재하는지 확인 (hotel-media 버킷의 public/{slug} 경로)
    const normalizedSlug = normalizeSlug(hotel.slug as string)
    const folderPath = `${DIR_PUBLIC}/${normalizedSlug}`
    
    console.log(`[storage] 폴더 존재 여부 확인: ${folderPath}`)
    
    const { data: existingFiles, error: checkError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folderPath, { limit: 1 })

    if (!checkError && existingFiles && existingFiles.length > 0) {
      console.log(`[storage] 폴더가 이미 존재함: ${folderPath} (${existingFiles.length}개 파일)`)
      
      // 이미 존재하지만 .keep 파일이 없다면 추가
      const hasKeepFile = existingFiles.some(f => f.name === '.keep')
      if (!hasKeepFile) {
        console.log(`[storage] .keep 파일이 없어서 추가 중...`)
        // .keep 파일 추가는 계속 진행
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: '폴더가 이미 존재합니다' 
          },
          { status: 409 }
        )
      }
    }

    // Storage 폴더 생성 (1x1 투명 PNG 이미지를 마커로 업로드)
    const fileName = '.keep' // 폴더 생성 마커 파일
    
    // 1x1 투명 PNG (67 bytes) - Base64 인코딩
    const transparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const pngBuffer = Buffer.from(transparentPngBase64, 'base64')
    const fileContent = new Blob([pngBuffer], { type: 'image/png' })
    
    console.log(`[storage] 폴더 생성 시도: ${folderPath}/${fileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(`${folderPath}/${fileName}`, fileContent, {
        contentType: 'image/png',
        upsert: true // 이미 존재해도 덮어쓰기
      })

    if (uploadError) {
      console.error('Storage public 폴더 생성 오류:', uploadError)
      return NextResponse.json(
        { success: false, error: `Public 폴더 생성 중 오류가 발생했습니다: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log(`[storage] ✓ Public 폴더 생성 성공: ${folderPath}`)

    // Originals 폴더도 함께 생성
    const originalsFolderPath = `${DIR_ORIGINALS}/${normalizedSlug}`
    const originalsFileName = '.keep'
    
    // 1x1 투명 PNG 재사용
    const originalsFileContent = new Blob([pngBuffer], { type: 'image/png' })
    
    console.log(`[storage] Originals 폴더 생성 시도: ${originalsFolderPath}/${originalsFileName}`)
    
    const { data: originalsUploadData, error: originalsUploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(`${originalsFolderPath}/${originalsFileName}`, originalsFileContent, {
        contentType: 'image/png',
        upsert: true
      })

    if (originalsUploadError) {
      console.warn('[storage] Originals 폴더 생성 경고 (Public은 생성됨):', originalsUploadError)
      // Originals 폴더 생성 실패는 경고만 하고 계속 진행
    } else {
      console.log(`[storage] ✓ Originals 폴더 생성 성공: ${originalsFolderPath}`)
    }

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          message: 'Storage 폴더가 성공적으로 생성되었습니다',
          slug: normalizedSlug,
          folderPath,
          uploadPath: uploadData.path,
          originalsPath: originalsFolderPath,
          originalsUploadPath: originalsUploadData?.path
        } 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Storage 폴더 생성 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
