'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC, buildOriginalFilename, buildPublicPath, normalizeSlug } from '@/lib/media-naming'

export type UploadFromUrlsInput = {
  sabreId: string
  urls: string[]
}

export type UploadFromUrlsResult = {
  uploaded: number
  total: number
  results: Array<{ url: string; path?: string; error?: string }>
  folderPath: string
}

export async function uploadHotelImagesFromUrls(input: UploadFromUrlsInput) {
  const supabase = createServiceRoleClient()

  const sabreIdRaw = input?.sabreId
  const urlsRaw = Array.isArray(input?.urls) ? input.urls : []

  if (!sabreIdRaw || typeof sabreIdRaw !== 'string') {
    return { success: false as const, error: 'Sabre ID는 필수입니다.' }
  }
  
  const sabreId = sabreIdRaw.trim()
  const urls = urlsRaw.map((u) => String(u).trim()).filter((u) => u.length > 0).slice(0, 20)
  
  if (urls.length === 0) {
    return { success: false as const, error: '업로드할 이미지 URL을 입력해주세요.' }
  }

  // 호텔 정보 조회 (slug 필요)
  const { data: hotel, error: hotelError } = await supabase
    .from('select_hotels')
    .select('sabre_id, slug')
    .eq('sabre_id', sabreId)
    .single()

  if (hotelError || !hotel?.slug) {
    return { success: false as const, error: '호텔 정보를 찾을 수 없거나 slug가 없습니다.' }
  }

  const slug = normalizeSlug(String(hotel.slug))
  const folderPath = `${DIR_PUBLIC}/${slug}`

  // 기존 파일 목록 조회 → 최대 seq 계산
  const { data: existingList, error: listError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .list(folderPath, { limit: 1000 })

  if (listError) {
    return { success: false as const, error: '기존 이미지 목록을 불러오는 중 오류가 발생했습니다.' }
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

      // select_hotel_media 테이블에 레코드 Upsert
      const { data: publicUrlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(storagePath)

      const mediaRecord = {
        sabre_id: sabreId,
        file_name: filename,
        file_path: storagePath,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        file_type: contentType,
        file_size: buffer.length,
        slug: slug,
        image_seq: nextSeq,
        original_url: url,
      }

      console.log('[uploadHotelImagesFromUrls] Attempting to upsert media record:', mediaRecord)

      // 기존 레코드 확인
      const { data: existing } = await supabase
        .from('select_hotel_media')
        .select('id')
        .eq('sabre_id', sabreId)
        .eq('file_path', storagePath)
        .maybeSingle()

      if (existing) {
        // 업데이트
        console.log('[uploadHotelImagesFromUrls] 기존 레코드 업데이트:', existing.id)
        const { error: updateError } = await supabase
          .from('select_hotel_media')
          .update({
            file_name: mediaRecord.file_name,
            storage_path: mediaRecord.storage_path,
            public_url: mediaRecord.public_url,
            file_type: mediaRecord.file_type,
            file_size: mediaRecord.file_size,
            slug: mediaRecord.slug,
            image_seq: mediaRecord.image_seq,
            original_url: mediaRecord.original_url,
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[uploadHotelImagesFromUrls] DB 업데이트 오류:', updateError)
        }
      } else {
        // 삽입
        console.log('[uploadHotelImagesFromUrls] 새 레코드 삽입')
        const { error: insertError } = await supabase
          .from('select_hotel_media')
          .insert(mediaRecord)

        if (insertError) {
          console.error('[uploadHotelImagesFromUrls] DB 삽입 오류:', insertError)
        }
      }

      results.push({ url, path: storagePath })
    } catch (err) {
      console.error('[uploadHotelImagesFromUrls] 오류:', err)
      results.push({ url, error: '다운로드/업로드 중 오류' })
    }
  }

  const okCount = results.filter((r) => !r.error).length
  
  return {
    success: true as const,
    data: {
      uploaded: okCount,
      total: results.length,
      results,
      folderPath,
    } satisfies UploadFromUrlsResult,
  }
}


