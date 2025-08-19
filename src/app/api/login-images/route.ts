import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

// 정적 이미지 목록 (빌드 시점에 결정)
const STATIC_IMAGES = [
  '83676837979944ca4d2aa0ffeb8f94cc.jpeg',
  'd8dbdb8f818a0e1741aceb5023ed3f18.jpeg',
  'Rooftop-pool.jpg'
]

export async function GET() {
  try {
    // 정적 이미지 목록을 우선 반환 (빠른 응답)
    if (STATIC_IMAGES.length > 0) {
      return NextResponse.json(
        { success: true, data: STATIC_IMAGES },
        {
          headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'CDN-Cache-Control': 'public, max-age=86400',
            'Vercel-CDN-Cache-Control': 'public, max-age=86400'
          }
        }
      )
    }

    // 동적 이미지 목록 (폴백)
    const dir = path.join(process.cwd(), 'public', 'login-image')
    const entries = await readdir(dir, { withFileTypes: true })
    const images = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))

    return NextResponse.json(
      { success: true, data: images },
      {
        headers: {
          'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
          'CDN-Cache-Control': 'public, max-age=3600',
          'Vercel-CDN-Cache-Control': 'public, max-age=3600'
        }
      }
    )
  } catch (error) {
    console.error('login-images list error:', error)
    
    // 에러 시에도 정적 이미지 목록 반환
    if (STATIC_IMAGES.length > 0) {
      return NextResponse.json(
        { success: true, data: STATIC_IMAGES },
        {
          headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
          }
        }
      )
    }
    
    return NextResponse.json(
      { success: false, error: '이미지 목록을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}


