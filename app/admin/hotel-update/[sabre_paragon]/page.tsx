import { notFound, redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  // Load benefits master list
  const { data: benefitsData } = await supabase
    .from('benefits')
    .select('id, name')
    .order('name', { ascending: true })

  // Load current hotel's benefit links
  let hb = supabase.from('hotel_benefits').select('benefit_id')
  if (sabreId) hb = hb.eq('sabre_id', sabreId)
  else if (paragonId) hb = hb.eq('paragon_id', paragonId)
  const { data: selectedBenefitRows } = await hb
  const selectedBenefitIds = new Set<string>((selectedBenefitRows ?? []).map((r: any) => String(r.benefit_id)))

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

      <form className="space-y-4 rounded-lg border bg-white p-6">
        {/* hidden identifiers to use in server action */}
        <input type="hidden" name="sabre_id" value={data.sabre_id ?? ''} />
        <input type="hidden" name="paragon_id" value={data.paragon_id ?? ''} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sabre ID</label>
            <input className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.sabre_id ?? ''} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Paragon ID</label>
            <input className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={data.paragon_id ?? ''} disabled />
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

        {/* Benefits selection */}
        <div>
          <div className="mb-2 text-sm font-medium">Benefits</div>
          {benefitsData && benefitsData.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {benefitsData.map((b: any) => (
                <label key={String(b.id)} className="flex items-center gap-2 rounded border p-2">
                  <input
                    type="checkbox"
                    name="benefit_ids"
                    value={String(b.id)}
                    defaultChecked={selectedBenefitIds.has(String(b.id))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{b.name ?? String(b.id)}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">등록된 Benefit이 없습니다.</div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button formAction={saveAction} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
          <Link href="/admin/hotel-update" className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</Link>
        </div>
      </form>
    </div>
  )
}

async function saveAction(formData: FormData) {
  'use server'
  const sabreId = formData.get('sabre_id') as string | null
  const paragonId = formData.get('paragon_id') as string | null
  const property_name_kor = (formData.get('property_name_kor') as string | null) ?? null
  const property_name_eng = (formData.get('property_name_eng') as string | null) ?? null
  const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
  const rate_plan_codes = ratePlanCodesRaw
    ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : []

  const supabase = createServiceRoleClient()
  let update = supabase.from('select_hotels').update({ property_name_kor, property_name_eng, rate_plan_codes })
  if (sabreId) update = update.eq('sabre_id', sabreId)
  else if (paragonId) update = update.eq('paragon_id', paragonId)

  await update.select('sabre_id')
  // Update benefits links
  const benefitIds = formData.getAll('benefit_ids').map((v) => String(v))
  if (sabreId) {
    await supabase.from('hotel_benefits').delete().eq('sabre_id', sabreId)
  } else if (paragonId) {
    await supabase.from('hotel_benefits').delete().eq('paragon_id', paragonId)
  }
  if (benefitIds.length > 0) {
    const rows = benefitIds.map((bid) => ({
      sabre_id: sabreId,
      paragon_id: paragonId,
      benefit_id: bid,
    }))
    await supabase.from('hotel_benefits').upsert(rows)
  }
  redirect('/admin/hotel-update')
}

