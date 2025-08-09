import { createServiceRoleClient } from '@/lib/supabase/server'
import { Pagination } from '@/components/shared/pagination'
import { Building2 } from 'lucide-react'
import { SearchForm } from './_components/search-form'
import Link from 'next/link'

interface HotelRow {
  sabre_id: string | null
  paragon_id: string | null
  property_name_kor: string | null
  property_name_eng: string | null
  rate_plan_codes: string[] | null
}

const DEFAULT_PAGE_SIZE = 20

export default async function AdminHotelUpdatePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = createServiceRoleClient()

  const params = (await searchParams) ?? {}
  const page = Math.max(1, Number(params.page ?? 1))
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize ?? DEFAULT_PAGE_SIZE)))
  const q = (params.q as string | undefined)?.trim()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('select_hotels')
    .select('sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes', { count: 'exact' })

  if (q) {
    if (/^\d+$/.test(q)) {
      query = query.or(`property_name_kor.ilike.%${q}%,property_name_eng.ilike.%${q}%,sabre_id.eq.${q}`)
    } else {
      query = query.or(`property_name_kor.ilike.%${q}%,property_name_eng.ilike.%${q}%`)
    }
  }

  const { data, error, count } = await query
    .order('property_name_kor', { ascending: true })
    .range(from, to)

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 정보 업데이트</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 목록을 불러오는 중 오류가 발생했습니다.</p>
          </div>
        </div>
        <div className="rounded-lg border bg-red-50 p-4 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  const rows: HotelRow[] = data ?? []
  const total = count ?? 0

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 정보 업데이트</h1>
          <p className="text-sm text-gray-600 mt-1">호텔의 기본 정보와 설정 값을 업데이트합니다.</p>
        </div>
      </div>

      {/* 검색 폼 */}
      <SearchForm initialQ={q ?? ''} />

      <div className="rounded-lg border bg-white">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">호텔 목록</h2>
            <p className="text-xs text-muted-foreground mt-1">총 {total.toLocaleString()}개</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sabre ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hotel Chain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">호텔명(한글)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">호텔명(영문)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Plan Codes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((h, idx) => {
                const key = `${h.sabre_id ?? 'null'}-${h.paragon_id ?? 'null'}`
                const href = `/admin/hotel-update/${key}`
                return (
                <tr key={`${h.sabre_id}-${h.paragon_id}-${idx}`} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-700">
                    <Link href={href} className="hover:underline">{h.sabre_id ?? '—'}</Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">—</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <Link href={href} className="hover:underline">
                      {h.property_name_kor ?? <span className="text-gray-400 italic">한글명 없음</span>}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <Link href={href} className="hover:underline">
                      {h.property_name_eng ?? <span className="text-gray-400 italic">영문명 없음</span>}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {h.rate_plan_codes && h.rate_plan_codes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {h.rate_plan_codes.map((code, i) => (
                          <Link href={href} key={`${code}-${i}`} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:underline">
                            {code}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link href={href} className="text-gray-400 italic hover:underline">N/A</Link>
                    )}
                  </td>
                </tr>
              )})}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t">
          <Pagination currentPage={page} totalItems={total} pageSize={pageSize} />
        </div>
      </div>
    </div>
  )
}

