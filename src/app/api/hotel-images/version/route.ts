import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * select_hotel_media_version 테이블 존재 여부 확인
 */
async function checkTableExists(supabase: ReturnType<typeof createServiceRoleClient>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('select_hotel_media_version')
      .select('version')
      .limit(1)
    // 테이블이 없으면 42P01 에러 코드
    return error?.code !== '42P01'
  } catch {
    return false
  }
}

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
    
    // 테이블 존재 여부 확인
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      // 테이블이 없으면 기본값 1 반환
      console.log('[version] 테이블이 존재하지 않음, 기본값 반환')
      return NextResponse.json({ success: true, data: { version: 1 } })
    }
    
    // 테이블: select_hotel_media_version(slug text pk, sabre_id text, version int)
    const base = supabase.from('select_hotel_media_version').select('slug, sabre_id, version').limit(1)
    const { data, error } = slug
      ? await base.eq('slug', slug)
      : await base.eq('sabre_id', String(sabreId))
    
    // 에러가 있어도 테이블이 존재하는 경우만 로깅 (42P01은 이미 체크했으므로 다른 에러일 수 있음)
    if (error && error.code !== '42P01') {
      console.error('[version] select error:', error)
    }
    
    const row = data?.[0]
    return NextResponse.json({ success: true, data: { version: row?.version ?? 1 } })
  } catch (e) {
    console.error('[version] GET error:', e)
    // 에러 발생 시 기본값 반환 (테이블이 없어도 작동하도록)
    return NextResponse.json({ success: true, data: { version: 1 } })
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

    // 테이블 존재 여부 확인
    const tableExists = await checkTableExists(supabase)
    if (!tableExists) {
      // 테이블이 없으면 기본값 반환 (버전은 증가하지 않지만 작동은 함)
      console.log('[version] 테이블이 존재하지 않음, 기본값 반환')
      return NextResponse.json({ success: true, data: { version: 1 } })
    }

    const matchFilter = body.slug ? { slug: body.slug } : { sabre_id: String(body.sabreId) }
    const { data: existing, error: selErr } = await supabase
      .from('select_hotel_media_version')
      .select('slug, sabre_id, version')
      .maybeSingle()
      .match(matchFilter)
    
    if (selErr && selErr.code !== '42P01') {
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
      // 테이블이 없는 경우는 무시
      if (upsertErr.code === '42P01') {
        console.log('[version] 테이블이 존재하지 않음, 기본값 반환')
        return NextResponse.json({ success: true, data: { version: 1 } })
      }
      console.error('[version] upsert error:', upsertErr)
      return NextResponse.json({ success: false, error: '버전 갱신 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { version: nextVersion } })
  } catch (e) {
    console.error('[version] POST error:', e)
    // 에러 발생 시 기본값 반환 (테이블이 없어도 작동하도록)
    return NextResponse.json({ success: true, data: { version: 1 } })
  }
}


