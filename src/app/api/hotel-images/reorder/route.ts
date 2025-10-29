import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_ORIGINALS, DIR_PUBLIC, normalizeSlug } from '@/lib/media-naming'

type ReorderBySeqPayload = {
  hotelSlug: string
  sabreId: string
  fromSeq: number
  toSeq: number
}

type ReorderByPathPayload = {
  fromPath: string
  toPath: string
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n))

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // helper to move with fallback (some SDKs support move, else copy+remove)
    const moveObject = async (fromPath: string, toPath: string) => {
      // try move API if available via RPC
      const { error: moveError } = await supabase.storage.from(MEDIA_BUCKET).move(fromPath, toPath)
      if (!moveError) return { ok: true as const }

      // fallback: download -> upload -> remove (not ideal for large files, but safe)
      const { data: downloadData, error: downloadErr } = await supabase.storage.from(MEDIA_BUCKET).download(fromPath)
      if (downloadErr || !downloadData) return { ok: false as const, error: new Error(`download failed: ${fromPath} -> ${toPath}: ${downloadErr?.message || 'unknown'}`) }

      const { error: uploadErr } = await supabase.storage.from(MEDIA_BUCKET).upload(toPath, downloadData, { upsert: true })
      if (uploadErr) return { ok: false as const, error: new Error(`upload failed: ${fromPath} -> ${toPath}: ${uploadErr.message}`) }

      const { error: removeErr } = await supabase.storage.from(MEDIA_BUCKET).remove([fromPath])
      if (removeErr) return { ok: false as const, error: new Error(`remove failed: ${fromPath}: ${removeErr.message}`) }

      return { ok: true as const }
    }

    // Path-based swap preferred
    if ((body as ReorderByPathPayload).fromPath && (body as ReorderByPathPayload).toPath) {
      const { fromPath, toPath } = body as ReorderByPathPayload
      // Validate
      if (typeof fromPath !== 'string' || typeof toPath !== 'string') {
        return NextResponse.json({ success: false, error: 'fromPath, toPath는 문자열이어야 합니다.' }, { status: 400 })
      }

      // Extract slug and filenames
      const parsePath = (p: string) => {
        const parts = p.split('/') // e.g., originals/slug/filename
        if (parts.length < 3) return null
        const dir = parts[0]
        const slug = parts[1]
        const name = parts.slice(2).join('/')
        return { dir, slug, name }
      }

      const a = parsePath(fromPath)
      const b = parsePath(toPath)
      if (!a || !b) {
        return NextResponse.json({ success: false, error: '경로 형식이 올바르지 않습니다.' }, { status: 400 })
      }
      if (a.slug !== b.slug) {
        return NextResponse.json({ success: false, error: '서로 다른 폴더 간 교환은 허용되지 않습니다.' }, { status: 400 })
      }

      const normalizedSlug = normalizeSlug(a.slug)
      // Extract sabreId and seq from filenames
      const infoFrom = a.name.match(/_(\d+)_([0-9]{2})(?=\.|_\d+w\.)/)
      const infoTo = b.name.match(/_(\d+)_([0-9]{2})(?=\.|_\d+w\.)/)
      if (!infoFrom || !infoTo) {
        return NextResponse.json({ success: false, error: '파일명에서 sabre/seq를 추출할 수 없습니다.' }, { status: 400 })
      }
      const sabreFrom = infoFrom[1]
      const seqFrom = infoFrom[2]
      const sabreTo = infoTo[1]
      const seqTo = infoTo[2]
      if (sabreFrom !== sabreTo) {
        return NextResponse.json({ success: false, error: '서로 다른 sabre 그룹 간 교환은 허용되지 않습니다.' }, { status: 400 })
      }

      const originalsPrefix = `${DIR_ORIGINALS}/${normalizedSlug}`
      const publicPrefix = `${DIR_PUBLIC}/${normalizedSlug}`

      const [origRes, pubRes] = await Promise.all([
        supabase.storage.from(MEDIA_BUCKET).list(originalsPrefix, { limit: 1000 }),
        supabase.storage.from(MEDIA_BUCKET).list(publicPrefix, { limit: 1000 }),
      ])
      if (origRes.error) {
        return NextResponse.json({ success: false, error: '원본 파일 목록 조회 실패' }, { status: 500 })
      }
      if (pubRes.error) {
        return NextResponse.json({ success: false, error: '공개 파일 목록 조회 실패' }, { status: 500 })
      }

      type PlanItem = { from: string; toTmp?: string; to: string }
      const planMap = new Map<string, PlanItem>()
      const addPlan = (p: PlanItem) => {
        if (p.from === p.to) return
        if (p.toTmp && p.from === p.toTmp) return
        const key = `${p.from}::${p.toTmp || ''}::${p.to}`
        if (!planMap.has(key)) planMap.set(key, p)
      }

      // originals: swap ALL files that contain sabre + seq tokens
      const originals = origRes.data || []
      for (const f of originals) {
        const name = f.name
        if (!name.includes(`_${sabreFrom}_`)) continue
        if (name.includes(`_${seqFrom}.`)) {
          const fromPathFull = `${originalsPrefix}/${name}`
          const tmpTag = `__TMP_SWAP__${Date.now()}__`
          const toTmpFull = `${originalsPrefix}/${name.replace(`_${seqFrom}.`, `_${tmpTag}.`)}`
          const toFinalFull = `${originalsPrefix}/${name.replace(`_${seqFrom}.`, `_${seqTo}.`)}`
          addPlan({ from: fromPathFull, toTmp: toTmpFull, to: toFinalFull })
        } else if (name.includes(`_${seqTo}.`)) {
          const fromPathFull = `${originalsPrefix}/${name}`
          const toFinalFull = `${originalsPrefix}/${name.replace(`_${seqTo}.`, `_${seqFrom}.`)}`
          addPlan({ from: fromPathFull, to: toFinalFull })
        }
      }

      // public derivatives: swap all widths for the two seq tokens
      const publics = pubRes.data || []
      // 우선: 사용자가 지정한 정확한 두 public 파일을 스왑(폭 토큰이 없는 jpg 등 포함)
      const pubFromExact = `${publicPrefix}/${a.name}`
      const pubToExact = `${publicPrefix}/${b.name}`
      if (a.dir === DIR_PUBLIC && b.dir === DIR_PUBLIC) {
        const tmpTag = `__TMP_SWAP__${Date.now()}__`
        const pubTmp = pubFromExact.replace(`_${seqFrom}.`, `_${tmpTag}.`)
        addPlan({ from: pubFromExact, toTmp: pubTmp, to: pubFromExact.replace(`_${seqFrom}.`, `_${seqTo}.`) })
        addPlan({ from: pubToExact, to: pubToExact.replace(`_${seqTo}.`, `_${seqFrom}.`) })
      }
      for (const f of publics) {
        const name = f.name
        if (!name.includes(`_${sabreFrom}_`)) continue
        // examples: ..._01_1600w.avif 또는 ..._01.jpg
        if (name.includes(`_${seqFrom}_`) || name.includes(`_${seqFrom}.`)) {
          const fromPathFull = `${publicPrefix}/${name}`
          const tmpTag = `__TMP_SWAP__${Date.now()}__`
          const toTmpFull = `${publicPrefix}/${name
            .replace(`_${seqFrom}_`, `_${tmpTag}_`)
            .replace(`_${seqFrom}.`, `_${tmpTag}.`)}`
          const toFinalFull = `${publicPrefix}/${name
            .replace(`_${seqFrom}_`, `_${seqTo}_`)
            .replace(`_${seqFrom}.`, `_${seqTo}.`)}`
          addPlan({ from: fromPathFull, toTmp: toTmpFull, to: toFinalFull })
        } else if (name.includes(`_${seqTo}_`) || name.includes(`_${seqTo}.`)) {
          const fromPathFull = `${publicPrefix}/${name}`
          const toFinalFull = `${publicPrefix}/${name
            .replace(`_${seqTo}_`, `_${seqFrom}_`)
            .replace(`_${seqTo}.`, `_${seqFrom}.`)}`
          addPlan({ from: fromPathFull, to: toFinalFull })
        }
      }

      const plan = Array.from(planMap.values())
      // Execute plan
      for (const p of plan) {
        if (!p.toTmp) continue
        const r = await moveObject(p.from, p.toTmp)
        if (!r.ok) return NextResponse.json({ success: false, error: `임시 이동 실패: ${p.from} -> ${p.toTmp}: ${(r as any).error?.message || 'unknown'}` }, { status: 500 })
      }
      for (const p of plan) {
        if (p.toTmp) continue
        const r = await moveObject(p.from, p.to)
        if (!r.ok) return NextResponse.json({ success: false, error: `대상 이동 실패: ${p.from} -> ${p.to}: ${(r as any).error?.message || 'unknown'}` }, { status: 500 })
      }
      for (const p of plan) {
        if (!p.toTmp) continue
        const r = await moveObject(p.toTmp, p.to)
        if (!r.ok) return NextResponse.json({ success: false, error: `최종 이동 실패: ${p.toTmp} -> ${p.to}: ${(r as any).error?.message || 'unknown'}` }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: { changed: true, fromPath, toPath } })
    }

    // Legacy: seq-based swap (fallback)
    const { hotelSlug, sabreId, fromSeq, toSeq } = body as ReorderBySeqPayload
    if (!hotelSlug || !sabreId || !Number.isFinite(fromSeq) || !Number.isFinite(toSeq)) {
      return NextResponse.json({ success: false, error: '필수 필드가 없습니다. (fromPath/toPath 또는 slug/sabreId/fromSeq/toSeq)' }, { status: 400 })
    }
    if (fromSeq === toSeq) {
      return NextResponse.json({ success: true, data: { changed: false } })
    }

    const normalizedSlug = normalizeSlug(hotelSlug)
    const fromToken = pad2(fromSeq)
    const toToken = pad2(toSeq)

    // List originals and public files for the hotel
    const originalsPrefix = `${DIR_ORIGINALS}/${normalizedSlug}`
    const publicPrefix = `${DIR_PUBLIC}/${normalizedSlug}`

    const [{ data: originalsList, error: origErr }, { data: publicList, error: pubErr }] = await Promise.all([
      supabase.storage.from(MEDIA_BUCKET).list(originalsPrefix, { limit: 1000 }),
      supabase.storage.from(MEDIA_BUCKET).list(publicPrefix, { limit: 1000 }),
    ])
    if (origErr) {
      return NextResponse.json({ success: false, error: '원본 파일 목록 조회 실패' }, { status: 500 })
    }
    if (pubErr) {
      return NextResponse.json({ success: false, error: '공개 파일 목록 조회 실패' }, { status: 500 })
    }

    const originals = originalsList || []
    const publics = publicList || []

    // Utility: build rename plan swapping fromToken <-> toToken inside filenames that match slug_sabre_seq
    const swapInName = (name: string) => {
      const seqRe = new RegExp(`(^|_)${fromToken}(?=(_\\d+w)?\\.)`)
      const seqReB = new RegExp(`(^|_)${toToken}(?=(_\\d+w)?\\.)`)
      let tag = name
      const sabreGuard = `_${sabreId}_`
      if (!name.includes(sabreGuard)) return { affected: false as const, tmp: name, final: name }
      if (!(seqRe.test(name) || seqReB.test(name))) return { affected: false as const, tmp: name, final: name }
      tag = tag.replace(seqRe, `$1__TMP__`)
      tag = tag.replace(seqReB, `$1${fromToken}`)
      tag = tag.replace(/(^|_)__TMP__(?=(_\d+w)?\.)/, `$1${toToken}`)
      return { affected: true as const, tmp: name.replace(seqRe, `$1__TMP__`), final: tag }
    }

    type PlanItem = { from: string; toTmp?: string; to: string }
    const plan: PlanItem[] = []
    for (const f of originals) {
      const name = f.name
      const res = swapInName(name)
      if (!res.affected) continue
      const fromPath = `${originalsPrefix}/${name}`
      if (name.includes(fromToken)) {
        const toTmp = `${originalsPrefix}/${name.replace(new RegExp(`(^|_)${fromToken}(?=\.)`), `$1__TMP__`)}`
        const toFinal = `${originalsPrefix}/${res.final}`
        plan.push({ from: fromPath, toTmp, to: toFinal })
      } else if (name.includes(toToken)) {
        const toFinal = `${originalsPrefix}/${res.final}`
        plan.push({ from: fromPath, to: toFinal })
      }
    }
    for (const f of publics) {
      const name = f.name
      const res = swapInName(name)
      if (!res.affected) continue
      const fromPath = `${publicPrefix}/${name}`
      if (name.includes(fromToken)) {
        const toTmp = `${publicPrefix}/${name.replace(new RegExp(`(^|_)${fromToken}(?=_)`), `$1__TMP__`)}`
        const toFinal = `${publicPrefix}/${res.final}`
        plan.push({ from: fromPath, toTmp, to: toFinal })
      } else if (name.includes(toToken)) {
        const toFinal = `${publicPrefix}/${res.final}`
        plan.push({ from: fromPath, to: toFinal })
      }
    }

    // Execute moves: first all toTmp (for fromSeq items), then swap targets, then tmp->final
    // 1) move fromToken files to tmp
    for (const p of plan) {
      if (!p.toTmp) continue
      const r = await moveObject(p.from, p.toTmp)
      if (!r.ok) {
        return NextResponse.json({ success: false, error: '임시 이동 실패' }, { status: 500 })
      }
    }

    // 2) move toToken files directly to final (now free)
    for (const p of plan) {
      if (p.toTmp) continue
      const r = await moveObject(p.from, p.to)
      if (!r.ok) {
        return NextResponse.json({ success: false, error: '대상 이동 실패' }, { status: 500 })
      }
    }

    // 3) move tmp to final for former fromToken files
    for (const p of plan) {
      if (!p.toTmp) continue
      const r = await moveObject(p.toTmp, p.to)
      if (!r.ok) {
        return NextResponse.json({ success: false, error: '최종 이동 실패' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, data: { changed: true, fromSeq, toSeq } }, { status: 200 })
  } catch (error) {
    console.error('[hotel-images/reorder] error', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


