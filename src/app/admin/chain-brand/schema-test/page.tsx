import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function SchemaTestPage() {
  const supabase = createServiceRoleClient()
  
  let chainsSchema: string[] | null = null
  let brandsSchema: string[] | null = null
  let chainsSample: Record<string, unknown> | null = null
  let brandsSample: Record<string, unknown> | null = null
  let error: string | null = null

  try {
    // hotel_chains 테이블 스키마 확인
    const { data: chainsData, error: chainsError } = await supabase
      .from('hotel_chains')
      .select('*')
      .limit(1)
    
    if (chainsError) {
      error = `hotel_chains 오류: ${chainsError.message}`
    } else {
      chainsSample = chainsData?.[0] || null
      chainsSchema = chainsSample ? Object.keys(chainsSample) : []
    }

    // hotel_brands 테이블 스키마 확인
    const { data: brandsData, error: brandsError } = await supabase
      .from('hotel_brands')
      .select('*')
      .limit(1)
    
    if (brandsError) {
      error = error ? `${error}, hotel_brands 오류: ${brandsError.message}` : `hotel_brands 오류: ${brandsError.message}`
    } else {
      brandsSample = brandsData?.[0] || null
      brandsSchema = brandsSample ? Object.keys(brandsSample) : []
    }

  } catch (e) {
    error = `예상치 못한 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          {/* Network icon removed as per new_code */}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">테이블 스키마 테스트</h1>
          <p className="text-sm text-gray-600 mt-1">hotel_chains와 hotel_brands 테이블의 실제 구조를 확인합니다.</p>
        </div>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-medium text-red-800 mb-2">오류 발생</h3>
          <p className="text-red-700">{error}</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* hotel_chains 테이블 정보 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">hotel_chains 테이블</h3>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium">컬럼 수:</span> {chainsSchema?.length || 0}개
              </div>
              
              <div>
                <span className="font-medium">컬럼 목록:</span>
                <div className="mt-2 space-y-1">
                  {chainsSchema?.map((column, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{column}</span>
                      <span className="text-gray-500">
                        ({typeof chainsSample?.[column] === 'object' ? 'object' : typeof chainsSample?.[column]})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {chainsSample && (
                <div>
                  <span className="font-medium">샘플 데이터:</span>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(chainsSample, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* hotel_brands 테이블 정보 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">hotel_brands 테이블</h3>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium">컬럼 수:</span> {brandsSchema?.length || 0}개
              </div>
              
              <div>
                <span className="font-medium">컬럼 목록:</span>
                <div className="mt-2 space-y-1">
                  {brandsSchema?.map((column, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{column}</span>
                      <span className="text-gray-500">
                        ({typeof brandsSample?.[column] === 'object' ? 'object' : typeof brandsSample?.[column]})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {brandsSample && (
                <div>
                  <span className="font-medium">샘플 데이터:</span>
                  <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-auto">
                    {JSON.stringify(brandsSample, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 컬럼 매핑 가이드 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-3">컬럼 매핑 가이드</h3>
        <div className="space-y-2 text-sm text-yellow-800">
          <p>• <strong>ID 컬럼:</strong> chain_id, brand_id, id, chainId, brandId 등</p>
          <p>• <strong>한글 이름 컬럼:</strong> name_kr, name_kr, chain_name_kr, brand_name_kr, name_ko, name_ko 등</p>
          <p>• <strong>영문 이름 컬럼:</strong> name_en, name_en, chain_name_en, brand_name_en 등</p>
          <p>• <strong>관계 컬럼:</strong> chain_id, brand_id, parent_id 등</p>
        </div>
      </div>

      {/* 문제 해결 가이드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-3">문제 해결 가이드</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• 테이블이 존재하지 않는 경우: Supabase SQL Editor에서 테이블을 생성하세요</p>
          <p>• 컬럼명이 다른 경우: 위의 컬럼 매핑 가이드를 참고하여 코드를 수정하세요</p>
          <p>• 권한 오류: RLS 정책과 Service Role Key를 확인하세요</p>
          <p>• 환경 변수: <code>.env.local</code> 파일에 Supabase 설정을 추가하세요</p>
        </div>
      </div>
    </div>
  )
}
