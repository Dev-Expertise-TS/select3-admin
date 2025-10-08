'use client'

import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Link2, Eye, Loader2, PlusCircle } from 'lucide-react'
import type { SelectRegion, RegionFormInput, RegionType, MappedHotel } from '@/types/regions'
import { createRegion, deleteRegion, updateRegion, upsertCitiesFromHotels, upsertCountriesFromHotels, upsertContinentsFromHotels, fillRegionSlugsAndCodes, fillCityCodesAndSlugs, fillCountryCodesAndSlugs, fillContinentCodesAndSlugs, forceUpdateAllCityCodes, mapRegionToHotels, getMappedHotels } from '@/features/regions/actions'
import { HotelSearchSelector } from '@/components/shared/hotel-search-selector'
import { RegionFormModal } from './RegionFormModal'

type Props = {
  initialItems: SelectRegion[]
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
  const [showFormModal, setShowFormModal] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingRegion, setEditingRegion] = useState<SelectRegion | null>(null)

  function isSelectRegion(value: unknown): value is SelectRegion {
    if (!value || typeof value !== 'object') return false
    const v = value as Record<string, unknown>
    return (
      (typeof v.id === 'number' || typeof v.id === 'string') &&
      typeof v.region_type === 'string'
    )
  }

  const columns = useMemo(() => {
    const base = [{ key: 'id', label: 'ID', width: '64px' }, { key: 'region_type', label: '유형', width: '100px' }]
    if (selectedType === 'city') {
      return [
        ...base,
        { key: 'city_ko', label: '도시(한)' },
        { key: 'city_en', label: '도시(영)' },
        { key: 'city_code', label: '도시 코드', width: '120px' },
        { key: 'city_slug', label: '도시 슬러그', width: '140px' },
        { key: 'city_sort_order', label: '도시 정렬', width: '100px' },
        { key: 'updated_at', label: '업데이트', width: '160px' },
      ]
    }
    if (selectedType === 'country') {
      return [
        ...base,
        { key: 'country_ko', label: '국가(한)' },
        { key: 'country_en', label: '국가(영)' },
        { key: 'country_code', label: '국가 코드', width: '120px' },
        { key: 'country_slug', label: '국가 슬러그', width: '140px' },
        { key: 'country_sort_order', label: '국가 정렬', width: '100px' },
        { key: 'updated_at', label: '업데이트', width: '160px' },
      ]
    }
    if (selectedType === 'continent') {
      return [
        ...base,
        { key: 'continent_ko', label: '대륙(한)' },
        { key: 'continent_en', label: '대륙(영)' },
        { key: 'continent_code', label: '대륙 코드', width: '120px' },
        { key: 'continent_slug', label: '대륙 슬러그', width: '140px' },
        { key: 'continent_sort_order', label: '대륙 정렬', width: '100px' },
        { key: 'updated_at', label: '업데이트', width: '160px' },
      ]
    }
    // region
    return [
      ...base,
      { key: 'region_name_ko', label: '지역(한)' },
      { key: 'region_name_en', label: '지역(영)' },
      { key: 'region_code', label: '지역 코드', width: '120px' },
      { key: 'region_slug', label: '지역 슬러그', width: '140px' },
      { key: 'region_name_sort_order', label: '지역 정렬', width: '100px' },
      { key: 'updated_at', label: '업데이트', width: '160px' },
    ]
  }, [selectedType])

  useEffect(() => {
    let canceled = false
    const fetchByType = async () => {
      setLoading(true)
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

  const handleUpsertCountries = async () => {
    if (!confirm('호텔 테이블의 국가명을 수집하여 지역(country)으로 upsert 하시겠습니까?')) return
    setLoading(true)
    const res = await upsertCountriesFromHotels()
    if (res.success) {
      const refreshed = await fetch('/api/regions?page=1&pageSize=50', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
      if (refreshed?.success && Array.isArray(refreshed.data)) {
        setItems(refreshed.data as unknown as SelectRegion[])
      }
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
      const refreshed = await fetch('/api/regions?page=1&pageSize=50', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
      if (refreshed?.success && Array.isArray(refreshed.data)) {
        setItems(refreshed.data as unknown as SelectRegion[])
      }
      alert(`업서트 완료(대륙): ${res.data?.upserted ?? 0}건`)
    } else {
      alert(res.error || '업서트 실패(대륙)')
    }
    setLoading(false)
  }

  const handleEdit = async (row: Record<string, unknown>) => {
    if (!isSelectRegion(row)) {
      alert('잘못된 행 데이터입니다.')
      return
    }
    const existing = row
    setFormMode('edit')
    setEditingRegion(existing)
    setShowFormModal(true)
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

  const handleCreateNew = () => {
    setFormMode('create')
    setEditingRegion(null)
    setShowFormModal(true)
  }

  const handleMapToHotels = async (row: Record<string, unknown>) => {
    if (!isSelectRegion(row)) {
      alert('잘못된 행 데이터입니다.')
      return
    }
    const region = row
    setSelectedRegion(region)
    setShowMapModal(true)
    setSelectedHotels(new Set())
  }

  const handleFormSave = async (formData: any) => {
    setLoading(true)
    try {
      if (formMode === 'create') {
        const res = await createRegion(formData as RegionFormInput)
        if (res.success && res.data) {
          setItems(prev => [...prev, res.data as SelectRegion])
          alert('신규 코드가 추가되었습니다.')
          await refreshData()
        } else {
          alert(res.error || '추가 실패')
        }
      } else if (formMode === 'edit' && editingRegion) {
        const res = await updateRegion(editingRegion.id, formData as RegionFormInput)
        if (res.success && res.data) {
          setItems(prev => prev.map(it => it.id === editingRegion.id ? res.data as SelectRegion : it))
          alert('코드가 수정되었습니다.')
        } else {
          alert(res.error || '수정 실패')
        }
      }
    } catch (error) {
      console.error('Form save error:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
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
    
    // 지역 타입에 따른 업데이트 데이터 준비
    const updateData: Record<string, string | null> = {}
    
    if (selectedRegion.region_type === 'city') {
      updateData.city_code = selectedRegion.city_code ?? null
      updateData.city_ko = selectedRegion.city_ko ?? null
      updateData.city_en = selectedRegion.city_en ?? null
      console.log('[RegionsManager] City mapping data:', updateData)
    } else if (selectedRegion.region_type === 'country') {
      updateData.country_code = selectedRegion.country_code ?? null
      updateData.country_ko = selectedRegion.country_ko ?? null
      updateData.country_en = selectedRegion.country_en ?? null
      console.log('[RegionsManager] Country mapping data:', updateData)
    } else if (selectedRegion.region_type === 'continent') {
      updateData.continent_code = selectedRegion.continent_code ?? null
      updateData.continent_ko = selectedRegion.continent_ko ?? null
      updateData.continent_en = selectedRegion.continent_en ?? null
      console.log('[RegionsManager] Continent mapping data:', updateData)
    } else if (selectedRegion.region_type === 'region') {
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
      console.log('[RegionsManager] Region mapping data:', updateData)
      console.log('[RegionsManager] Selected region:', {
        region_code: selectedRegion.region_code,
        region_name_ko: selectedRegion.region_name_ko,
        region_name_en: selectedRegion.region_name_en
      })
    }

    // 코드가 없으면 경고
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

    console.log(`[RegionsManager] Mapping with ${codeField}=${hasCode} to ${selectedHotels.size} hotels`)

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
          console.error(`[RegionsManager] Failed to update ${sabreId}:`, result.error)
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
      console.error('[RegionsManager] Exception during mapping:', error)
      alert('호텔 매핑 중 오류가 발생했습니다.')
    }
  }

  const handleRowClick = async (row: Record<string, unknown>) => {
    if (!isSelectRegion(row)) return
    
    const region = row
    let code: string | null = null
    let codeType: 'city' | 'country' | 'continent' | 'region' | null = null
    let title = ''
    
    // region_type에 따라 해당 코드 가져오기
    if (region.region_type === 'city' && region.city_code) {
      code = region.city_code
      codeType = 'city'
      title = `도시 "${region.city_ko || region.city_en}" (${code}) 매핑된 호텔`
    } else if (region.region_type === 'country' && region.country_code) {
      code = region.country_code
      codeType = 'country'
      title = `국가 "${region.country_ko || region.country_en}" (${code}) 매핑된 호텔`
    } else if (region.region_type === 'continent' && region.continent_code) {
      code = region.continent_code
      codeType = 'continent'
      title = `대륙 "${region.continent_ko || region.continent_en}" (${code}) 매핑된 호텔`
    } else if (region.region_type === 'region' && region.region_code) {
      code = region.region_code
      codeType = 'region'
      title = `지역 "${region.region_name_ko || region.region_name_en}" (${code}) 매핑된 호텔`
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

  const handleCellClick = async (row: Record<string, unknown>, columnKey: string) => {
    // 셀 클릭은 행 클릭과 동일하게 처리
    handleRowClick(row)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm text-gray-600">구분:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as RegionType)}
        >
          <option value="city">city</option>
          <option value="country">country</option>
          <option value="continent">continent</option>
          <option value="region">region</option>
        </select>

        {/* 신규 코드 추가 버튼 */}
        <Button onClick={handleCreateNew} className="bg-green-600 hover:bg-green-700">
          <PlusCircle className="h-4 w-4" />
          <span className="ml-2">신규 코드 추가</span>
        </Button>

        {selectedType === 'city' && (
          <Button onClick={handleAdd} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">도시 업서트 (코드/슬러그 포함)</span>
          </Button>
        )}
        {selectedType === 'city' && (
          <Button onClick={async () => {
            setLoading(true)
            const res = await fillCityCodesAndSlugs()
            if (res.success) {
              const refreshed = await fetch('/api/regions?page=1&pageSize=100&type=city', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
              if (refreshed?.success && Array.isArray(refreshed.data)) {
                setItems(refreshed.data as unknown as SelectRegion[])
              }
              alert(`도시 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
            } else {
              alert(res.error || '도시 보정 실패')
            }
            setLoading(false)
          }} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">도시 코드/슬러그 보정</span>
          </Button>
        )}
        {selectedType === 'city' && (
          <Button 
            onClick={async () => {
              if (!confirm('모든 도시의 IATA 코드를 API Ninjas로 재조회합니다. 시간이 걸릴 수 있습니다. 계속하시겠습니까?')) return
              setLoading(true)
              const res = await forceUpdateAllCityCodes()
              if (res.success) {
                const refreshed = await fetch('/api/regions?page=1&pageSize=100&type=city', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
                if (refreshed?.success && Array.isArray(refreshed.data)) {
                  setItems(refreshed.data as unknown as SelectRegion[])
                }
                alert(`도시 코드 강제 업데이트 완료: ${res.data?.updated ?? 0}/${res.data?.total ?? 0}건 업데이트됨`)
              } else {
                alert(res.error || '강제 업데이트 실패')
              }
              setLoading(false)
            }} 
            className="ml-2 bg-orange-600 hover:bg-orange-700"
          >
            <Edit className="h-4 w-4" />
            <span className="ml-1">🔥 모든 도시 코드 강제 업데이트</span>
          </Button>
        )}
        {selectedType === 'country' && (
          <Button onClick={handleUpsertCountries} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">국가 업서트 (코드/슬러그 포함)</span>
          </Button>
        )}
        {selectedType === 'country' && (
          <Button onClick={async () => {
            setLoading(true)
            const res = await fillCountryCodesAndSlugs()
            if (res.success) {
              const refreshed = await fetch('/api/regions?page=1&pageSize=100&type=country', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
              if (refreshed?.success && Array.isArray(refreshed.data)) {
                setItems(refreshed.data as unknown as SelectRegion[])
              }
              alert(`국가 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
            } else {
              alert(res.error || '국가 보정 실패')
            }
            setLoading(false)
          }} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">국가 코드/슬러그 보정</span>
          </Button>
        )}
        {selectedType === 'continent' && (
          <Button onClick={handleUpsertContinents} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">대륙 업서트 (코드/슬러그 포함)</span>
          </Button>
        )}
        {selectedType === 'continent' && (
          <Button onClick={async () => {
            setLoading(true)
            const res = await fillContinentCodesAndSlugs()
            if (res.success) {
              const refreshed = await fetch('/api/regions?page=1&pageSize=100&type=continent', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
              if (refreshed?.success && Array.isArray(refreshed.data)) {
                setItems(refreshed.data as unknown as SelectRegion[])
              }
              alert(`대륙 코드/슬러그 보정: ${res.data?.updated ?? 0}건`)
            } else {
              alert(res.error || '대륙 보정 실패')
            }
            setLoading(false)
          }} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">대륙 코드/슬러그 보정</span>
          </Button>
        )}
        {selectedType === 'region' && (
          <Button onClick={async () => {
            setLoading(true)
            const res = await fillRegionSlugsAndCodes()
            if (res.success) {
              const refreshed = await fetch('/api/regions?page=1&pageSize=100&type=region', { cache: 'no-store' }).then(r => r.json()).catch(() => null) as { success?: boolean; data?: unknown }
              if (refreshed?.success && Array.isArray(refreshed.data)) {
                setItems(refreshed.data as unknown as SelectRegion[])
              }
              alert(`지역 보정 완료: ${res.data?.updated ?? 0}건`)
            } else {
              alert(res.error || '지역 보정 실패')
            }
            setLoading(false)
          }} className="ml-2">
            <Plus className="h-4 w-4" />
            <span className="ml-1">지역 슬러그 보정</span>
          </Button>
        )}
      </div>

      <DataTable
        title="지역 코드 맵핑"
        subtitle="도시/국가/대륙/지역 데이터를 관리합니다. 행을 클릭하면 매핑된 호텔을 확인할 수 있습니다."
        data={items}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        actions={[
          { label: '호텔 매핑', icon: <Link2 className="h-3 w-3" />, onClick: handleMapToHotels, variant: 'outline', className: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
          { label: '수정', icon: <Edit className="h-3 w-3" />, onClick: handleEdit, variant: 'outline' },
          { label: '삭제', icon: <Trash2 className="h-3 w-3" />, onClick: handleDelete, variant: 'destructive', className: 'text-red-600 hover:text-red-700 hover:bg-red-50' },
        ]}
      />

      {/* 호텔 매핑 모달 (검색 및 선택) */}
      {showMapModal && selectedRegion && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={() => setShowMapModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
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
            
            {/* 호텔 검색 컴포넌트 */}
            <HotelSearchSelector
              selectedHotels={selectedHotels}
              onSelectionChange={setSelectedHotels}
              multiple={true}
            />

            {/* 하단 버튼 */}
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

      {/* 신규/수정 폼 모달 */}
      <RegionFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditingRegion(null)
        }}
        onSave={handleFormSave}
        regionType={selectedType}
        initialData={editingRegion}
        mode={formMode}
      />
    </div>
  )
}


