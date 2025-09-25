import { BenefitsTable } from './_components/BenefitsTable'
import { createBasicBenefit } from './actions'
import { ListChecks } from 'lucide-react'

export default async function BasicBenefitsManagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <ListChecks className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">혜택 관리</h1>
          <p className="text-sm text-gray-600 mt-1">혜택 목록과 속성을 관리합니다.</p>
        </div>
      </div>

      <BenefitsTable createAction={createBasicBenefit} />
    </div>
  )
}


