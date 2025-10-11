import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type')
    
    let file: File | null = null
    let sabreId: string | undefined = undefined
    let imageUrl: string | undefined = undefined

    // FormData (파일 업로드) 또는 JSON (URL 다운로드) 처리
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData()
      file = formData.get('file') as File
      sabreId = formData.get('sabreId') as string | undefined
    } else {
      const body = await request.json()
      imageUrl = body.imageUrl
      sabreId = body.sabreId
    }

    const supabase = createServiceRoleClient()
    const timestamp = Date.now()

    let buffer: Uint8Array
    let fileExtension: string
    let fileContentType: string

    if (imageUrl) {
      // URL에서 이미지 다운로드
      const response = await fetch(imageUrl, { method: 'GET' })
      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `이미지 다운로드 실패: ${response.status}` },
          { status: 400 }
        )
      }

      fileContentType = response.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await response.arrayBuffer()
      buffer = new Uint8Array(arrayBuffer)

      // 파일 크기 제한 (10MB)
      if (buffer.length > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: '파일 크기가 10MB를 초과합니다.' },
          { status: 400 }
        )
      }

      // 확장자 추정
      fileExtension = (() => {
        if (fileContentType.includes('png')) return 'png'
        if (fileContentType.includes('webp')) return 'webp'
        if (fileContentType.includes('avif')) return 'avif'
        if (fileContentType.includes('gif')) return 'gif'
        return 'jpg'
      })()
    } else if (file) {
      // 파일 업로드
      const arrayBuffer = await file.arrayBuffer()
      buffer = new Uint8Array(arrayBuffer)
      fileExtension = file.name.split('.').pop() || 'jpg'
      fileContentType = file.type
    } else {
      return NextResponse.json(
        { success: false, error: '파일 또는 이미지 URL이 필요합니다.' },
        { status: 400 }
      )
    }

    // 파일명 생성
    const fileName = sabreId 
      ? `${sabreId}-content-${timestamp}.${fileExtension}`
      : `content-${timestamp}.${fileExtension}`
    
    // Storage 경로
    const storagePath = sabreId 
      ? `content/${sabreId}/${fileName}`
      : `content/general/${fileName}`

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hotel-media')
      .upload(storagePath, buffer, {
        contentType: fileContentType,
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

    console.log(`콘텐츠 이미지 업로드 완료: ${storagePath}`)

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrlData.publicUrl,
        fileName,
        filePath: storagePath
      }
    })

  } catch (error) {
    console.error('이미지 업로드 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

