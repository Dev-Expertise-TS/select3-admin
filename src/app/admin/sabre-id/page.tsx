import { Metadata } from 'next'
import SabreIdManager from './_components/SabreIdManager'

export const metadata: Metadata = {
  title: 'Sabre Hotel Code 관리 | Select Admin',
  description: 'Sabre API를 이용한 호텔 검색 및 Sabre Hotel Code 관리',
}

export default function SabreIdPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
                         <h1 className="text-2xl font-bold">Sabre Hotel Code 관리</h1>
               <p className="text-muted-foreground">
                 호텔 영문명을 검색하여 Sabre API에서 호텔 정보와 Sabre Hotel Code를 조회합니다.
               </p>
        </div>
        <SabreIdManager />
      </div>
    </div>
  )
}
