import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClientSaveButton } from '../_components/save-controls'
import { BasicBenefitsManager, type BenefitRow as BBRow } from '../_components/basic-benefits-manager'

interface PageProps {
  params: Promise<{ sabre_paragon: string }>
}

export default async function HotelEditPage({ params }: PageProps) {
  const { sabre_paragon } = await params
  const [sabreIdRaw, paragonIdRaw] = sabre_paragon.split('-')
  const sabreId = sabreIdRaw === 'null' ? null : sabreIdRaw
  const paragonId = paragonIdRaw === 'null' ? null : paragonIdRaw

  if (!sabreId && !paragonId) return notFound()

  const supabase = createServiceRoleClient()

  let query = supabase
    .from('select_hotels')
    .select('*')
    .limit(1)

  if (sabreId) query = query.eq('sabre_id', sabreId)
  if (!sabreId && paragonId) query = query.eq('paragon_id', paragonId)

  const { data, error } = await query.single()
  if (error || !data) return notFound()

  // Load Benefits via mapping (select_hotel_benefits_map → select_hotel_benefits)
  type MapRow = { benefit_id: string; sort: number | null }
  type BenefitRow = { benefit_id: string | number; benefit: string | null; benefit_description: string | null; start_date: string | null; end_date: string | null }
  let mappedBenefits: BenefitRow[] = []
  if (sabreId) {
    const { data: mapRows } = await supabase
      .from('select_hotel_benefits_map')
      .select('benefit_id, sort')
      .eq('sabre_id', sabreId)
      .order('sort', { ascending: true, nullsFirst: true })

    const ids = (mapRows as MapRow[] | null)?.map((r) => String(r.benefit_id)).filter(Boolean) ?? []
    if (ids.length > 0) {
      const { data: benefitRows } = await supabase
        .from('select_hotel_benefits')
        .select('benefit_id, benefit, benefit_description, start_date, end_date')
        .in('benefit_id', ids)
      mappedBenefits = (benefitRows as BenefitRow[] | null) ?? []
      // keep original order of ids
      const order = new Map(ids.map((id, i) => [id, i]))
      mappedBenefits.sort((a, b) => (order.get(String(a.benefit_id)) ?? 0) - (order.get(String(b.benefit_id)) ?? 0))
    }
  }

  // 최소 편집 폼 스텁: 이후 세부 필드 연결 예정
  return (
    <div className="min-h-[60vh]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">호텔 상세 편집</h1>
        <p className="text-sm text-muted-foreground mt-1">기본 정보 및 설정값을 수정하세요.</p>
      </div>

      <div className="mb-4 text-sm">
        <Link href="/admin/hotel-update" className="text-blue-600 hover:underline">← 목록으로 돌아가기</Link>
      </div>

      <form id="hotel-edit-form" action={async (formData) => {
        'use server'
        await saveAction(formData)
      }} className="space-y-4 rounded-lg border bg-white p-6">
        {/* hidden identifiers to use in server action */}
        <input type="hidden" name="sabre_id" value={data.sabre_id ?? ''} />
        <input type="hidden" name="paragon_id" value={data.paragon_id ?? ''} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sabre ID</label>
            <input name="sabre_id_editable" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.sabre_id ?? ''} data-initial={data.sabre_id ?? ''} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Paragon ID</label>
            <input name="paragon_id_editable" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.paragon_id ?? ''} data-initial={data.paragon_id ?? ''} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">호텔명(한글)</label>
            <input name="property_name_kor" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.property_name_kor ?? ''} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">호텔명(영문)</label>
            <input name="property_name_eng" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.property_name_eng ?? ''} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Rate Plan Codes (콤마 구분)</label>
          <input name="rate_plan_codes" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={(data.rate_plan_codes ?? []).join(', ')} />
        </div>

        {/* Benefits (mapped with client manager) */}
        <div>
          <div className="mb-2 text-sm font-medium">Benefits</div>
          <BasicBenefitsManager initial={mappedBenefits as BBRow[]} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <ClientSaveButton formId="hotel-edit-form" />
          <Link href="/admin/hotel-update" className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</Link>
        </div>
      </form>
    </div>
  )
}

// (moved to client file ../_components/benefit-picker-input.tsx)

async function saveAction(formData: FormData) {
  'use server'
  const sabreId = formData.get('sabre_id') as string | null
  const paragonId = formData.get('paragon_id') as string | null
  const sabreIdEditable = (formData.get('sabre_id_editable') as string | null)?.trim() || null
  const paragonIdEditable = (formData.get('paragon_id_editable') as string | null)?.trim() || null
  const property_name_kor = (formData.get('property_name_kor') as string | null) ?? null
  const property_name_eng = (formData.get('property_name_eng') as string | null) ?? null
  const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
  const ratePlanCodesParsed = ratePlanCodesRaw
    ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const rate_plan_codes = ratePlanCodesParsed.length > 0 ? ratePlanCodesParsed : null

  const supabase = createServiceRoleClient()
  // Collect mapped benefits from hidden fields
  const mappedIds = formData.getAll('mapped_benefit_id').map((v) => String(v))
  const mappedSortPairs: Array<{ id: string; sort: number }> = mappedIds.map((id, idx) => {
    const key = `mapped_sort__${id}`
    const raw = formData.get(key) as string | null
    const sort = raw != null ? Number(raw) : idx
    return { id, sort: Number.isFinite(sort) ? sort : idx }
  })
  // no-op: debug logs removed for clarity

  const updatePayload = { property_name_kor, property_name_eng, rate_plan_codes }
  // Build match condition by original identifiers
  let update = supabase.from('select_hotels').update({ ...updatePayload, sabre_id: sabreIdEditable, paragon_id: paragonIdEditable })
  if (sabreId) update = update.eq('sabre_id', sabreId)
  else if (paragonId) update = update.eq('paragon_id', paragonId)

  const { data: _xUpdatedRow, error: _xUpdateError } = await update
    .select('sabre_id, benefit, benefit_1, benefit_2, benefit_3, benefit_4, benefit_5, benefit_6')
    .single()
  // debug log removed
  // Replace mappings with robust handling
  const targetSabreId = sabreIdEditable || sabreId || null
  if (targetSabreId) {
    try {
      // If sabre id changed, clean up old mappings under original sabreId
      if (sabreId && sabreId !== targetSabreId) {
        const { error: delOldErr } = await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', sabreId)
        if (delOldErr) console.error('[benefits_map] delete old error:', delOldErr.message)
      }

      const uniqueIds = Array.from(new Set(mappedIds.map((v) => String(v))))

      const { error: delErr } = await supabase.from('select_hotel_benefits_map').delete().eq('sabre_id', targetSabreId)
      if (delErr) console.error('[benefits_map] delete target error:', delErr.message)

      if (uniqueIds.length > 0) {
        // Merge sort values
        const sortMap = new Map(mappedSortPairs.map((p) => [p.id, p.sort]))
        const rows = uniqueIds.map((id) => ({ sabre_id: targetSabreId, benefit_id: id, sort: sortMap.get(id) ?? 0 }))
        const { error: insErr } = await supabase.from('select_hotel_benefits_map').insert(rows)
        if (insErr) console.error('[benefits_map] insert error:', insErr.message)
      }
    } catch (e) {
      console.error('[benefits_map] unexpected error:', (e instanceof Error ? e.message : String(e)))
    }
  }
  return { ok: true, sabre_id: targetSabreId, paragon_id: paragonIdEditable || paragonId }
}

