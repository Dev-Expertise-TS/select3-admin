import { createServiceRoleClient } from '@/lib/supabase/server'

export const revalidate = 60

export default async function Home() {
  const supabase = createServiceRoleClient()
  const { count, error } = await supabase
    .from('select_hotels')
    .select('sabre_id', { count: 'exact', head: true })

  const total = typeof count === 'number' ? count : 0

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">대시보드</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">전체 호텔 개수</div>
          <div className="mt-2 text-3xl font-bold">{error ? '—' : total}</div>
        </div>
      </div>
    </div>
  )
}
