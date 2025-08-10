import { createServiceRoleClient } from '@/lib/supabase/server'

type HotelRow = Record<string, unknown>

export async function getHotelBySabreOrParagon(params: { sabreId: string | null; paragonId: string | null }) {
  const { sabreId, paragonId } = params
  const supabase = createServiceRoleClient()
  let query = supabase.from('select_hotels').select('*').limit(1)
  if (sabreId) query = query.eq('sabre_id', sabreId)
  if (!sabreId && paragonId) query = query.eq('paragon_id', paragonId)
  const { data, error } = await query.single<HotelRow>()
  return { data, error }
}

export async function getMappedBenefitsBySabreId(sabreId: string) {
  const supabase = createServiceRoleClient()
  type MapRow = { benefit_id: string; sort: number | null }
  type BenefitRow = { benefit_id: string | number; benefit: string | null; benefit_description: string | null; start_date: string | null; end_date: string | null }

  const { data: mapRows } = await supabase
    .from('select_hotel_benefits_map')
    .select('benefit_id, sort')
    .eq('sabre_id', sabreId)
    .order('sort', { ascending: true, nullsFirst: true })

  const ids = (mapRows as MapRow[] | null)?.map((r) => String(r.benefit_id)).filter(Boolean) ?? []
  if (ids.length === 0) return [] as BenefitRow[]

  const { data: benefitRows } = await supabase
    .from('select_hotel_benefits')
    .select('benefit_id, benefit, benefit_description, start_date, end_date')
    .in('benefit_id', ids)

  const rows = (benefitRows as BenefitRow[] | null) ?? []
  const order = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a, b) => (order.get(String(a.benefit_id)) ?? 0) - (order.get(String(b.benefit_id)) ?? 0))
  return rows
}

export async function updateHotelRow(match: { sabreId: string | null; paragonId: string | null }, updates: Record<string, unknown>) {
  const supabase = createServiceRoleClient()
  let query = supabase.from('select_hotels').update(updates)
  if (match.sabreId) query = query.eq('sabre_id', match.sabreId)
  else if (match.paragonId) query = query.eq('paragon_id', match.paragonId)
  return query.select('sabre_id').single()
}

export async function replaceBenefitMappings(options: {
  originalSabreId: string | null
  targetSabreId: string
  mappedIds: string[]
  sortMap: Map<string, number>
}) {
  const { originalSabreId, targetSabreId, mappedIds, sortMap } = options
  const supabase = createServiceRoleClient()

  if (originalSabreId && originalSabreId !== targetSabreId) {
    await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', originalSabreId)
  }

  await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', targetSabreId)

  const uniqueIds = Array.from(new Set(mappedIds.map(String)))
  if (uniqueIds.length === 0) return
  const rows = uniqueIds.map((id) => ({ sabre_id: targetSabreId, benefit_id: id, sort: sortMap.get(id) ?? 0 }))
  await supabase.from('select_hotel_benefits_map').insert(rows)
}


