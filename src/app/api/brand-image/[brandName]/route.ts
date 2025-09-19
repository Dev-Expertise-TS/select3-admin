import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandName: string }> }
) {
  try {
    const { brandName } = await params
    
    if (!brandName) {
      return NextResponse.json(
        { success: false, error: '브랜드 이름이 필요합니다' },
        { status: 400 }
      )
    }

    // 브랜드 이미지 파일 경로
    const imagePath = path.join(process.cwd(), 'public', 'brand-image', `${brandName}.svg`)
    
    try {
      // SVG 파일 읽기
      const imageBuffer = await readFile(imagePath)
      
      return new NextResponse(imageBuffer.toString(), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400', // 24시간 캐시
        },
      })
    } catch (_fileError) {
      // 파일이 없으면 기본 브랜드 이미지 생성
      const defaultSvg = `<svg width="100" height="60" viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="60" fill="#6b7280" rx="8"/>
        <text x="50" y="35" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="white">${brandName.toUpperCase()}</text>
      </svg>`
      
      return new NextResponse(defaultSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600', // 1시간 캐시
        },
      })
    }
  } catch (error) {
    console.error('브랜드 이미지 로드 오류:', error)
    return NextResponse.json(
      { success: false, error: '브랜드 이미지를 불러올 수 없습니다' },
      { status: 500 }
    )
  }
}
