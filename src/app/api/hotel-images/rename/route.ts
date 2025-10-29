import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_ORIGINALS, DIR_PUBLIC } from '@/lib/media-naming'

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
    const pathParts = dir.split('/') // [public|originals, slug]
    if (pathParts.length !== 2 || (pathParts[0] !== DIR_PUBLIC && pathParts[0] !== DIR_ORIGINALS)) {
      return NextResponse.json({ success: false, error: '지원하지 않는 경로입니다.' }, { status: 400 })
    }
    const scope = pathParts[0]
    const slug = pathParts[1]

    // 확장자 동일성 체크 (콘텐츠 타입 문제 방지)
    const oldExt = oldName.split('.').pop()?.toLowerCase()
    const newExt = toFilename.split('.').pop()?.toLowerCase()
    if (!oldExt || !newExt || oldExt !== newExt) {
      return NextResponse.json({ success: false, error: '확장자가 동일해야 합니다.' }, { status: 400 })
    }

    // 간단한 파일명 가드 (디렉토리 침범 방지)
    if (toFilename.includes('/') || toFilename.includes('..')) {
      return NextResponse.json({ success: false, error: '파일명에 유효하지 않은 문자가 포함되어 있습니다.' }, { status: 400 })
    }

    const toPath = `${dir}/${toFilename}`

    // 파일명 규칙 검증 및 sabre/seq 추출
    // originals/public 공통: slug_sabre_seq(.|_widthw.)ext
    const rxOrig = new RegExp(`^${slug}_(\\d+)_([0-9]{2})\\.${oldExt}$`)
    const rxPubStem = new RegExp(`^${slug}_(\\d+)_([0-9]{2})(?:_|\\.)`)
    const oldOrigMatch = oldName.match(rxOrig) || oldName.match(rxPubStem)
    if (!oldOrigMatch) {
      return NextResponse.json({ success: false, error: '현재 파일명이 규격(slug_sabre_seq)과 일치하지 않습니다.' }, { status: 400 })
    }
    const sabreOld = oldOrigMatch[1]
    const seqOld = oldOrigMatch[2]

    const newStemMatch = toFilename.match(new RegExp(`^${slug}_(\\d+)_([0-9]{2})\\.${oldExt}$`))
    if (!newStemMatch) {
      return NextResponse.json({ success: false, error: '새 파일명은 slug_sabre_seq.ext 형식이어야 합니다.' }, { status: 400 })
    }
    const sabreNew = newStemMatch[1]
    const seqNew = newStemMatch[2]
    if (sabreOld !== sabreNew) {
      return NextResponse.json({ success: false, error: 'sabre_id는 변경할 수 없습니다.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const moveOrCopy = async (src: string, dst: string) => {
      const mv = await supabase.storage.from(MEDIA_BUCKET).move(src, dst)
      if (!mv.error) return
      const dl = await supabase.storage.from(MEDIA_BUCKET).download(src)
      if (dl.error || !dl.data) throw new Error(`download failed: ${src}`)
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(dst, dl.data, { upsert: true })
      if (up.error) throw new Error(`upload failed: ${dst}`)
      const rm = await supabase.storage.from(MEDIA_BUCKET).remove([src])
      if (rm.error) throw new Error(`remove failed: ${src}`)
    }

    // 1) 요청 파일 자체 변경
    await moveOrCopy(fromPath, toPath)

    // 2) 동기화: 같은 slug/sabre/seq를 공유하는 counterparts 모두 변경
    const originalsPrefix = `${DIR_ORIGINALS}/${slug}`
    const publicPrefix = `${DIR_PUBLIC}/${slug}`

    const [origList, pubList] = await Promise.all([
      supabase.storage.from(MEDIA_BUCKET).list(originalsPrefix, { limit: 1000 }),
      supabase.storage.from(MEDIA_BUCKET).list(publicPrefix, { limit: 1000 }),
    ])

    const tasks: Array<Promise<void>> = []
    // originals: ..._{seqOld}.ext -> ..._{seqNew}.ext (파일명 전체는 slug_sabre_seq.ext 규격 유지)
    if (!origList.error) {
      for (const f of origList.data || []) {
        const name = f.name
        if (!name.includes(`_${sabreOld}_`)) continue
        if (name.includes(`_${seqOld}.`)) {
          const dst = `${originalsPrefix}/${name.replace(`_${seqOld}.`, `_${seqNew}.`)}`
          if (`${originalsPrefix}/${name}` !== dst) tasks.push(moveOrCopy(`${originalsPrefix}/${name}`, dst))
        }
      }
    }

    // public: ..._{seqOld}_{width}w.ext 및 ..._{seqOld}.ext → ..._{seqNew}_... / ..._{seqNew}.ext
    if (!pubList.error) {
      for (const f of pubList.data || []) {
        const name = f.name
        if (!name.includes(`_${sabreOld}_`)) continue
        if (name.includes(`_${seqOld}_`) || name.includes(`_${seqOld}.`)) {
          const dst = `${publicPrefix}/${name
            .replace(`_${seqOld}_`, `_${seqNew}_`)
            .replace(`_${seqOld}.`, `_${seqNew}.`)}`
          if (`${publicPrefix}/${name}` !== dst) tasks.push(moveOrCopy(`${publicPrefix}/${name}`, dst))
        }
      }
    }

    await Promise.all(tasks)

    return NextResponse.json({ success: true, data: { fromPath, toPath, sabre: sabreOld, fromSeq: seqOld, toSeq: seqNew } })
  } catch (error) {
    console.error('[hotel-images/rename] error', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


