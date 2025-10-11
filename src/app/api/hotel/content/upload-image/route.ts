import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sabreId = formData.get('sabreId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // 파일명 생성 (타임스탬프 추가로 중복 방지)
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = sabreId 
      ? `${sabreId}-content-${timestamp}.${fileExtension}`
      : `content-${timestamp}.${fileExtension}`
    
    // Storage 경로
    const storagePath = sabreId 
      ? `content/${sabreId}/${fileName}`
      : `content/general/${fileName}`

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hotel-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
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

