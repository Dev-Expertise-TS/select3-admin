import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// 테이블 존재 여부 캐시 (서버 재시작 전까지 유지)
let tableExistsCache: boolean | null = null
let tableCheckWarningShown = false

/**
 * select_hotel_media_version 테이블 존재 여부 확인
 */
async function checkTableExists(supabase: ReturnType<typeof createServiceRoleClient>): Promise<boolean> {
  // 캐시된 결과가 있으면 반환
  if (tableExistsCache !== null) {
    return tableExistsCache
  }

  try {
    const { error } = await supabase
      .from('select_hotel_media_version')
      .select('version')
      .limit(1)
    
    const exists = error?.code !== '42P01'
    
    // 테이블이 없고 아직 경고를 표시하지 않았으면 한 번만 경고
    if (!exists && !tableCheckWarningShown) {
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.warn('⚠️  select_hotel_media_version 테이블이 존재하지 않습니다.')
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.warn('')
      console.warn('📋 다음 SQL을 Supabase Dashboard에서 실행해주세요:')
      console.warn('')
      console.warn('   migrations/create_hotel_media_version_table.sql')
      console.warn('')
      console.warn('또는 다음 명령을 SQL Editor에서 실행:')
      console.warn('')
      console.warn(`CREATE TABLE IF NOT EXISTS select_hotel_media_version (
  slug TEXT PRIMARY KEY,
  sabre_id TEXT NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_select_hotel_media_version_sabre_id 
ON select_hotel_media_version(sabre_id);`)
      console.warn('')
      console.warn('💡 테이블이 없어도 기본값으로 작동합니다 (버전 관리 기능만 비활성화됨)')
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      tableCheckWarningShown = true
    }
    
    // 결과 캐싱 (서버 재시작 전까지 반복 체크 방지)
    tableExistsCache = exists
    return exists
  } catch {
    tableExistsCache = false
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
      // 테이블이 없지만 기본값으로 작동
      return NextResponse.json({ 
        success: true, 
        data: { version: 1 }
      })
    }
    
    // 테이블: select_hotel_media_version(slug text pk, sabre_id text, version int)
    const base = supabase.from('select_hotel_media_version').select('slug, sabre_id, version').limit(1)
    const { data, error } = slug
      ? await base.eq('slug', slug)
      : await base.eq('sabre_id', String(sabreId))
    
    if (error && error.code !== '42P01') {
      console.error('[version] select error:', error)
    }
    
    const row = data?.[0]
    return NextResponse.json({ success: true, data: { version: row?.version ?? 1 } })
  } catch (e) {
    console.error('[version] GET error:', e)
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
      // 테이블이 없지만 기본값으로 작동 (버전은 증가하지 않음)
      return NextResponse.json({ 
        success: true, 
        data: { version: 1 }
      })
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
      if (upsertErr.code === '42P01') {
        return NextResponse.json({ 
          success: true, 
          data: { version: 1 }
        })
      }
      console.error('[version] upsert error:', upsertErr)
      return NextResponse.json({ success: false, error: '버전 갱신 실패' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { version: nextVersion } })
  } catch (e) {
    console.error('[version] POST error:', e)
    return NextResponse.json({ success: true, data: { version: 1 } })
  }
}


