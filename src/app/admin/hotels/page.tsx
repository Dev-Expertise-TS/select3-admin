import { Database } from 'lucide-react'
import { HotelsTable } from './_components/HotelsTable'

export default function HotelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Database className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            전체 호텔 보기
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            select_hotels 테이블의 모든 호텔 데이터를 조회하고 필터링할 수 있습니다.
          </p>
        </div>
      </div>

      <HotelsTable />
    </div>
  )
}

