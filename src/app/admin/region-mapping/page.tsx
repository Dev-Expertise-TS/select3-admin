import { createServiceRoleClient } from '@/lib/supabase/server'
import { RegionsManager } from './_components/RegionsManager'

async function getInitialRegions() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('select_regions')
    .select('*')
    .order('id', { ascending: true })
    .limit(50)
  if (error) {
    console.error('[region-mapping] initial fetch error:', error)
    return []
  }
  return data || []
}

export default async function RegionMappingPage() {
  const initial = await getInitialRegions()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">지역 코드 맵핑 관리</h1>
          <p className="text-sm text-gray-600 mt-1">지역/도시/국가/대륙 코드를 조회하고 관리합니다.</p>
        </div>
      </div>

      <RegionsManager initialItems={initial} />
    </div>
  )
}


