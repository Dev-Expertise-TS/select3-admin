'use client'

import { useMemo, useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { SelectRegion, RegionFormInput, RegionType } from '@/types/regions'
import { createRegion, deleteRegion, updateRegion, upsertCitiesFromHotels } from '@/features/regions/actions'

type Props = {
  initialItems: SelectRegion[]
}

export function RegionsManager({ initialItems }: Props) {
  const [items, setItems] = useState<SelectRegion[]>(initialItems)
  const [loading, setLoading] = useState(false)

  function isSelectRegion(value: unknown): value is SelectRegion {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    return (
      (typeof v.id === 'number' || typeof v.id === 'string') &&
      typeof v.region_type === 'string'
    )
  }

  const columns = useMemo(() => [
    { key: 'id', label: 'ID', width: '64px' },
    { key: 'region_type', label: '유형', width: '100px' },
    { key: 'city_kr', label: '도시(한)' },
    { key: 'city_en', label: '도시(영)' },
    { key: 'city_sort_order', label: '도시 정렬', width: '100px' },
    { key: 'country_ko', label: '국가(한)' },
    { key: 'country_en', label: '국가(영)' },
    { key: 'country_sort_order', label: '국가 정렬', width: '100px' },
    { key: 'continent_ko', label: '대륙(한)' },
    { key: 'continent_en', label: '대륙(영)' },
    { key: 'continent_sort_order', label: '대륙 정렬', width: '100px' },
    { key: 'region_name_kr', label: '지역(한)' },
    { key: 'region_name_en', label: '지역(영)' },
    { key: 'region_name_sort_order', label: '지역 정렬', width: '100px' },
    { key: 'updated_at', label: '업데이트', width: '160px' },
  ], [])

  function promptRegion(defaults?: Partial<SelectRegion>): RegionFormInput | null {
    const regionType = (prompt('유형 입력 (city | country | continent | region):', String(defaults?.region_type ?? 'city')) || '').trim() as RegionType
    if (!regionType) return null
    const cityKr = prompt('도시(한):', String(defaults?.city_kr ?? ''))
    const cityEn = prompt('도시(영):', String(defaults?.city_en ?? ''))
    const citySort = prompt('도시 정렬(숫자):', String(defaults?.city_sort_order ?? ''))
    const countryKo = prompt('국가(한):', String(defaults?.country_ko ?? ''))
    const countryEn = prompt('국가(영):', String(defaults?.country_en ?? ''))
    const countrySort = prompt('국가 정렬(숫자):', String(defaults?.country_sort_order ?? ''))
    const continentKo = prompt('대륙(한):', String(defaults?.continent_ko ?? ''))
    const continentEn = prompt('대륙(영):', String(defaults?.continent_en ?? ''))
    const continentSort = prompt('대륙 정렬(숫자):', String(defaults?.continent_sort_order ?? ''))
    const regionKr = prompt('지역(한):', String(defaults?.region_name_kr ?? ''))
    const regionEn = prompt('지역(영):', String(defaults?.region_name_en ?? ''))
    const regionSort = prompt('지역 정렬(숫자):', String(defaults?.region_name_sort_order ?? ''))

    const toNum = (v: string | null) => {
      if (v === null) return null
      const t = v.trim()
      if (t === '') return null
      const n = Number(t)
      return Number.isFinite(n) ? n : null
    }

    return {
      region_type: regionType,
      city_kr: cityKr ?? null,
      city_en: cityEn ?? null,
      city_sort_order: toNum(citySort),
      country_ko: countryKo ?? null,
      country_en: countryEn ?? null,
      country_sort_order: toNum(countrySort),
      continent_ko: continentKo ?? null,
      continent_en: continentEn ?? null,
      continent_sort_order: toNum(continentSort),
      region_name_kr: regionKr ?? null,
      region_name_en: regionEn ?? null,
      region_name_sort_order: toNum(regionSort),
    }
  }

  const handleAdd = async () => {
    if (!confirm('호텔 테이블의 도시명을 수집하여 지역(city)으로 upsert 하시겠습니까?')) return
    setLoading(true)
    const res = await upsertCitiesFromHotels()
    // 최신 목록으로 갱신 (간단히 서버에서 처음 50개 재조회)
    if (res.success) {
      const refreshed = await fetch('/api/regions?page=1&pageSize=50', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
      if (refreshed?.success && Array.isArray(refreshed.data)) {
        setItems(refreshed.data as unknown as SelectRegion[])
      }
      alert(`업서트 완료: ${res.data?.upserted ?? 0}건`)
    } else {
      alert(res.error || '업서트 실패')
    }
    setLoading(false)
  }

  const handleEdit = async (row: Record<string, unknown>) => {
    if (!isSelectRegion(row)) {
      alert('잘못된 행 데이터입니다.')
      return
    }
    const existing = row
    const input = promptRegion(existing)
    if (!input) return
    setLoading(true)
    const res = await updateRegion(existing.id, input)
    setLoading(false)
    if (res.success && res.data) {
      setItems((prev) => prev.map((it) => (it.id === existing.id ? (res.data as SelectRegion) : it)))
    } else {
      alert(res.error || '수정 실패')
    }
  }

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!isSelectRegion(row)) {
      alert('잘못된 행 데이터입니다.')
      return
    }
    const existing = row
    if (!confirm(`정말 삭제하시겠습니까? ID=${existing.id}`)) return
    setLoading(true)
    const res = await deleteRegion(existing.id)
    setLoading(false)
    if (res.success) {
      setItems((prev) => prev.filter((it) => it.id !== existing.id))
    } else {
      alert(res.error || '삭제 실패')
    }
  }

  return (
    <DataTable
      title="지역 코드 맵핑"
      subtitle="도시/국가/대륙/지역 데이터를 관리합니다."
      data={items}
      columns={columns}
      loading={loading}
      onAdd={handleAdd}
      addButtonLabel="새 지역 추가"
      addButtonIcon={<Plus className="h-4 w-4" />}
      actions={[
        { label: '수정', icon: <Edit className="h-3 w-3" />, onClick: handleEdit, variant: 'outline' },
        { label: '삭제', icon: <Trash2 className="h-3 w-3" />, onClick: handleDelete, variant: 'destructive', className: 'text-red-600 hover:text-red-700 hover:bg-red-50' },
      ]}
    />
  )
}


