import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/types/hotel';

// 요청 타입 정의
interface UpdateRatePlanCodesRequest {
  sabre_id: string;
  paragon_id: string;
  rate_plan_codes: string[];
}

export async function PATCH(request: NextRequest) {
  try {
    // 요청 Body 파싱 및 검증
    const body: UpdateRatePlanCodesRequest = await request.json();
    console.log('[update-rate-plan-codes] request body:', body)
    
    if (!body.sabre_id && !body.paragon_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'sabre_id or paragon_id is required' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    }

    if (!Array.isArray(body.rate_plan_codes)) {
      return new Response(
        JSON.stringify({ success: false, error: 'rate_plan_codes must be an array' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    }

    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 허용 가능한 코드 집합 로드 (enum → 실패시 폴백)
    const fallbackValues = ['API','ZP3','VMC','TLC','H01','S72','XLO','PPR','FAN','WMP','HPM','TID','STP']
    let allowed: string[] = fallbackValues
    try {
      const { data: typeData } = await supabase
        .from('pg_type')
        .select('oid')
        .eq('typname', 'rate_plan_code')
        .single()
      if (typeData?.oid) {
        const { data: enumData } = await supabase
          .from('pg_enum')
          .select('enumlabel')
          .eq('enumtypid', typeData.oid)
          .order('enumsortorder', { ascending: true })
        const enumValues = (enumData?.map((r: { enumlabel: string }) => r.enumlabel) || []).filter(Boolean)
        if (enumValues.length > 0) allowed = enumValues
      }
    } catch {
      // ignore → fallback 사용
    }

    // 입력 정규화: 공백 제거, 빈 값 제거, 허용 목록 필터, 빈 배열 → null
    const cleanedCodes = (body.rate_plan_codes || [])
      .map((c) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
      .filter((c) => c.length > 0 && allowed.includes(c))
    const normalizedCodes = cleanedCodes.length > 0 ? cleanedCodes : null
    console.log('[update-rate-plan-codes] allowed:', allowed)
    console.log('[update-rate-plan-codes] normalizedCodes:', normalizedCodes)

    // 호텔 레코드 찾기 및 업데이트 (sabre_id 또는 paragon_id로 검색) - 22P02 시 재시도하며 잘못된 enum 제거
    const tryUpdate = async (codes: string[] | null) => {
      let q = supabase.from('select_hotels').update({ rate_plan_codes: codes })
      q = body.sabre_id ? q.eq('sabre_id', body.sabre_id) : q.eq('paragon_id', body.paragon_id)
      return q.select('sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes').single()
    }

    let workingCodes: string[] | null = normalizedCodes
    let data: any = null
    let usedSingleFallback = false
    for (let i = 0; i < 10; i += 1) {
      const { data: d, error } = await tryUpdate(workingCodes)
      if (!error) { data = d; break }
      const code = (error as { code?: string }).code
      const msg = String((error as { message?: string }).message || '')
      console.error('[update-rate-plan-codes] update error:', { code, msg, workingCodes })
      if (code === 'PGRST116') {
        return new Response(
          JSON.stringify({ success: false, error: 'Hotel not found' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        )
      }
      if (code === '22P02') {
        // invalid input value for enum rate_plan_code: "XYZ"
        const m = msg.match(/enum\s+[^:]+:\s+"([^"]+)"/i)
        const bad = m?.[1]
        if (bad && Array.isArray(workingCodes)) {
          workingCodes = workingCodes.filter((c) => c !== bad)
          if (workingCodes.length === 0) workingCodes = null
          continue
        }
        // 파싱 실패 시 모든 비허용값 제거 후 한번 더 시도
        if (Array.isArray(workingCodes)) {
          workingCodes = workingCodes.filter((c) => allowed.includes(c))
          if (workingCodes.length === 0) workingCodes = null
          // 만약 컬럼이 enum (단일) 타입일 수 있으므로, 단일 값으로 저장 시도
          if (workingCodes && workingCodes.length > 0 && !usedSingleFallback) {
            usedSingleFallback = true
            const first = workingCodes[0]
            const { data: d2, error: e2 } = await tryUpdate(first as unknown as any)
            if (!e2) { data = d2; break }
          }
          continue
        }
      }
      console.error('Supabase update error:', error)
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed', code, details: msg }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      )
    }

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database update failed (no data)' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      )
    }

    // 성공 응답
    return new Response(
      JSON.stringify({ success: true, data, count: 1 }),
      { status: 200, headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }}
    )

  } catch (error) {
    console.error('API route error:', error);
    
    // JSON 파싱 오류 등 처리
    if (error instanceof SyntaxError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON format' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    }

    // 기타 예상치 못한 오류
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }
}

// OPTIONS 메소드 처리 (CORS preflight)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}