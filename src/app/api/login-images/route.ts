import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'login-image')
    const entries = await readdir(dir, { withFileTypes: true })
    const images = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name))

    return NextResponse.json({ success: true, data: images })
  } catch (error) {
    console.error('login-images list error:', error)
    return NextResponse.json(
      { success: false, error: '이미지 목록을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}


