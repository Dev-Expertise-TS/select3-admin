import { createServiceRoleClient } from '@/lib/supabase/server'
import { BasicBenefitsTable } from './_components/BasicBenefitsTable'
import { createBasicBenefit, updateBasicBenefitRow, deleteBasicBenefit } from './actions'

type Row = Record<string, any>

export default async function BasicBenefitsPage() {
  const supabase = createServiceRoleClient()

  // select_basic_benefits 테이블 전체 조회
  const { data, error } = await supabase
    .from('select_basic_benefits')
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
  // 정렬: 생성 최신일자(created_at) 내림차순 우선. 없으면 기존 정렬 규칙 사용
  if (originalColumns.includes('created_at')) {
    rows.sort((a, b) => {
      const ad = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bd = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bd - ad
    })
  } else {
    const sortKey = columns.includes('benefit') ? 'benefit' : (columns.includes('name') ? 'name' : pkField)
    rows.sort((a, b) => String(a?.[sortKey] ?? '').localeCompare(String(b?.[sortKey] ?? '')))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">셀렉트 기본 혜택 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">select_basic_benefits 테이블의 항목을 관리합니다.</p>
      </div>

      <BasicBenefitsTable
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
