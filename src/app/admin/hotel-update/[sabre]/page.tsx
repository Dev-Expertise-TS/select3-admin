import { notFound } from 'next/navigation'
import { HotelEditForm } from './hotel-edit-form'
import { getHotelBySabreOrParagon, getMappedBenefitsBySabreId } from '@/features/hotels/lib/repository'
import { type BenefitRow as BBRow } from '@/features/hotels/components/benefits-manager'

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

      <HotelEditForm 
        initialData={data as Record<string, unknown>}
        mappedBenefits={mappedBenefits}
      />
    </div>
  )
}




