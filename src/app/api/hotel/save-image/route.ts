import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// POST: 클라이언트에서 변환된 AVIF 이미지를 Storage에 저장
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sabreId = formData.get('sabreId') as string
    const imageIndex = formData.get('imageIndex') as string
    
    if (!sabreId || !file || !imageIndex) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID, 파일, 이미지 인덱스가 필요합니다' },
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

    // 폴더 경로 설정
    const folderPath = `hotels/${hotel.slug}`
    
    // 기존 파일 목록 확인하여 다음 번호 결정
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('select-media')
      .list(folderPath)

    if (listError) {
      console.error('기존 파일 목록 조회 오류:', listError)
      return NextResponse.json(
        { success: false, error: '기존 파일 목록을 조회할 수 없습니다' },
        { status: 500 }
      )
    }

    // 기존 파일에서 같은 패턴의 파일 번호 찾기 (avif, webp 모두 포함)
    const filePattern = new RegExp(`^${sabreId}-${hotel.slug}-(\\d+)\\.(avif|webp)$`)
    const existingNumbers = existingFiles
      ?.map(file => {
        const match = file.name.match(filePattern)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter(num => num > 0) || []

    // 다음 번호 결정
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1

    // 파일 확장자와 MIME 타입 결정
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'avif'
    const contentType = fileExtension === 'avif' ? 'image/avif' : 'image/webp'
    
    // 파일명 생성
    const fileName = `${sabreId}-${hotel.slug}-${nextNumber}.${fileExtension}`
    const filePath = `${folderPath}/${fileName}`

    try {
      // 클라이언트에서 변환된 파일을 Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('select-media')
        .upload(filePath, file, {
          upsert: true,
          contentType: contentType
        })

      if (uploadError) {
        console.error('Storage 업로드 오류:', uploadError)
        return NextResponse.json(
          { success: false, error: '이미지 저장 중 오류가 발생했습니다' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { 
          success: true, 
          data: { 
            message: '이미지가 성공적으로 저장되었습니다',
            fileName,
            filePath: uploadData.path,
            fileSize: file.size,
            sabreId,
            slug: hotel.slug,
            imageIndex: parseInt(imageIndex, 10),
            nextNumber
          } 
        },
        { status: 201 }
      )

    } catch (imageError) {
      console.error('이미지 처리 오류:', imageError)
      return NextResponse.json(
        { success: false, error: `이미지 처리 중 오류가 발생했습니다: ${imageError instanceof Error ? imageError.message : '알 수 없는 오류'}` },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('이미지 저장 API 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
