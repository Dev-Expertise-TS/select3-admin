import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientSaveButton } from '@/features/hotels/components/save-controls'
import { BenefitsManager, type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'
import { getHotelBySabreOrParagon, getMappedBenefitsBySabreId, replaceBenefitMappings, updateHotelRow } from '@/features/hotels/lib/repository'

interface PageProps {
  params: Promise<{ sabre: string }>
}

export default async function HotelEditPage({ params }: PageProps) {
  const { sabre } = await params
  const sabreId = sabre === 'null' ? null : sabre
  if (!sabreId) return notFound()

  const { data, error } = await getHotelBySabreOrParagon({ sabreId, paragonId: null })
  if (error || !data) return notFound()

  let mappedBenefits: BBRow[] = []
  if (sabreId) mappedBenefits = (await getMappedBenefitsBySabreId(sabreId)) as BBRow[]

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
      }} className="space-y-4 rounded-lg border bg-white p-6" suppressHydrationWarning>
        <input type="hidden" name="sabre_id" value={String((data as Record<string, unknown>).sabre_id ?? '')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sabre ID</label>
            <input name="sabre_id_editable" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={String((data as Record<string, unknown>).sabre_id ?? '')} data-initial={String((data as Record<string, unknown>).sabre_id ?? '')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">호텔명(한글)</label>
            <input name="property_name_kor" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={String((data as Record<string, unknown>).property_name_kor ?? '')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">호텔명(영문)</label>
            <input name="property_name_eng" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={String((data as Record<string, unknown>).property_name_eng ?? '')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Rate Plan Codes (콤마 구분)</label>
          <input name="rate_plan_codes" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue={Array.isArray((data as Record<string, unknown>).rate_plan_codes) ? ((data as Record<string, unknown>).rate_plan_codes as string[]).join(', ') : ''} />
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">Benefits</div>
          <BenefitsManager initial={mappedBenefits as BBRow[]} />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <ClientSaveButton formId="hotel-edit-form" />
          <Link href="/admin/hotel-update" className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">취소</Link>
        </div>
      </form>
    </div>
  )
}

async function saveAction(formData: FormData) {
  'use server'
  const sabreId = (formData.get('sabre_id') as string | null) ?? null
  const sabreIdEditable = (formData.get('sabre_id_editable') as string | null)?.trim() || null
  const property_name_kor = (formData.get('property_name_kor') as string | null) ?? null
  const property_name_eng = (formData.get('property_name_eng') as string | null) ?? null
  const ratePlanCodesRaw = (formData.get('rate_plan_codes') as string | null) ?? ''
  const ratePlanCodesParsed = ratePlanCodesRaw ? ratePlanCodesRaw.split(',').map((s) => s.trim()).filter(Boolean) : []
  const rate_plan_codes = ratePlanCodesParsed.length > 0 ? ratePlanCodesParsed : null

  const updatePayload = { property_name_kor, property_name_eng, rate_plan_codes, sabre_id: sabreIdEditable }
  await updateHotelRow({ sabreId, paragonId: null }, updatePayload)

  const mappedIds = formData.getAll('mapped_benefit_id').map((v) => String(v))
  const mappedSortPairs: Array<{ id: string; sort: number }> = mappedIds.map((id, idx) => {
    const key = `mapped_sort__${id}`
    const raw = formData.get(key) as string | null
    const sort = raw != null ? Number(raw) : idx
    return { id, sort: Number.isFinite(sort) ? sort : idx }
  })
  const targetSabreId = sabreIdEditable || sabreId || null
  if (targetSabreId) {
    const uniqueIds = Array.from(new Set(mappedIds.map(String)))
    const sortMap = new Map(mappedSortPairs.map((p) => [p.id, p.sort]))
    await replaceBenefitMappings({ originalSabreId: sabreId, targetSabreId, mappedIds: uniqueIds, sortMap })
  }
  return { ok: true, sabre_id: sabreIdEditable || sabreId }
}


