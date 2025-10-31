import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC } from '@/lib/media-naming'

/**
 * Public 폴더의 파일명만 변경하는 간단한 API
 * Originals는 별도로 처리하지 않음 (캐시 초기화 시 자동 동기화됨)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const { fromPath, toFilename } = body as { fromPath?: string; toFilename?: string }
    if (!fromPath || !toFilename) {
      return NextResponse.json({ success: false, error: 'fromPath, toFilename은 필수입니다.' }, { status: 400 })
    }

    // 같은 디렉토리 내에서만 이름 변경 허용
    const idx = fromPath.lastIndexOf('/')
    if (idx === -1) {
      return NextResponse.json({ success: false, error: '경로 형식이 잘못되었습니다.' }, { status: 400 })
    }

    const dir = fromPath.slice(0, idx) // e.g., public/slug
    const oldName = fromPath.slice(idx + 1)
    const pathParts = dir.split('/') // [public, slug]
    if (pathParts.length !== 2 || (pathParts[0] !== DIR_PUBLIC)) {
      // 파일명 변경은 public 폴더에서만 허용
      return NextResponse.json({ success: false, error: 'public 폴더에서만 파일명 변경이 가능합니다.' }, { status: 400 })
    }
    const slug = pathParts[1]

    // 확장자 동일성 체크
    const oldExt = oldName.split('.').pop()?.toLowerCase()
    const newExt = toFilename.split('.').pop()?.toLowerCase()
    if (!oldExt || !newExt || oldExt !== newExt) {
      return NextResponse.json({ success: false, error: '확장자가 동일해야 합니다.' }, { status: 400 })
    }

    // 파일명 가드 (디렉토리 침범 방지)
    if (toFilename.includes('/') || toFilename.includes('..')) {
      return NextResponse.json({ success: false, error: '파일명에 유효하지 않은 문자가 포함되어 있습니다.' }, { status: 400 })
    }

    const toPath = `${dir}/${toFilename}`

    // 파일명 규칙 검증 및 sabre/seq 추출
    // public: slug_sabre_seq_widthw.ext (seq는 1자리 이상 숫자)
    const rxPubStem = new RegExp(`^${slug}_(\\d+)_([0-9]+)(?:_\\d+w)?\\.${oldExt}$`)
    const oldMatch = oldName.match(rxPubStem)
    if (!oldMatch) {
      return NextResponse.json({ success: false, error: '현재 파일명이 규격(slug_sabre_seq[_widthw].ext)과 일치하지 않습니다.' }, { status: 400 })
    }
    const sabreOld = oldMatch[1]
    const seqOld = oldMatch[2]

    // 새 파일명 검증
    const newMatch = toFilename.match(new RegExp(`^${slug}_(\\d+)_([0-9]+)(?:_\\d+w)?\\.${newExt}$`))
    if (!newMatch) {
      return NextResponse.json({ success: false, error: `새 파일명은 ${slug}_sabre_seq[_widthw].ext 형식이어야 합니다.` }, { status: 400 })
    }
    const sabreNew = newMatch[1]
    const seqNew = newMatch[2]
    
    if (sabreOld !== sabreNew) {
      return NextResponse.json({ success: false, error: 'sabre_id는 변경할 수 없습니다.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 호텔 정보 조회 (sabreId 확인)
    const { data: hotel } = await supabase
      .from("select_hotels")
      .select("sabre_id")
      .eq("sabre_id", sabreOld)
      .single()

    if (!hotel) {
      return NextResponse.json({ success: false, error: '호텔 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 중복 확인: 동일 디렉터리에 같은 파일명이 있는지 확인
    if (oldName !== toFilename) {
      const { data: existingList, error: listErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(dir, { limit: 1000 })
      
      if (!listErr && existingList) {
        const duplicateFile = existingList.find((f) => f.name === toFilename && f.name !== oldName)
        
        if (duplicateFile) {
          console.log(`[파일명 변경] 중복 발견: ${toFilename}`)
          return NextResponse.json({ 
            success: false, 
            error: `동일한 파일명이 이미 존재합니다: ${toFilename}`, 
            code: 'DUPLICATE' 
          }, { status: 409 })
        }
      }
    }

    // 파일 이동/복사 함수
    const moveOrCopyFile = async (src: string, dst: string) => {
      const mv = await supabase.storage.from(MEDIA_BUCKET).move(src, dst)
      if (!mv.error) return
      // move 실패 시 복사 후 원본 삭제
      const dl = await supabase.storage.from(MEDIA_BUCKET).download(src)
      if (dl.error || !dl.data) throw new Error(`download failed: ${src}`)
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(dst, dl.data, { upsert: false })
      if (up.error) throw new Error(`upload failed: ${dst}`)
      const rm = await supabase.storage.from(MEDIA_BUCKET).remove([src])
      if (rm.error) throw new Error(`remove failed: ${src}`)
    }

    // Public 파일 이름 변경
    console.log(`[파일명 변경] Public: ${fromPath} -> ${toPath}`)
    await moveOrCopyFile(fromPath, toPath)

    // select_hotel_media 테이블 업데이트
    const oldFileName = oldName
    const newFileName = toFilename
    
    // sabre_id와 파일명으로 레코드 찾기
    const { data: existingRecords } = await supabase
      .from('select_hotel_media')
      .select('*')
      .eq('sabre_id', sabreOld)
      .eq('file_name', oldFileName)

    // file_path나 storage_path로도 찾기
    const { data: pathRecords } = await supabase
      .from('select_hotel_media')
      .select('*')
      .eq('sabre_id', sabreOld)
      .or(`file_path.eq.${fromPath},storage_path.eq.${fromPath}`)

    // 중복 제거 (id 기준)
    const allRecords = [...(existingRecords || []), ...(pathRecords || [])]
    const uniqueRecords = Array.from(
      new Map(allRecords.map(record => [record.id, record])).values()
    )

    let dbUpdatedCount = 0
    if (uniqueRecords.length > 0) {
      for (const record of uniqueRecords) {
        const { data: urlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(toPath)

        const { error: updateError } = await supabase
          .from('select_hotel_media')
          .update({
            file_name: newFileName,
            file_path: toPath,
            storage_path: toPath,
            public_url: urlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (updateError) {
          console.error(`[파일명 변경] DB 레코드 업데이트 오류 (ID: ${record.id}):`, updateError)
        } else {
          console.log(`[파일명 변경] DB 레코드 업데이트 완료`)
          dbUpdatedCount++
        }
      }
    } else {
      console.log(`[파일명 변경] DB 레코드를 찾을 수 없음 (sabre_id: ${sabreOld}, 파일명: ${oldFileName})`)
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        fromPath, 
        toPath,
        dbUpdated: dbUpdatedCount
      } 
    })
  } catch (error) {
    console.error('[hotel-images/rename] error', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
