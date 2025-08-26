import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // 환경 변수 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[chain-brand-schema] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { success: false, error: 'Supabase Service Role Key가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const supabase = createServiceRoleClient()

    // 테이블 존재 여부 및 컬럼 정보 확인
    try {
      // hotel_chains 테이블 스키마 확인
      const { data: chainsSchema, error: chainsSchemaError } = await supabase
        .from('hotel_chains')
        .select('*')
        .limit(0)
      
      if (chainsSchemaError) {
        console.error('[chain-brand-schema] hotel_chains schema error:', chainsSchemaError)
        return NextResponse.json({
          success: false,
          error: `hotel_chains 테이블 스키마 오류: ${chainsSchemaError.message}`,
          tableExists: false
        }, { status: 500 })
      }

      // hotel_brands 테이블 스키마 확인
      const { data: brandsSchema, error: brandsSchemaError } = await supabase
        .from('hotel_brands')
        .select('*')
        .limit(0)
      
      if (brandsSchemaError) {
        console.error('[chain-brand-schema] hotel_brands schema error:', brandsSchemaError)
        return NextResponse.json({
          success: false,
          error: `hotel_brands 테이블 스키마 오류: ${brandsSchemaError.message}`,
          tableExists: false
        }, { status: 500 })
      }

      // 실제 데이터 샘플 조회
      const { data: chainsSample, error: chainsError } = await supabase
        .from('hotel_chains')
        .select('*')
        .limit(1)
      
      const { data: brandsSample, error: brandsError } = await supabase
        .from('hotel_brands')
        .select('*')
        .limit(1)

      // 컬럼 정보 추출 (샘플 데이터가 있는 경우)
      const chainsColumns = chainsSample && chainsSample.length > 0 ? Object.keys(chainsSample[0]) : []
      const brandsColumns = brandsSample && brandsSample.length > 0 ? Object.keys(brandsSample[0]) : []

      return NextResponse.json({
        success: true,
        data: {
          hotel_chains: {
            exists: true,
            columns: chainsColumns,
            sample: chainsSample?.[0] || null,
            error: chainsError?.message || null
          },
          hotel_brands: {
            exists: true,
            columns: brandsColumns,
            sample: brandsSample?.[0] || null,
            error: brandsError?.message || null
          }
        }
      })

    } catch (error) {
      console.error('[chain-brand-schema] table access error:', error)
      return NextResponse.json({
        success: false,
        error: `테이블 접근 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        tableExists: false
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[chain-brand-schema] error:', error)
    return NextResponse.json(
      { success: false, error: '스키마 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
