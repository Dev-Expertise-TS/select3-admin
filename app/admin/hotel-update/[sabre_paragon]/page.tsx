import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BenefitPickerInput } from '../_components/benefit-picker-input'
import { ClientSaveButton } from '../_components/save-controls'

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

  // Benefit column keys present on the row
  const allBenefitKeys = ['benefit', 'benefit_1', 'benefit_2', 'benefit_3', 'benefit_4', 'benefit_5', 'benefit_6'] as const
  const benefitKeys = allBenefitKeys.filter((k) => Object.prototype.hasOwnProperty.call(data, k))

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

        {/* Basic Benefits columns from select_hotels */}
        <div>
          <div className="mb-2 text-sm font-medium">Basic Benefits</div>
          {benefitKeys.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {benefitKeys.map((key) => (
                <BenefitPickerInput key={key} name={key} defaultValue={(data as any)[key] ?? ''} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Benefit 컬럼이 없습니다.</div>
          )}
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
  // Collect benefit columns from form data
  const benefitKeys = ['benefit', 'benefit_1', 'benefit_2', 'benefit_3', 'benefit_4', 'benefit_5', 'benefit_6']
  const benefitUpdates: Record<string, string | null> = {}
  for (const key of benefitKeys) {
    const current = formData.get(key)
    if (typeof current === 'string') {
      const cur = current.trim()
      benefitUpdates[key] = cur.length === 0 ? null : cur
    }
  }
  // debug: log inbound and outbound values for benefit_6
  try {
    // eslint-disable-next-line no-console
    console.log('[debug] server inbound benefit_6 =', (formData.get('benefit_6') as string | null) ?? '(missing)')
    // eslint-disable-next-line no-console
    console.log('[debug] server update benefit_6 =', benefitUpdates['benefit_6'])
  } catch {}

  const updatePayload = { property_name_kor, property_name_eng, rate_plan_codes, ...benefitUpdates }
  // Build match condition by original identifiers
  let update = supabase.from('select_hotels').update({ ...updatePayload, sabre_id: sabreIdEditable, paragon_id: paragonIdEditable })
  if (sabreId) update = update.eq('sabre_id', sabreId)
  else if (paragonId) update = update.eq('paragon_id', paragonId)

  const { data: updatedRow, error: updateError } = await update
    .select('sabre_id, benefit, benefit_1, benefit_2, benefit_3, benefit_4, benefit_5, benefit_6')
    .single()
  try {
    // eslint-disable-next-line no-console
    console.log('[debug] server after update row benefit_6 =', (updatedRow as any)?.benefit_6, ' error =', updateError?.message)
  } catch {}
  return { ok: true, updatedRow }
}

