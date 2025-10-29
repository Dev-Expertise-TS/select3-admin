import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET: 버전 조회 (slug 또는 sabreId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')
    const sabreId = searchParams.get('sabreId')
    if (!slug && !sabreId) {
      return NextResponse.json({ success: false, error: 'slug 또는 sabreId 필요' }, { status: 400 })
    }
    const supabase = createServiceRoleClient()
    // 테이블: select_hotel_media_version(slug text pk, sabre_id text, version int)
    const base = supabase.from('select_hotel_media_version').select('slug, sabre_id, version').limit(1)
    const { data, error } = slug
      ? await base.eq('slug', slug)
      : await base.eq('sabre_id', String(sabreId))
    if (error) {
      console.error('[version] select error:', error)
      return NextResponse.json({ success: false, error: '버전 조회 실패' }, { status: 500 })
    }
    const row = data?.[0]
    return NextResponse.json({ success: true, data: { version: row?.version ?? 1 } })
  } catch (e) {
    console.error('[version] GET error:', e)
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 })
  }
}

// POST: 버전 증가 (slug 또는 sabreId)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { slug?: string; sabreId?: string } | null
    if (!body || (!body.slug && !body.sabreId)) {
      return NextResponse.json({ success: false, error: 'slug 또는 sabreId 필요' }, { status: 400 })
    }
    const supabase = createServiceRoleClient()

    const matchFilter = body.slug ? { slug: body.slug } : { sabre_id: String(body.sabreId) }
    const { data: existing, error: selErr } = await supabase
      .from('select_hotel_media_version')
      .select('slug, sabre_id, version')
      .maybeSingle()
      .match(matchFilter)
    if (selErr) {
      console.error('[version] select error:', selErr)
    }

    const row = existing ?? { slug: body.slug ?? '', sabre_id: String(body.sabreId ?? ''), version: 1 }
    const nextVersion = (row.version ?? 1) + 1

    const { error: upsertErr } = await supabase
      .from('select_hotel_media_version')
      .upsert({
        slug: row.slug,
        sabre_id: row.sabre_id,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' })
    if (upsertErr) {
      console.error('[version] upsert error:', upsertErr)
      return NextResponse.json({ success: false, error: '버전 갱신 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { version: nextVersion } })
  } catch (e) {
    console.error('[version] POST error:', e)
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 })
  }
}


