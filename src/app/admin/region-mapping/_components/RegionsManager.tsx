'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Save, X, Trash2, Link2, Eye, Loader2, PlusCircle, Edit } from 'lucide-react'
import type { SelectRegion, RegionFormInput, RegionType, MappedHotel, RegionStatus } from '@/types/regions'
import { upsertRegion, deleteRegion, upsertCitiesFromHotels, upsertCountriesFromHotels, upsertContinentsFromHotels, fillRegionSlugsAndCodes, fillCityCodesAndSlugs, fillCountryCodesAndSlugs, fillContinentCodesAndSlugs, forceUpdateAllCityCodes, getMappedHotels } from '@/features/regions/actions'
import { HotelSearchSelector } from '@/components/shared/hotel-search-selector'

type Props = {
  initialItems: SelectRegion[]
}

type EditingRow = SelectRegion & {
  isNew?: boolean
}

export function RegionsManager({ initialItems }: Props) {
  const [items, setItems] = useState<SelectRegion[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<RegionType>('city')
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [mappedHotels, setMappedHotels] = useState<MappedHotel[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<SelectRegion | null>(null)
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set())
  const [editingRowId, setEditingRowId] = useState<number | 'new' | null>(null)
  const [editingData, setEditingData] = useState<Partial<EditingRow>>({})

  function isSelectRegion(value: unknown): value is SelectRegion {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    return (
      (typeof v.id === 'number' || typeof v.id === 'string') &&
      typeof v.region_type === 'string'
    )
  }

  const columns = useMemo(() => {
    const base = [
      { key: 'id', label: 'ID', width: '64px' }, 
      { key: 'region_type', label: '유형', width: '100px' }
    ]
    if (selectedType === 'city') {
      return [
        ...base,
        { key: 'city_ko', label: '도시(한)', width: '100px' },
        { key: 'city_en', label: '도시(영)', width: '100px' },
        { key: 'city_code', label: '도시코드', width: '80px' },
        { key: 'country_ko', label: '국가(한)', width: '90px', isParent: true },
        { key: 'country_en', label: '국가(영)', width: '90px', isParent: true },
        { key: 'country_code', label: '국가코드', width: '70px', isParent: true },
        { key: 'continent_ko', label: '대륙(한)', width: '80px', isParent: true },
        { key: 'continent_code', label: '대륙코드', width: '70px', isParent: true },
        { key: 'status', label: '상태', width: '90px' },
      ]
    }
    if (selectedType === 'country') {
      return [
        ...base,
        { key: 'country_ko', label: '국가(한)', width: '120px' },
        { key: 'country_en', label: '국가(영)', width: '120px' },
        { key: 'country_code', label: '국가 코드', width: '100px' },
        { key: 'continent_ko', label: '대륙(한)', width: '100px', isParent: true },
        { key: 'continent_en', label: '대륙(영)', width: '100px', isParent: true },
        { key: 'continent_code', label: '대륙코드', width: '80px', isParent: true },
        { key: 'status', label: '상태', width: '100px' },
      ]
    }
    if (selectedType === 'continent') {
      return [
        ...base,
        { key: 'continent_ko', label: '대륙(한)', width: '120px' },
        { key: 'continent_en', label: '대륙(영)', width: '120px' },
        { key: 'continent_code', label: '대륙 코드', width: '100px' },
        { key: 'continent_slug', label: '대륙 슬러그', width: '120px' },
        { key: 'continent_sort_order', label: '정렬', width: '80px' },
        { key: 'status', label: '상태', width: '100px' },
      ]
    }
    // region
    return [
      ...base,
      { key: 'region_name_ko', label: '지역(한)', width: '120px' },
      { key: 'region_name_en', label: '지역(영)', width: '120px' },
      { key: 'region_code', label: '지역 코드', width: '100px' },
      { key: 'region_slug', label: '지역 슬러그', width: '120px' },
      { key: 'region_name_sort_order', label: '정렬', width: '80px' },
      { key: 'status', label: '상태', width: '100px' },
    ]
  }, [selectedType])

  useEffect(() => {
    let canceled = false
    const fetchByType = async () => {
      setLoading(true)
      setEditingRowId(null)
      setEditingData({})
      try {
        const res = await fetch(`/api/regions?page=1&pageSize=100&type=${selectedType}`, { cache: 'no-store' })
        const data = await res.json()
        if (!canceled && data?.success && Array.isArray(data.data)) {
          setItems(data.data as unknown as SelectRegion[])
        }
      } catch {
        // ignore
      } finally {
        if (!canceled) setLoading(false)
      }
    }
    fetchByType()
    return () => {
      canceled = true
    }
  }, [selectedType])

  const handleAdd = async () => {
    if (!confirm('호텔 테이블의 도시명을 수집하여 지역(city)으로 upsert 하시겠습니까?')) return
    setLoading(true)
    const res = await upsertCitiesFromHotels()
    if (res.success) {
      await refreshData()
      alert(`업서트 완료: ${res.data?.upserted ?? 0}건`)
    } else {
      alert(res.error || '업서트 실패')
    }
    setLoading(false)
  }

  const handleUpsertCountries = async () => {
    if (!confirm('호텔 테이블의 국가명을 수집하여 지역(country)으로 upsert 하시겠습니까?')) return
    setLoading(true)
    const res = await upsertCountriesFromHotels()
    if (res.success) {
      await refreshData()
      alert(`업서트 완료(국가): ${res.data?.upserted ?? 0}건`)
    } else {
      alert(res.error || '업서트 실패(국가)')
    }
    setLoading(false)
  }

  const handleUpsertContinents = async () => {
    if (!confirm('호텔 테이블의 대륙명을 수집하여 지역(continent)으로 upsert 하시겠습니까?')) return
    setLoading(true)
    const res = await upsertContinentsFromHotels()
    if (res.success) {
      await refreshData()
      alert(`업서트 완료(대륙): ${res.data?.upserted ?? 0}건`)
    } else {
      alert(res.error || '업서트 실패(대륙)')
    }
    setLoading(false)
  }

  const handleDelete = async (row: SelectRegion) => {
    if (!confirm(`정말 삭제하시겠습니까? ID=${row.id}`)) return
    setLoading(true)
    const res = await deleteRegion(row.id)
    setLoading(false)
    if (res.success) {
      setItems((prev) => prev.filter((it) => it.id !== row.id))
    } else {
      alert(res.error || '삭제 실패')
    }
  }

  const handleCreateNew = () => {
    setEditingRowId('new')
    setEditingData({
      region_type: selectedType,
      status: 'active',
      isNew: true,
    })
  }

  const handleEdit = (row: SelectRegion) => {
    setEditingRowId(row.id)
    setEditingData({ ...row })
  }

  const handleCancelEdit = () => {
    setEditingRowId(null)
    setEditingData({})
  }

  const handleSaveEdit = async () => {
    if (!editingData.region_type) {
      alert('유형이 필요합니다.')
      return
    }

    setLoading(true)
    const input: RegionFormInput & { id?: number } = {
      region_type: editingData.region_type,
      status: editingData.status || 'active',
      city_ko: editingData.city_ko,
      city_en: editingData.city_en,
      city_code: editingData.city_code,
      city_slug: editingData.city_slug,
      city_sort_order: editingData.city_sort_order,
      country_ko: editingData.country_ko,
      country_en: editingData.country_en,
      country_code: editingData.country_code,
      country_slug: editingData.country_slug,
      country_sort_order: editingData.country_sort_order,
      continent_ko: editingData.continent_ko,
      continent_en: editingData.continent_en,
      continent_code: editingData.continent_code,
      continent_slug: editingData.continent_slug,
      continent_sort_order: editingData.continent_sort_order,
      region_name_ko: editingData.region_name_ko,
      region_name_en: editingData.region_name_en,
      region_code: editingData.region_code,
      region_slug: editingData.region_slug,
      region_name_sort_order: editingData.region_name_sort_order,
    }

    if (editingRowId !== 'new' && typeof editingRowId === 'number') {
      input.id = editingRowId
    }

    const res = await upsertRegion(input)
    setLoading(false)

    if (res.success) {
      await refreshData()
      setEditingRowId(null)
      setEditingData({})
      alert('저장되었습니다.')
    } else {
      alert(res.error || '저장 실패')
    }
  }

  const handleMapToHotels = async (row: SelectRegion) => {
    setSelectedRegion(row)
    setShowMapModal(true)
    setSelectedHotels(new Set())
  }

  const refreshData = async () => {
    try {
      const typeParam = selectedType === 'city' || selectedType === 'country' || selectedType === 'continent' || selectedType === 'region' ? `&type=${selectedType}` : ''
      const response = await fetch(`/api/regions?page=1&pageSize=100${typeParam}`, { cache: 'no-store' })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data as SelectRegion[])
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
    }
  }

  const handleSaveMapping = async () => {
    if (!selectedRegion || selectedHotels.size === 0) {
      alert('호텔을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedHotels.size}개 호텔에 지역 정보를 매핑하시겠습니까?`)) return

    setLoading(true)
    
    const updateData: Record<string, string | null> = {}
    
    if (selectedRegion.region_type === 'city') {
      // 도시 정보 매핑
      updateData.city_code = selectedRegion.city_code ?? null
      updateData.city_ko = selectedRegion.city_ko ?? null
      updateData.city_en = selectedRegion.city_en ?? null
      
      // 도시 매핑 시 상위 지역(국가, 대륙)도 함께 매핑
      if (selectedRegion.country_code || selectedRegion.country_ko || selectedRegion.country_en) {
        updateData.country_code = selectedRegion.country_code ?? null
        updateData.country_ko = selectedRegion.country_ko ?? null
        updateData.country_en = selectedRegion.country_en ?? null
      }
      if (selectedRegion.continent_code || selectedRegion.continent_ko || selectedRegion.continent_en) {
        updateData.continent_code = selectedRegion.continent_code ?? null
        updateData.continent_ko = selectedRegion.continent_ko ?? null
        updateData.continent_en = selectedRegion.continent_en ?? null
      }
    } else if (selectedRegion.region_type === 'country') {
      // 국가 정보 매핑
      updateData.country_code = selectedRegion.country_code ?? null
      updateData.country_ko = selectedRegion.country_ko ?? null
      updateData.country_en = selectedRegion.country_en ?? null
      
      // 국가 매핑 시 상위 지역(대륙)도 함께 매핑
      if (selectedRegion.continent_code || selectedRegion.continent_ko || selectedRegion.continent_en) {
        updateData.continent_code = selectedRegion.continent_code ?? null
        updateData.continent_ko = selectedRegion.continent_ko ?? null
        updateData.continent_en = selectedRegion.continent_en ?? null
      }
    } else if (selectedRegion.region_type === 'continent') {
      // 대륙 정보 매핑
      updateData.continent_code = selectedRegion.continent_code ?? null
      updateData.continent_ko = selectedRegion.continent_ko ?? null
      updateData.continent_en = selectedRegion.continent_en ?? null
    } else if (selectedRegion.region_type === 'region') {
      // 지역 정보 매핑
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
    }

    const codeField = `${selectedRegion.region_type}_code`
    const hasCode = selectedRegion.region_type === 'city' ? selectedRegion.city_code
      : selectedRegion.region_type === 'country' ? selectedRegion.country_code
      : selectedRegion.region_type === 'continent' ? selectedRegion.continent_code
      : selectedRegion.region_code

    if (!hasCode) {
      setLoading(false)
      alert(`이 레코드에는 ${selectedRegion.region_type} 코드가 없습니다. 먼저 코드를 설정해주세요.`)
      return
    }

    try {
      let updated = 0
      const errors: string[] = []
      
      for (const sabreId of selectedHotels) {
        const response = await fetch('/api/hotel/update-region-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sabre_id: sabreId,
            update_data: updateData
          })
        })
        
        const result = await response.json()
        if (result.success) {
          updated++
        } else {
          errors.push(`${sabreId}: ${result.error}`)
        }
      }

      setLoading(false)
      setShowMapModal(false)
      
      if (errors.length > 0) {
        alert(`호텔 매핑 완료: ${updated}/${selectedHotels.size}개 성공\n\n오류:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n... 외 ${errors.length - 3}건` : ''}`)
      } else {
        alert(`호텔 매핑 완료: ${updated}/${selectedHotels.size}개 호텔 업데이트됨`)
      }
    } catch (error) {
      setLoading(false)
      alert('호텔 매핑 중 오류가 발생했습니다.')
    }
  }

  const handleRowClick = async (row: SelectRegion) => {
    if (editingRowId) return // 편집 중이면 클릭 무시
    
    let code: string | null = null
    let codeType: 'city' | 'country' | 'continent' | 'region' | null = null
    let title = ''
    
    if (row.region_type === 'city' && row.city_code) {
      code = row.city_code
      codeType = 'city'
      title = `도시 "${row.city_ko || row.city_en}" (${code}) 매핑된 호텔`
    } else if (row.region_type === 'country' && row.country_code) {
      code = row.country_code
      codeType = 'country'
      title = `국가 "${row.country_ko || row.country_en}" (${code}) 매핑된 호텔`
    } else if (row.region_type === 'continent' && row.continent_code) {
      code = row.continent_code
      codeType = 'continent'
      title = `대륙 "${row.continent_ko || row.continent_en}" (${code}) 매핑된 호텔`
    } else if (row.region_type === 'region' && row.region_code) {
      code = row.region_code
      codeType = 'region'
      title = `지역 "${row.region_name_ko || row.region_name_en}" (${code}) 매핑된 호텔`
    }
    
    if (!code || !codeType) {
      alert('이 레코드에는 코드가 없습니다.')
      return
    }
    
    setLoading(true)
    const res = await getMappedHotels(code, codeType)
    setLoading(false)
    
    if (res.success && res.data) {
      setMappedHotels(res.data.hotels)
      setModalTitle(title)
      setShowHotelModal(true)
    } else {
      alert(res.error || '호텔 조회 실패')
    }
  }

  const renderCell = (row: SelectRegion, columnKey: string, isParent?: boolean) => {
    const isEditing = editingRowId === row.id
    const value = (row as any)[columnKey]

    if (!isEditing) {
      if (columnKey === 'status') {
        return (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {value === 'active' ? '활성' : '비활성'}
          </span>
        )
      }
      // 상위 지역 필드는 회색으로 표시
      if (isParent && value) {
        return <span className="text-xs text-gray-600">{value}</span>
      }
      return <span className="text-sm">{value ?? '-'}</span>
    }

    // 편집 모드
    if (columnKey === 'id' || columnKey === 'region_type') {
      return <span className="text-gray-500">{value ?? '-'}</span>
    }

    if (columnKey === 'status') {
      return (
        <select
          value={String(editingData.status ?? 'active')}
          onChange={(e) => setEditingData(prev => ({ ...prev, status: e.target.value as RegionStatus }))}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select>
      )
    }

    if (columnKey.includes('sort_order')) {
      return (
        <input
          type="number"
          value={String((editingData as any)[columnKey] ?? '')}
          onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: parseInt(e.target.value) || 0 }))}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )
    }

    // 상위 지역 필드는 배경색 다르게
    const isParentField = isParent || columnKey.startsWith('country_') || columnKey.startsWith('continent_')
    const bgClass = isParentField && selectedType === 'city' ? 'bg-blue-50' : ''
    
    return (
      <input
        type="text"
        value={String((editingData as any)[columnKey] ?? '')}
        onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
        className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${bgClass}`}
        placeholder={isParentField ? '선택사항' : ''}
      />
    )
  }

  const renderNewRow = () => {
    if (editingRowId !== 'new') return null

    return (
      <tr className="bg-yellow-50 border-2 border-yellow-400">
        <td className="border p-2">
          <span className="text-xs text-gray-500">NEW</span>
        </td>
        <td className="border p-2">
          <span className="text-xs text-gray-500">{selectedType}</span>
        </td>
        {columns.slice(2).map((col) => {
          const isParentField = (col as any).isParent
          const bgClass = isParentField ? 'bg-blue-50' : ''
          return (
            <td key={col.key} className={`border p-2 ${isParentField ? 'bg-gray-50' : ''}`}>
              {col.key === 'status' ? (
                <select
                  value={String(editingData.status ?? 'active')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, status: e.target.value as RegionStatus }))}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              ) : col.key.includes('sort_order') ? (
                <input
                  type="number"
                  value={String((editingData as any)[col.key] ?? '')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, [col.key]: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={col.label}
                />
              ) : (
                <input
                  type="text"
                  value={String((editingData as any)[col.key] ?? '')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, [col.key]: e.target.value }))}
                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${bgClass}`}
                  placeholder={isParentField ? '선택사항' : col.label}
                />
              )}
            </td>
          )
        })}
        <td className="border p-2">
          <div className="flex gap-1">
            <Button onClick={handleSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <Save className="h-3 w-3" />
            </Button>
            <Button onClick={handleCancelEdit} size="sm" variant="outline" disabled={loading}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm text-gray-600">구분:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as RegionType)}
          disabled={loading || editingRowId !== null}
        >
          <option value="city">city</option>
          <option value="country">country</option>
          <option value="continent">continent</option>
          <option value="region">region</option>
        </select>

        <Button onClick={handleCreateNew} className="bg-green-600 hover:bg-green-700" disabled={editingRowId !== null}>
          <PlusCircle className="h-4 w-4" />
          <span className="ml-2">신규 행 추가</span>
        </Button>

        {selectedType === 'city' && (
          <>
            <Button onClick={handleAdd} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">도시 업서트</span>
            </Button>
            <Button onClick={async () => {
              setLoading(true)
              const res = await fillCityCodesAndSlugs()
              if (res.success) {
                await refreshData()
                alert(`도시 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
              } else {
                alert(res.error || '도시 보정 실패')
              }
              setLoading(false)
            }} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">도시 코드/슬러그 보정</span>
            </Button>
            <Button 
              onClick={async () => {
                if (!confirm('모든 도시의 IATA 코드를 재조회합니다. 시간이 걸릴 수 있습니다. 계속하시겠습니까?')) return
                setLoading(true)
                const res = await forceUpdateAllCityCodes()
                if (res.success) {
                  await refreshData()
                  alert(`도시 코드 강제 업데이트 완료: ${res.data?.updated ?? 0}/${res.data?.total ?? 0}건`)
                } else {
                  alert(res.error || '강제 업데이트 실패')
                }
                setLoading(false)
              }} 
              className="ml-2 bg-orange-600 hover:bg-orange-700"
              disabled={editingRowId !== null}
            >
              <Edit className="h-4 w-4" />
              <span className="ml-1">🔥 모든 도시 코드 강제 업데이트</span>
            </Button>
          </>
        )}
        {selectedType === 'country' && (
          <>
            <Button onClick={handleUpsertCountries} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">국가 업서트</span>
            </Button>
            <Button onClick={async () => {
              setLoading(true)
              const res = await fillCountryCodesAndSlugs()
              if (res.success) {
                await refreshData()
                alert(`국가 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
              } else {
                alert(res.error || '국가 보정 실패')
              }
              setLoading(false)
            }} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">국가 코드/슬러그 보정</span>
            </Button>
          </>
        )}
        {selectedType === 'continent' && (
          <>
            <Button onClick={handleUpsertContinents} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">대륙 업서트</span>
            </Button>
            <Button onClick={async () => {
              setLoading(true)
              const res = await fillContinentCodesAndSlugs()
              if (res.success) {
                await refreshData()
                alert(`대륙 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
              } else {
                alert(res.error || '대륙 보정 실패')
              }
              setLoading(false)
            }} className="ml-2" disabled={editingRowId !== null}>
              <Plus className="h-4 w-4" />
              <span className="ml-1">대륙 코드/슬러그 보정</span>
            </Button>
          </>
        )}
        {selectedType === 'region' && (
          <Button onClick={async () => {
            setLoading(true)
            const res = await fillRegionSlugsAndCodes()
            if (res.success) {
              await refreshData()
              alert(`지역 보정 완료: ${res.data?.updated ?? 0}건`)
            } else {
              alert(res.error || '지역 보정 실패')
            }
            setLoading(false)
          }} className="ml-2" disabled={editingRowId !== null}>
            <Plus className="h-4 w-4" />
            <span className="ml-1">지역 슬러그 보정</span>
          </Button>
        )}
      </div>

      {/* 인라인 에디터 테이블 */}
      <div className="border rounded-lg overflow-hidden bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    className="border p-2 text-left font-medium text-gray-700"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="border p-2 text-left font-medium text-gray-700" style={{ width: '180px' }}>
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {renderNewRow()}
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    로딩 중...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="p-8 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isEditing = editingRowId === row.id
                  return (
                    <tr 
                      key={row.id} 
                      className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50 border-2 border-blue-400' : ''} ${!isEditing && !editingRowId ? 'cursor-pointer' : ''}`}
                      onClick={() => !isEditing && !editingRowId && handleRowClick(row)}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`border p-2 ${(col as any).isParent ? 'bg-gray-50' : ''}`}>
                          {renderCell(row, col.key, (col as any).isParent)}
                        </td>
                      ))}
                      <td className="border p-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button onClick={handleSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button onClick={handleCancelEdit} size="sm" variant="outline" disabled={loading}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button 
                              onClick={(e) => { e.stopPropagation(); handleMapToHotels(row); }} 
                              size="sm" 
                              variant="outline" 
                              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                              disabled={editingRowId !== null}
                            >
                              <Link2 className="h-3 w-3" />
                            </Button>
                            <Button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(row); }} 
                              size="sm" 
                              variant="outline"
                              disabled={editingRowId !== null}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(row); }} 
                              size="sm" 
                              variant="destructive"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={editingRowId !== null}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-gray-50 text-sm text-gray-600">
          총 {items.length}개 항목 | 행을 클릭하면 매핑된 호텔을 확인할 수 있습니다.
        </div>
      </div>

      {/* 호텔 매핑 모달 (검색 및 선택) */}
      {showMapModal && selectedRegion && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowMapModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-blue-50">
              <div>
                <h2 className="text-xl font-bold text-blue-900">호텔 매핑</h2>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedRegion.region_type === 'city' && `도시: ${selectedRegion.city_ko || selectedRegion.city_en} (${selectedRegion.city_code})`}
                  {selectedRegion.region_type === 'country' && `국가: ${selectedRegion.country_ko || selectedRegion.country_en} (${selectedRegion.country_code})`}
                  {selectedRegion.region_type === 'continent' && `대륙: ${selectedRegion.continent_ko || selectedRegion.continent_en} (${selectedRegion.continent_code})`}
                  {selectedRegion.region_type === 'region' && `지역: ${selectedRegion.region_name_ko || selectedRegion.region_name_en} (${selectedRegion.region_code})`}
                </p>
              </div>
              <button onClick={() => setShowMapModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>
            
            <HotelSearchSelector
              selectedHotels={selectedHotels}
              onSelectionChange={setSelectedHotels}
              multiple={true}
            />

            <div className="p-4 border-t bg-gray-50 flex justify-end items-center gap-2">
              <Button onClick={() => setShowMapModal(false)} variant="outline">
                취소
              </Button>
              <Button 
                onClick={handleSaveMapping} 
                disabled={selectedHotels.size === 0 || loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `저장 (${selectedHotels.size})`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 매핑된 호텔 리스트 모달 (조회용) */}
      {showHotelModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowHotelModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{modalTitle}</h2>
              <button onClick={() => setShowHotelModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {mappedHotels.length === 0 ? (
                <p className="text-gray-500 text-center py-8">매핑된 호텔이 없습니다.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Sabre ID</th>
                      <th className="border p-2 text-left">호텔명 (한글)</th>
                      <th className="border p-2 text-left">호텔명 (영문)</th>
                      <th className="border p-2 text-left">주소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedHotels.map((hotel, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border p-2 font-mono text-sm">{hotel.sabre_id}</td>
                        <td className="border p-2">{hotel.property_name_ko || '-'}</td>
                        <td className="border p-2">{hotel.property_name_en || '-'}</td>
                        <td className="border p-2 text-sm text-gray-600">{hotel.property_address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 text-right">
              <span className="text-sm text-gray-600">총 {mappedHotels.length}개 호텔</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
