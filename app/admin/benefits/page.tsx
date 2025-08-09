import { createServiceRoleClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function BenefitsAdminPage() {
  const supabase = createServiceRoleClient()

  // Load all benefits
  const { data: benefits, error: benefitsError } = await supabase
    .from('benefits')
    .select('*')

  if (benefitsError) {
    return (
      <div className="rounded border bg-red-50 p-4 text-red-700">{benefitsError.message}</div>
    )
  }

  // 동적 컬럼 처리
  type Row = Record<string, unknown>
  const rows: Row[] = (benefits as Row[]) ?? []
  const hasName = rows[0] ? Object.prototype.hasOwnProperty.call(rows[0], 'name') : true
  const hasDescription = rows[0] ? Object.prototype.hasOwnProperty.call(rows[0], 'description') : false

  const pkCandidates = ['id', 'benefit_id', 'code', 'uuid']
  const getPkField = (row: Row) => pkCandidates.find((k) => Object.prototype.hasOwnProperty.call(row, k)) || 'id'
  const getPkValue = (row: Row) => String((row as Record<string, unknown>)[getPkField(row)] as string)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">혜택 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">benefits 마스터와 호텔 연결을 관리합니다.</p>
      </div>

      {/* Benefits master table */}
      <div className="rounded-lg border bg-white">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Benefits 목록</h2>
            <p className="text-xs text-muted-foreground mt-1">총 {rows.length}개</p>
          </div>
          <form action={createBenefit} className="flex items-center gap-2">
            <input name="name" className="rounded border px-2 py-1 text-sm" placeholder="이름" required />
            <input name="description" className="rounded border px-2 py-1 text-sm" placeholder="설명 (선택)" />
            <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white">추가</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((b) => {
                const pkField = getPkField(b)
                const pkValue = getPkValue(b)
                return (
                  <tr key={`${pkField}:${pkValue}`}>
                    <td className="px-6 py-3 text-sm text-gray-600">{pkValue}</td>
                    <td className="px-6 py-3 text-sm">
                      <form action={updateBenefit} className="flex items-center gap-2">
                        <input type="hidden" name="pkField" value={pkField} />
                        <input type="hidden" name="pkValue" value={pkValue} />
                        {hasName && (
                          <input name="name" defaultValue={String(b.name ?? '')} className="rounded border px-2 py-1 text-sm" />
                        )}
                        {hasDescription && (
                          <input name="description" defaultValue={String(b.description ?? '')} className="rounded border px-2 py-1 text-sm w-64" />
                        )}
                        <button className="rounded bg-gray-100 px-3 py-1.5 text-sm">저장</button>
                      </form>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600"></td>
                    <td className="px-6 py-3 text-right">
                      <form action={deleteBenefit}>
                        <input type="hidden" name="pkField" value={pkField} />
                        <input type="hidden" name="pkValue" value={pkValue} />
                        <button className="rounded bg-red-50 px-3 py-1.5 text-sm text-red-700">삭제</button>
                      </form>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Link helper */}
      <div className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
        호텔과 Benefits 연결은 각 호텔 상세 편집 페이지에서 설정할 수 있습니다.
        <div className="mt-2">
          <Link href="/admin/hotel-update" className="text-blue-600 hover:underline">호텔 정보 업데이트 바로가기</Link>
        </div>
      </div>
    </div>
  )
}

async function createBenefit(formData: FormData) {
  'use server'
  const name = (formData.get('name') as string)?.trim()
  const description = ((formData.get('description') as string) ?? '').trim()
  if (!name) return
  const supabase = createServiceRoleClient()
  await supabase.from('benefits').insert({ name, description })
}

async function updateBenefit(formData: FormData) {
  'use server'
  const pkField = (formData.get('pkField') as string)!
  const pkValue = (formData.get('pkValue') as string)!
  const name = ((formData.get('name') as string) ?? '').trim()
  const description = ((formData.get('description') as string) ?? '').trim()
  const supabase = createServiceRoleClient()
  const updates: Record<string, unknown> = {}
  if (name) updates.name = name
  if (formData.get('description') !== null) updates.description = description
  if (Object.keys(updates).length > 0) {
    await supabase.from('benefits').update(updates).eq(pkField, pkValue)
  }
}

async function deleteBenefit(formData: FormData) {
  'use server'
  const pkField = (formData.get('pkField') as string)!
  const pkValue = (formData.get('pkValue') as string)!
  const supabase = createServiceRoleClient()
  await supabase.from('benefits').delete().eq(pkField, pkValue)
}

