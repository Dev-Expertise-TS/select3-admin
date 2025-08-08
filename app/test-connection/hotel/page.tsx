import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export default async function HotelTestPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    // hotel 테이블에서 첫 번째 레코드 하나만 가져오기
    const { data: hotels, error } = await supabase
      .from('hotel')
      .select('*')
      .limit(1)

    if (error) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">🏨 Hotel 테이블 테스트</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>테이블 접근 오류:</strong> {error.message}
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">가능한 원인:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>&lsquo;hotel&rsquo; 테이블이 존재하지 않음</li>
              <li>Row Level Security 정책으로 인한 접근 제한</li>
              <li>테이블 권한 설정 문제</li>
              <li>환경 변수 설정 오류</li>
            </ul>
          </div>
        </div>
      )
    }

    // 데이터가 없는 경우
    if (!hotels || hotels.length === 0) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold mb-4">🏨 Hotel 테이블 테스트</h1>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong>✅ 테이블 접근 성공!</strong> 하지만 데이터가 없습니다.
          </div>
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">상태:</h3>
            <ul className="text-sm space-y-1">
              <li>• hotel 테이블이 존재함</li>
              <li>• 테이블에 데이터가 없음</li>
              <li>• 연결 및 권한은 정상</li>
            </ul>
          </div>
        </div>
      )
    }

    // 성공적으로 데이터를 가져온 경우
    const firstHotel = hotels[0]

    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🏨 Hotel 테이블 테스트</h1>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <strong>✅ 성공!</strong> hotel 테이블에서 첫 번째 레코드를 가져왔습니다.
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">첫 번째 Hotel 레코드 (JSON)</h2>
          <pre className="bg-gray-50 border rounded p-4 overflow-x-auto text-sm">
            <code>{JSON.stringify(firstHotel, null, 2)}</code>
          </pre>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded">
          <h3 className="font-semibold mb-2">테스트 결과:</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>테이블:</strong> hotel</li>
            <li>• <strong>레코드 수:</strong> {hotels.length}</li>
            <li>• <strong>데이터 형식:</strong> JSON</li>
            <li>• <strong>연결 상태:</strong> 정상</li>
          </ul>
        </div>
      </div>
    )

  } catch (err) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">❌ Hotel 테이블 테스트 실패</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>예외 오류:</strong> {err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'}
        </div>
      </div>
    )
  }
}