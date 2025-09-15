import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { 
  getAllowedRatePlanCodes, 
  validateAndNormalizeRatePlanCodes, 
  removeInvalidCode, 
  getFirstValidCode 
} from '@/lib/rate-plan-validator';
import { isSupabaseError, isJsonParseError } from '@/lib/type-guards';

// 요청 타입 정의
interface UpdateRatePlanCodesRequest {
  sabre_id: string;
  paragon_id: string;
  rate_plan_code: string[];
}

export async function PATCH(request: NextRequest) {
  try {
    // 요청 Body 파싱 및 검증
    const body: UpdateRatePlanCodesRequest = await request.json();
    console.log('[update-rate-plan-codes] request body:', body)
    
    if (!body.sabre_id && !body.paragon_id) {
      return NextResponse.json(
        { success: false, error: 'sabre_id or paragon_id is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(body.rate_plan_code)) {
      return NextResponse.json(
        { success: false, error: 'rate_plan_code must be an array' },
        { status: 400 }
      )
    }

    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 허용 가능한 Rate Plan 코드 조회
    const allowedCodes = await getAllowedRatePlanCodes()
    
    // 입력 검증 및 정규화
    const validationResult = validateAndNormalizeRatePlanCodes(body.rate_plan_code || [], allowedCodes)
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid rate plan codes', details: validationResult.errors },
        { status: 400 }
      )
    }
    
    const { cleanedCodes, normalizedCodes } = validationResult
    console.log('[update-rate-plan-codes] allowed:', allowedCodes)
    console.log('[update-rate-plan-codes] cleanedCodes:', cleanedCodes)
    console.log('[update-rate-plan-codes] normalizedCodes (string):', normalizedCodes)

    // 호텔 레코드 찾기 및 업데이트 (sabre_id 또는 paragon_id로 검색) - 22P02 시 재시도하며 잘못된 enum 제거
    const tryUpdate = async (codes: string | null) => {
      let q = supabase.from('select_hotels').update({ rate_plan_code: codes })
      q = body.sabre_id ? q.eq('sabre_id', body.sabre_id) : q.eq('paragon_id', body.paragon_id)
      return q.select('sabre_id, paragon_id, property_name_ko, property_name_en, rate_plan_code').single()
    }

    let workingCodes: string | null = normalizedCodes
    type HotelRow = {
      sabre_id: string | null
      paragon_id: string | null
      property_name_ko: string | null
      property_name_en: string | null
      rate_plan_code: string | null
    }
    let data: HotelRow | null = null
    let usedSingleFallback = false
    for (let i = 0; i < 10; i += 1) {
      const { data: d, error } = await tryUpdate(workingCodes)
      if (!error) { data = d; break }
      
      const code = isSupabaseError(error) ? error.code : undefined
      const msg = isSupabaseError(error) ? error.message || '' : String(error)
      console.error('[update-rate-plan-codes] update error:', { code, msg, workingCodes })
      if (code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Hotel not found' },
          { status: 404 }
        )
      }
      if (code === '22P02') {
        // invalid input value for enum rate_plan_code: "XYZ"
        const m = msg.match(/enum\s+[^:]+:\s+"([^"]+)"/i)
        const bad = m?.[1]
        if (bad && workingCodes) {
          // 잘못된 코드 제거
          workingCodes = removeInvalidCode(workingCodes, bad, allowedCodes)
          continue
        }
        // 파싱 실패 시 모든 비허용값 제거 후 한번 더 시도
        if (workingCodes) {
          const codesArray = workingCodes.split(',').filter((c) => allowedCodes.includes(c.trim()))
          workingCodes = codesArray.length > 0 ? codesArray.join(',') : null
          // 만약 컬럼이 enum (단일) 타입일 수 있으므로, 단일 값으로 저장 시도
          if (workingCodes && !usedSingleFallback) {
            usedSingleFallback = true
            const first = getFirstValidCode(workingCodes)
            if (first) {
              // 일부 스키마에서 enum 단일 컬럼일 수 있어 타입을 좁혀 단일 값 시도
              const { data: d2, error: e2 } = await supabase
                .from('select_hotels')
                .update({ rate_plan_code: first as unknown as string })
                [body.sabre_id ? 'eq' : 'eq' as const](body.sabre_id ? 'sabre_id' : 'paragon_id', body.sabre_id ? body.sabre_id : body.paragon_id)
                .select('sabre_id, paragon_id, property_name_ko, property_name_en, rate_plan_code')
                .single()
              if (!e2) { data = d2; break }
            }
          }
          continue
        }
      }
      console.error('Supabase update error:', error)
      return NextResponse.json(
        { success: false, error: 'Database update failed', code, details: msg },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Database update failed (no data)' },
        { status: 500 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      { success: true, data, count: 1 },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    )

  } catch (error) {
    console.error('API route error:', error);
    
    // JSON 파싱 오류 등 처리
    if (isJsonParseError(error)) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    // 기타 예상치 못한 오류
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
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