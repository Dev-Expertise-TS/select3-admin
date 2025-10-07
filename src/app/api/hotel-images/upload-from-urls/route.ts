import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC, buildOriginalFilename, buildPublicPath, normalizeSlug } from '@/lib/media-naming'

type UploadFromUrlsBody = {
  sabreId: string
  urls: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const json = (await request.json()) as Partial<UploadFromUrlsBody>

    const sabreIdRaw = json.sabreId
    const urlsRaw = Array.isArray(json.urls) ? json.urls : []

    if (!sabreIdRaw || typeof sabreIdRaw !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Sabre ID는 필수입니다.' },
        { status: 400 }
      )
    }
    const sabreId = sabreIdRaw.trim()
    const urls = urlsRaw.map((u) => String(u).trim()).filter((u) => u.length > 0).slice(0, 20)
    if (urls.length === 0) {
      return NextResponse.json(
        { success: false, error: '업로드할 이미지 URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 호텔 정보 조회 (slug 필요)
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('sabre_id, slug')
      .eq('sabre_id', sabreId)
      .single()

    if (hotelError || !hotel?.slug) {
      return NextResponse.json(
        { success: false, error: '호텔 정보를 찾을 수 없거나 slug가 없습니다.' },
        { status: 404 }
      )
    }

    const slug = normalizeSlug(hotel.slug as string)
    const folderPath = `${DIR_PUBLIC}/${slug}`

    // 기존 파일 목록 조회 → 최대 seq 계산
    const { data: existingList, error: listError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folderPath, { limit: 1000 })

    if (listError) {
      console.error('Storage 목록 조회 오류:', listError)
      return NextResponse.json(
        { success: false, error: '기존 이미지 목록을 불러오는 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 파일명에서 seq 추출: slug_sabre_XX(.|_)
    let maxSeq = 0
    const seqRegex = new RegExp(`^${slug}_${sabreId}_(\\d{2})(?:_|\\.)`)
    for (const f of existingList || []) {
      const m = f.name ? f.name.match(seqRegex) : null
      if (m) {
        const seq = parseInt(m[1], 10)
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq
      }
    }

    const results: Array<{ url: string; path?: string; error?: string }> = []

    // 각 URL 다운로드 후 업로드
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const response = await fetch(url, { method: 'GET' })
        if (!response.ok) {
          results.push({ url, error: `원격 이미지 요청 실패(${response.status})` })
          continue
        }
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        const arrayBuffer = await response.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const nextSeq = maxSeq + 1 + i
        // 확장자 추정
        const inferredExt = (() => {
          if (contentType.includes('png')) return 'png'
          if (contentType.includes('webp')) return 'webp'
          if (contentType.includes('avif')) return 'avif'
          return 'jpg'
        })()

        const filename = buildOriginalFilename({ hotelSlug: slug, sabreId, seq: nextSeq, ext: inferredExt as 'jpg' | 'jpeg' | 'webp' | 'avif' | 'png' })
        const storagePath = buildPublicPath(slug, filename) // public/{slug}/{filename}

        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(storagePath, buffer, {
            contentType,
            upsert: false,
          })

        if (uploadError) {
          results.push({ url, error: `업로드 실패: ${uploadError.message}` })
          continue
        }

        results.push({ url, path: storagePath })
      } catch {
        results.push({ url, error: '다운로드/업로드 중 오류' })
      }
    }

    const okCount = results.filter((r) => !r.error).length
    return NextResponse.json(
      {
        success: true,
        data: {
          uploaded: okCount,
          total: results.length,
          results,
          folderPath,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('업로드(다중 URL) 처리 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}


