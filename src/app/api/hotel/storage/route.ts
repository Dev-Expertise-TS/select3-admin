import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC, normalizeSlug } from '@/lib/media-naming'

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

    // Storage 폴더 존재 여부 확인 (hotel-media 버킷의 public/{slug} 경로)
    const normalizedSlug = normalizeSlug(hotel.slug as string)
    const folderPath = `${DIR_PUBLIC}/${normalizedSlug}`
    
    // 폴더 내의 파일들을 확인하여 폴더 존재 여부 판단
    const { data: files, error: storageError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folderPath, {
        limit: 100
      })

    if (storageError) {
      // 폴더가 존재하지 않는 경우
      if (storageError.message.includes('not found') || 
          storageError.message.includes('does not exist') ||
          storageError.message.includes('The resource was not found')) {
        return NextResponse.json(
          { 
            success: true, 
            data: { 
              exists: false, 
              slug: normalizedSlug,
              folderPath 
            } 
          },
          { status: 200 }
        )
      }
      
      console.error('Storage 폴더 확인 오류:', storageError)
      return NextResponse.json(
        { success: false, error: 'Storage 폴더 확인 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    // 파일이 있으면 폴더가 존재하는 것으로 간주
    const fileCount = files?.length || 0
    const exists = fileCount > 0

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          exists, 
          slug: normalizedSlug,
          folderPath,
          fileCount
        } 
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
    const { data: existingFiles, error: checkError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folderPath, { limit: 1 })

    if (!checkError && existingFiles && existingFiles.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '폴더가 이미 존재합니다' 
        },
        { status: 409 }
      )
    }

    // Storage 폴더 생성 (마커 파일을 업로드하여 폴더 생성)
    const fileName = '.folder-marker' // 폴더 생성 마커 파일
    const fileContent = new Blob([`폴더 생성일: ${new Date().toISOString()}\n호텔 Slug: ${normalizedSlug}`], { type: 'text/plain' })
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(`${folderPath}/${fileName}`, fileContent, {
        upsert: false // 이미 존재하면 오류
      })

    if (uploadError) {
      console.error('Storage 폴더 생성 오류:', uploadError)
      return NextResponse.json(
        { success: false, error: `Storage 폴더 생성 중 오류가 발생했습니다: ${uploadError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          message: 'Storage 폴더가 성공적으로 생성되었습니다',
          slug: normalizedSlug,
          folderPath,
          uploadPath: uploadData.path
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
