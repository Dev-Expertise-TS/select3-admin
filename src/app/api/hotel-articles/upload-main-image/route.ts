import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, blogSlug } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: '이미지 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    // URL에서 이미지 다운로드
    const response = await fetch(imageUrl, { method: 'GET' })
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `이미지 다운로드 실패: ${response.status}` },
        { status: 400 }
      )
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 파일 크기 제한 (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '파일 크기가 10MB를 초과합니다.' },
        { status: 400 }
      )
    }

    // 확장자 추정
    const inferredExt = (() => {
      if (contentType.includes('png')) return 'png'
      if (contentType.includes('webp')) return 'webp'
      if (contentType.includes('avif')) return 'avif'
      if (contentType.includes('gif')) return 'gif'
      return 'jpg'
    })()

    // 파일명 생성
    const timestamp = Date.now()
    const fileName = blogSlug 
      ? `${blogSlug}-main-${timestamp}.${inferredExt}`
      : `blog-main-${timestamp}.${inferredExt}`
    
    // Storage 경로
    const storagePath = blogSlug 
      ? `blog/${blogSlug}/${fileName}`
      : `blog/general/${fileName}`

    const supabase = createServiceRoleClient()

    // Supabase Storage에 업로드
    const { error: uploadError } = await supabase.storage
      .from('hotel-media')
      .upload(storagePath, buffer, {
        contentType,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage 업로드 오류:', uploadError)
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from('hotel-media')
      .getPublicUrl(storagePath)

    console.log(`블로그 대표 이미지 업로드 완료: ${storagePath}`)

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrlData.publicUrl,
        fileName,
        filePath: storagePath,
        originalUrl: imageUrl
      }
    })

  } catch (error) {
    console.error('블로그 대표 이미지 업로드 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

