import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_ORIGINALS, DIR_PUBLIC } from '@/lib/media-naming'

type BulkPayload = {
  orderedPaths: string[] // desired order of PUBLIC storage paths
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n))

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }
    const { orderedPaths } = body as BulkPayload
    if (!Array.isArray(orderedPaths) || orderedPaths.length === 0) {
      return NextResponse.json({ success: false, error: 'orderedPaths가 필요합니다.' }, { status: 400 })
    }

    // Validate paths, ensure all under same slug and public
    const parse = (p: string) => {
      const parts = p.split('/')
      if (parts.length < 3) return null
      const dir = parts[0]
      const slug = parts[1]
      const name = parts.slice(2).join('/')
      return { dir, slug, name }
    }
    const parsed = orderedPaths.map(parse)
    if (parsed.some((x) => !x)) {
      return NextResponse.json({ success: false, error: '경로 형식이 올바르지 않습니다.' }, { status: 400 })
    }
    const dirSet = new Set(parsed.map((x) => (x as any).dir))
    const slugSet = new Set(parsed.map((x) => (x as any).slug))
    if (dirSet.size !== 1 || !dirSet.has(DIR_PUBLIC)) {
      return NextResponse.json({ success: false, error: 'public/<slug>/ 아래 경로만 지원합니다.' }, { status: 400 })
    }
    if (slugSet.size !== 1) {
      return NextResponse.json({ success: false, error: '서로 다른 slug가 섞여 있습니다.' }, { status: 400 })
    }
    const slug = parsed[0]!.slug

    // Extract sabre and seq per item; enforce same sabre across set
    const rx = new RegExp(`^${slug}_(\\d+)_([0-9]{2})(?:\\.|_)`)
    const sabres: string[] = []
    const currentSeqs: string[] = []
    for (const x of parsed as Array<{ dir: string; slug: string; name: string }>) {
      const m = x.name.match(rx)
      if (!m) return NextResponse.json({ success: false, error: `파일명 규격(slug_sabre_seq)이 아님: ${x.name}` }, { status: 400 })
      sabres.push(m[1])
      currentSeqs.push(m[2])
    }
    const sabreSet = new Set(sabres)
    if (sabreSet.size !== 1) {
      return NextResponse.json({ success: false, error: '서로 다른 sabre_id가 섞여 있습니다.' }, { status: 400 })
    }
    const sabre = sabres[0]

    // Build mapping: oldSeq -> newSeq (based on desired order 01..N)
    const newOrderSeqs = orderedPaths.map((_, i) => pad2(i + 1))
    const mapping = new Map<string, string>()
    // currentSeqs aligned to orderedPaths
    for (let i = 0; i < currentSeqs.length; i++) {
      mapping.set(currentSeqs[i], newOrderSeqs[i])
    }

    const supabase = createServiceRoleClient()
    const originalsPrefix = `${DIR_ORIGINALS}/${slug}`
    const publicPrefix = `${DIR_PUBLIC}/${slug}`

    const [origRes, pubRes] = await Promise.all([
      supabase.storage.from(MEDIA_BUCKET).list(originalsPrefix, { limit: 1000 }),
      supabase.storage.from(MEDIA_BUCKET).list(publicPrefix, { limit: 1000 }),
    ])
    if (origRes.error) return NextResponse.json({ success: false, error: '원본 파일 목록 조회 실패' }, { status: 500 })
    if (pubRes.error) return NextResponse.json({ success: false, error: '공개 파일 목록 조회 실패' }, { status: 500 })

    type PlanItem = { from: string; to: string }
    const tmpTag = `__BULK_TMP__${Date.now()}__`
    const phase1: PlanItem[] = [] // to TMP
    const phase2: PlanItem[] = [] // TMP -> final

    const stageFiles = (base: string, files: Array<{ name: string }>) => {
      for (const f of files) {
        const name = f.name
        if (!name.includes(`_${sabre}_`)) continue
        // find which seq this has
        for (const [oldSeq, newSeq] of mapping.entries()) {
          if (oldSeq === newSeq) continue
          const hasOld = name.includes(`_${oldSeq}.`) || name.includes(`_${oldSeq}_`)
          if (!hasOld) continue
          // TMP name: replace old seq with unique tmp tag
          const tmpName = name
            .replace(`_${oldSeq}.`, `_${tmpTag}.`)
            .replace(`_${oldSeq}_`, `_${tmpTag}_`)
          const finalName = name
            .replace(`_${oldSeq}.`, `_${newSeq}.`)
            .replace(`_${oldSeq}_`, `_${newSeq}_`)
          phase1.push({ from: `${base}/${name}`, to: `${base}/${tmpName}` })
          phase2.push({ from: `${base}/${tmpName}`, to: `${base}/${finalName}` })
        }
      }
    }

    stageFiles(originalsPrefix, origRes.data || [])
    stageFiles(publicPrefix, pubRes.data || [])

    // Move helper (with fallback)
    const move = async (fromPath: string, toPath: string) => {
      const mv = await supabase.storage.from(MEDIA_BUCKET).move(fromPath, toPath)
      if (!mv.error) return
      const dl = await supabase.storage.from(MEDIA_BUCKET).download(fromPath)
      if (dl.error || !dl.data) throw new Error(`download failed: ${fromPath}`)
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(toPath, dl.data, { upsert: true })
      if (up.error) throw new Error(`upload failed: ${toPath}`)
      const rm = await supabase.storage.from(MEDIA_BUCKET).remove([fromPath])
      if (rm.error) throw new Error(`remove failed: ${fromPath}`)
    }

    // Pre-clean TMP destinations
    if (phase1.length === 0 && phase2.length === 0) {
      return NextResponse.json({ success: true, data: { changed: false } })
    }
    const tmpTargets = Array.from(new Set(phase1.map(p => p.to)))
    if (tmpTargets.length) {
      await supabase.storage.from(MEDIA_BUCKET).remove(tmpTargets)
    }

    // Phase 1: to TMP
    for (const p of phase1) {
      await move(p.from, p.to)
    }
    // Phase 2: TMP -> final
    for (const p of phase2) {
      await move(p.from, p.to)
    }

    return NextResponse.json({ success: true, data: { changed: true, slug, sabre, count: orderedPaths.length } })
  } catch (error) {
    console.error('[hotel-images/reorder/bulk] error', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


