'use client'

import React from 'react'
import { Pencil, Plus } from 'lucide-react'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'
import { Button } from '@/components/ui/button'
import { createHotel } from '@/features/hotels/actions'

export function HotelUpdateManager() {
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        const sabre = String(formData.get('sabre_id') ?? '').trim()
        const nameKo = String(formData.get('property_name_ko') ?? '').trim()
        const nameEn = String(formData.get('property_name_en') ?? '').trim()
        if (!sabre || !nameKo || !nameEn) {
          alert('Sabre ID, 호텔명(한글), 호텔명(영문)은 필수입니다.')
          return
        }
        const result = await createHotel(formData)
        if (!result.success) {
          alert(result.error || '생성에 실패했습니다.')
          return
        }
        setOpen(false)
        formRef.current?.reset()
        alert('신규 호텔이 생성되었습니다.')
      } catch (e) {
        console.error(e)
        alert('생성 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Pencil className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">호텔 정보 업데이트</h1>
            <p className="text-sm text-gray-600 mt-1">호텔의 기본 정보와 설정 값을 업데이트함.</p>
          </div>
        </div>
        <Button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          신규 호텔 생성
        </Button>
      </div>

      <HotelSearchWidget 
        hideHeader={true}
        enableHotelEdit={true}
      />

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">신규 호텔 생성</h2>
            </div>
            <form ref={formRef} action={onSubmit} className="space-y-4" suppressHydrationWarning>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sabre ID</label>
                <input name="sabre_id" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="예: 123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">호텔명(한글)</label>
                <input name="property_name_ko" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">호텔명(영문)</label>
                <input name="property_name_en" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Slug (선택)</label>
                <input name="slug" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="비우면 자동 생성됩니다" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>취소</Button>
                <Button type="submit" disabled={isPending}>{isPending ? '생성 중...' : '생성'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
