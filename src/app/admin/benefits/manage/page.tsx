import { createServiceRoleClient } from '@/lib/supabase/server'
import { BenefitsTable } from './_components/BenefitsTable'
import { createBasicBenefit, updateBasicBenefitRow, deleteBasicBenefit } from './actions'

type Row = Record<string, unknown>

export default async function BasicBenefitsManagePage() {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('select_hotel_benefits')
    .select('*')

  if (error) {
    return <div className="rounded border bg-red-50 p-4 text-red-700">{error.message}</div>
  }

  const rows: Row[] = (data as Row[]) ?? []
  const originalColumns = rows[0] ? Object.keys(rows[0]) : ['benefit', 'name', 'description']
  const pkCandidates = ['id', 'benefit_id', 'uuid', 'code', 'key', 'pk', 'benefit']
  const pkField = pkCandidates.find((k) => originalColumns.includes(k)) || originalColumns[0]
  const excludeSet = new Set<string>(['created_at', 'benefit_id', pkField])
  const columns = originalColumns.filter((c) => !excludeSet.has(c))
  if (originalColumns.includes('created_at')) {
    rows.sort((a, b) => {
      const av = (a as Record<string, unknown>)?.['created_at']
      const bv = (b as Record<string, unknown>)?.['created_at']
      const ad = (() => {
        if (typeof av === 'string' || typeof av === 'number' || av instanceof Date) {
          return new Date(av as string | number | Date).getTime()
        }
        return 0
      })()
      const bd = (() => {
        if (typeof bv === 'string' || typeof bv === 'number' || bv instanceof Date) {
          return new Date(bv as string | number | Date).getTime()
        }
        return 0
      })()
      return bd - ad
    })
  } else {
    const sortKey = columns.includes('benefit') ? 'benefit' : (columns.includes('name') ? 'name' : pkField)
    rows.sort((a, b) => String(a?.[sortKey] ?? '').localeCompare(String(b?.[sortKey] ?? '')))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Benefits 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">Benefits 목록과 속성을 관리합니다.</p>
      </div>

      <BenefitsTable
        rows={rows}
        columns={columns}
        pkField={pkField}
        createAction={createBasicBenefit}
        updateRowAction={updateBasicBenefitRow}
        deleteAction={deleteBasicBenefit}
      />
    </div>
  )
}


