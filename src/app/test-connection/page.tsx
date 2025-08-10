import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { GitBranch } from 'lucide-react'

export default async function TestConnectionPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  try {
    // 기본 연결 테스트 - 단순히 환경 변수 확인 및 클라이언트 생성 테스트
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
    }

    // 더미 쿼리로 연결 테스트 (존재하지 않는 테이블에 접근해서 특정 에러 확인)
    const { error } = await supabase
      .from('_connection_test')
      .select('*')
      .limit(1)
    
    // 예상되는 에러: "relation \"public._connection_test\" does not exist"
    // 이 에러가 나오면 연결은 성공한 것
    const isConnected = error && error.message.includes('does not exist')
    
    if (error && !isConnected) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2">
              <GitBranch className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">연결 테스트</h1>
              <p className="text-sm text-gray-600 mt-1">Supabase 데이터베이스 연결 상태를 확인합니다</p>
            </div>
          </div>
          <div className="p-8 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Connection Error:</strong> {error.message}
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">체크리스트:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>환경 변수가 올바르게 설정되었는지 확인</li>
              <li>Supabase 프로젝트가 활성 상태인지 확인</li>
              <li>API 키가 만료되지 않았는지 확인</li>
            </ul>
          </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <GitBranch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">연결 테스트</h1>
            <p className="text-sm text-gray-600 mt-1">Supabase 데이터베이스 연결 상태를 확인합니다</p>
          </div>
        </div>
        <div className="p-8 bg-white rounded-lg border border-gray-200">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <strong>✅ 연결 성공!</strong> Supabase와 정상적으로 연결되었습니다.
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold mb-2">환경 정보:</h3>
            <ul className="text-sm space-y-1">
              <li><strong>프로젝트 URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</li>
              <li><strong>환경:</strong> {process.env.NODE_ENV}</li>
              <li><strong>Service Role Key:</strong> {process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '설정 안됨'}</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-semibold mb-2">다음 단계:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Supabase Dashboard에서 테이블 생성</li>
              <li>Row Level Security 정책 설정</li>
              <li>실제 데이터로 CRUD 테스트</li>
              <li>/todos 페이지는 테이블 생성 후 테스트</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    )
  } catch (err) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <GitBranch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">연결 테스트</h1>
            <p className="text-sm text-gray-600 mt-1">Supabase 데이터베이스 연결 상태를 확인합니다</p>
          </div>
        </div>
        <div className="p-8 bg-white rounded-lg border border-gray-200">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>오류:</strong> {err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'}
        </div>
        </div>
      </div>
    )
  }
}