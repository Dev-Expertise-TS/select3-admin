'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Plus, Save, X, Trash2, Link2, Loader2, PlusCircle, Edit, GripVertical, Image as ImageIcon } from 'lucide-react'
import type { SelectRegion, RegionFormInput, RegionType, MappedHotel, RegionStatus } from '@/types/regions'
import { upsertRegion, deleteRegion, upsertCitiesFromHotels, upsertCountriesFromHotels, upsertContinentsFromHotels, fillRegionSlugsAndCodes, fillCityCodesAndSlugs, fillCountryCodesAndSlugs, fillContinentCodesAndSlugs, getMappedHotels, bulkUpdateHotelRegionCodes } from '@/features/regions/actions'
import { HotelSearchSelector } from '@/components/shared/hotel-search-selector'
import CityImageManagerModal from './CityImageManagerModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Props = {
  initialItems: SelectRegion[]
}

type EditingRow = SelectRegion & {
  isNew?: boolean
}

// Sortable Row 컴포넌트
type SortableRowProps = {
  row: SelectRegion
  isEditing: boolean
  columns: Array<{ key: string; label: string; width?: string; isParent?: boolean }>
  selectedType: RegionType
  editingRowId: number | 'new' | null
  renderCell: (row: SelectRegion, columnKey: string, isParent?: boolean) => React.ReactNode
  onRowClick: (row: SelectRegion) => void
  onMapToHotels: (row: SelectRegion) => void
  onEdit: (row: SelectRegion) => void
  onSaveRow: (row: SelectRegion) => void
  onDelete: (row: SelectRegion) => void
  onImageManage: (row: SelectRegion) => void
  loading: boolean
}

function SortableRow({
  row,
  isEditing,
  columns,
  selectedType,
  editingRowId,
  renderCell,
  onRowClick,
  onMapToHotels,
  onEdit,
  onSaveRow,
  onDelete,
  onImageManage,
  loading,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${row.region_type}-${row.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#f0f9ff' : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50 border-2 border-blue-400' : ''} ${!isEditing && !editingRowId ? 'cursor-pointer' : ''}`}
      onClick={() => !isEditing && !editingRowId && onRowClick(row)}
    >
      {/* 드래그 핸들 */}
      <td className="border p-2 text-center" style={{ width: '40px' }}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-200 rounded p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </td>

      {/* 데이터 컬럼 */}
      {columns.map((col) => (
        <td key={col.key} className={`border p-2 ${(col as any).isParent ? 'bg-gray-50' : ''}`}>
          {renderCell(row, col.key, (col as any).isParent)}
        </td>
      ))}

      {/* 작업 컬럼 */}
      <td className="border p-2" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <div className="flex gap-1">
            {/* 편집 모드에서는 드래그 비활성화 */}
          </div>
        ) : (
          <div className="flex gap-1 flex-wrap">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onMapToHotels(row)
              }}
              size="sm"
              variant="outline"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
              disabled={editingRowId !== null}
              title="호텔 매핑"
            >
              <Link2 className="h-3 w-3" />
            </Button>
            {selectedType === 'city' && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  onImageManage(row)
                }}
                size="sm"
                variant="outline"
                className="bg-purple-50 text-purple-600 hover:bg-purple-100"
                disabled={editingRowId !== null}
                title="이미지 관리"
              >
                <ImageIcon className="h-3 w-3" />
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row)
              }}
              size="sm"
              variant="outline"
              disabled={editingRowId !== null}
              title="수정"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onSaveRow(row)
              }}
              size="sm"
              variant="outline"
              className="bg-green-50 text-green-600 hover:bg-green-100"
              disabled={editingRowId !== null || loading}
              title="저장"
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              disabled={editingRowId !== null}
              title="삭제"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}

export function RegionsManager({ initialItems }: Props) {
  // ✅ 초기 데이터를 active 우선으로 정렬 + 중복 제거
  const sortedInitialItems = useMemo(() => {
    // 중복 제거 먼저 수행
    const uniqueItems = initialItems.reduce((acc: SelectRegion[], current) => {
      const isDuplicate = acc.some(item => 
        item.id === current.id && item.region_type === current.region_type
      )
      if (!isDuplicate) {
        acc.push(current)
      } else {
        console.warn(`[RegionsManager] Initial data duplicate removed: ${current.region_type}-${current.id}`)
      }
      return acc
    }, [])
    
    const activeItems = uniqueItems.filter(item => item.status === 'active')
    const inactiveItems = uniqueItems.filter(item => item.status !== 'active')
    
    console.log(`[RegionsManager] Initial data: ${activeItems.length} active, ${inactiveItems.length} inactive (${initialItems.length - uniqueItems.length} duplicates removed)`)
    
    return [...activeItems, ...inactiveItems]
  }, [initialItems])
  
  const [items, setItems] = useState<SelectRegion[]>(sortedInitialItems)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<RegionType>('city')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active') // 기본값: active
  const [pageSize, setPageSize] = useState<number>(200)
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [mappedHotels, setMappedHotels] = useState<MappedHotel[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<SelectRegion | null>(null)
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set())
  const [editingRowId, setEditingRowId] = useState<number | 'new' | null>(null)
  const [editingData, setEditingData] = useState<Partial<EditingRow>>({})
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  
  // 콤보박스용 데이터
  const [countryOptions, setCountryOptions] = useState<SelectRegion[]>([])
  const [continentOptions, setContinentOptions] = useState<SelectRegion[]>([])
  const [regionOptions, setRegionOptions] = useState<SelectRegion[]>([])
  
  // 도시 이미지 관리 모달
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageModalCity, setImageModalCity] = useState<{
    cityKo: string | null
    cityEn: string | null
    cityCode: string | null
    citySlug: string | null
  } | null>(null)
  
  // 썸네일 URL 캐시 (key: citySlug 또는 cityKo, value: url)
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({})
  // 로딩 중인 썸네일 추적 (중복 요청 방지)
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set())
  
  // ✅ 배치 썸네일 로드 함수 (여러 이미지를 한 번에)
  const loadThumbnailsBatch = async (items: SelectRegion[]) => {
    if (items.length === 0) return

    const cities = items
      .filter(row => {
        const cacheKey = `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`
        return thumbnailCache[cacheKey] === undefined && !loadingThumbnails.has(cacheKey)
      })
      .map(row => ({
        cacheKey: `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`,
        cityCode: row.city_code ?? undefined,
        cityKo: row.city_ko ?? undefined,
        cityEn: row.city_en ?? undefined,
      }))
      .filter(city => city.cityCode || city.cityKo || city.cityEn)

    if (cities.length === 0) return

    console.log(`[RegionsManager] Loading ${cities.length} thumbnails in batch...`)

    // 로딩 상태 설정
    setLoadingThumbnails(prev => {
      const newSet = new Set(prev)
      cities.forEach(city => newSet.add(city.cacheKey))
      return newSet
    })

    try {
      const response = await fetch('/api/city-images/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: cities.map(c => ({
            cityCode: c.cityCode,
            cityKo: c.cityKo,
            cityEn: c.cityEn,
          })),
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        // 배치 결과를 캐시에 저장
        setThumbnailCache(prev => {
          const newCache = { ...prev }
          cities.forEach(city => {
            const searchKey = city.cityCode || city.cityKo || city.cityEn || 'none'
            newCache[city.cacheKey] = result.data[searchKey] || ''
          })
          return newCache
        })
      }
    } catch (error) {
      console.error('[RegionsManager] Batch thumbnail fetch error:', error)
      // 에러 시 빈 문자열로 캐시
      setThumbnailCache(prev => {
        const newCache = { ...prev }
        cities.forEach(city => {
          newCache[city.cacheKey] = ''
        })
        return newCache
      })
    } finally {
      // 로딩 완료
      setLoadingThumbnails(prev => {
        const newSet = new Set(prev)
        cities.forEach(city => newSet.delete(city.cacheKey))
        return newSet
      })
    }
  }
  
  // 드래그앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
        { key: 'city_sort_order', label: '순서', width: '70px' },
        { key: 'thumbnail', label: '썸네일', width: '100px' },
        { key: 'city_ko', label: '도시(한)', width: '100px' },
        { key: 'city_en', label: '도시(영)', width: '100px' },
        { key: 'city_code', label: '도시코드', width: '80px' },
        { key: 'city_slug', label: '도시 슬러그', width: '100px' },
        { key: 'country_ko', label: '국가(한)', width: '90px', isParent: true },
        { key: 'country_en', label: '국가(영)', width: '90px', isParent: true },
        { key: 'country_code', label: '국가코드', width: '70px', isParent: true },
        { key: 'continent_ko', label: '대륙(한)', width: '80px', isParent: true },
        { key: 'continent_en', label: '대륙(영)', width: '80px', isParent: true },
        { key: 'continent_code', label: '대륙코드', width: '70px', isParent: true },
        { key: 'region_name_ko', label: '지역(한)', width: '90px', isParent: true },
        { key: 'region_name_en', label: '지역(영)', width: '90px', isParent: true },
        { key: 'region_code', label: '지역코드', width: '70px', isParent: true },
        { key: 'status', label: '상태', width: '90px' },
      ]
    }
    if (selectedType === 'country') {
      return [
        ...base,
        { key: 'country_sort_order', label: '순서', width: '70px' },
        { key: 'country_ko', label: '국가(한)', width: '120px' },
        { key: 'country_en', label: '국가(영)', width: '120px' },
        { key: 'country_code', label: '국가 코드', width: '100px' },
        { key: 'continent_ko', label: '대륙(한)', width: '100px', isParent: true },
        { key: 'continent_en', label: '대륙(영)', width: '100px', isParent: true },
        { key: 'continent_code', label: '대륙코드', width: '80px', isParent: true },
        { key: 'region_name_ko', label: '지역(한)', width: '100px', isParent: true },
        { key: 'region_name_en', label: '지역(영)', width: '100px', isParent: true },
        { key: 'region_code', label: '지역코드', width: '80px', isParent: true },
        { key: 'status', label: '상태', width: '100px' },
      ]
    }
    if (selectedType === 'continent') {
      return [
        ...base,
        { key: 'continent_sort_order', label: '순서', width: '70px' },
        { key: 'continent_ko', label: '대륙(한)', width: '120px' },
        { key: 'continent_en', label: '대륙(영)', width: '120px' },
        { key: 'continent_code', label: '대륙 코드', width: '100px' },
        { key: 'region_name_ko', label: '지역(한)', width: '100px', isParent: true },
        { key: 'region_name_en', label: '지역(영)', width: '100px', isParent: true },
        { key: 'region_code', label: '지역코드', width: '80px', isParent: true },
        { key: 'status', label: '상태', width: '100px' },
      ]
    }
    // region
    return [
      ...base,
      { key: 'region_name_sort_order', label: '순서', width: '70px' },
      { key: 'region_name_ko', label: '지역(한)', width: '100px' },
      { key: 'region_name_en', label: '지역(영)', width: '100px' },
      { key: 'region_code', label: '지역코드', width: '80px' },
      { key: 'country_ko', label: '국가(한)', width: '90px', isParent: true },
      { key: 'country_en', label: '국가(영)', width: '90px', isParent: true },
      { key: 'country_code', label: '국가코드', width: '70px', isParent: true },
      { key: 'continent_ko', label: '대륙(한)', width: '80px', isParent: true },
      { key: 'continent_en', label: '대륙(영)', width: '80px', isParent: true },
      { key: 'continent_code', label: '대륙코드', width: '70px', isParent: true },
      { key: 'status', label: '상태', width: '90px' },
    ]
  }, [selectedType])

  // 콤보박스 옵션 로드
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // 국가 옵션
        const countryRes = await fetch('/api/regions?page=1&pageSize=500&type=country', { cache: 'no-store' })
        const countryData = await countryRes.json()
        if (countryData?.success && Array.isArray(countryData.data)) {
          setCountryOptions(countryData.data as SelectRegion[])
        }
        
        // 대륙 옵션
        const continentRes = await fetch('/api/regions?page=1&pageSize=500&type=continent', { cache: 'no-store' })
        const continentData = await continentRes.json()
        if (continentData?.success && Array.isArray(continentData.data)) {
          setContinentOptions(continentData.data as SelectRegion[])
        }
        
        // 지역 옵션
        const regionRes = await fetch('/api/regions?page=1&pageSize=500&type=region', { cache: 'no-store' })
        const regionData = await regionRes.json()
        if (regionData?.success && Array.isArray(regionData.data)) {
          setRegionOptions(regionData.data as SelectRegion[])
        }
      } catch (error) {
        console.error('Failed to fetch options:', error)
      }
    }
    
    fetchOptions()
  }, [])

  useEffect(() => {
    let canceled = false
    const fetchByType = async () => {
      setLoading(true)
      setEditingRowId(null)
      setEditingData({})
      try {
        const res = await fetch(`/api/regions?page=1&pageSize=${pageSize}&type=${selectedType}`, { cache: 'no-store' })
        const data = await res.json()
        if (!canceled && data?.success && Array.isArray(data.data)) {
          const regionData = data.data as unknown as SelectRegion[]
          
          console.log('[RegionsManager] Fetched data sample:', regionData.slice(0, 3).map(r => ({
            id: r.id,
            status: r.status,
            city_ko: r.city_ko,
            city_sort_order: r.city_sort_order
          })))
          
          // API에서 이미 정렬되어 옴 (status → sort_order → id)
          // 중복 제거만 수행
          const uniqueData = regionData.reduce((acc: SelectRegion[], current) => {
            const isDuplicate = acc.some(item => 
              item.id === current.id && item.region_type === current.region_type
            )
            if (!isDuplicate) {
              acc.push(current)
            } else {
              console.warn(`[RegionsManager] Duplicate in fetched data: ${current.region_type}-${current.id}`)
            }
            return acc
          }, [])
          
          console.log('[RegionsManager] Final data (after dedup):', uniqueData.length, 'items')
          setItems(uniqueData)
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
  }, [selectedType, pageSize])
  
  // 상태 필터링된 아이템
  const filteredItems = useMemo(() => {
    console.log('[RegionsManager] === FILTER DEBUG START ===')
    console.log('[RegionsManager] Total items:', items.length)
    console.log('[RegionsManager] Status filter:', statusFilter)
    console.log('[RegionsManager] Sample items (first 10):', items.slice(0, 10).map(i => ({ 
      id: i.id, 
      status: i.status,
      city_ko: i.city_ko,
      country_ko: i.country_ko 
    })))
    
    // 필터링 (statusFilter가 'all'이면 모든 항목 포함)
    const filtered = statusFilter === 'all' 
      ? items 
      : items.filter(item => {
      if (statusFilter === 'active') {
            return item.status === 'active'
      } else if (statusFilter === 'inactive') {
            return item.status !== 'active'
      }
          return false
    })
    
    console.log('[RegionsManager] Filtered result:', filtered.length, 'items')
    console.log('[RegionsManager] Filtered items (first 5):', filtered.slice(0, 5).map(i => ({ 
      id: i.id, 
      status: i.status,
      city_ko: i.city_ko 
    })))
    
    // 중복 제거 (region_type + id 조합으로 고유성 보장) - 항상 수행
    const uniqueFiltered = filtered.reduce((acc: SelectRegion[], current) => {
      const isDuplicate = acc.some(item => 
        item.id === current.id && item.region_type === current.region_type
      )
      if (!isDuplicate) {
        acc.push(current)
      } else {
        console.warn(`[RegionsManager] Duplicate found and removed: ${current.region_type}-${current.id}`)
      }
      return acc
    }, [])
    
    console.log('[RegionsManager] After deduplication:', uniqueFiltered.length, 'items (removed', filtered.length - uniqueFiltered.length, 'duplicates)')
    console.log('[RegionsManager] === FILTER DEBUG END ===')
    
    return uniqueFiltered
  }, [items, statusFilter])

  // ✅ 썸네일 배치 로드 (filteredItems 변경 시)
  useEffect(() => {
    if (selectedType !== 'city') return
    
    // 캐시에 없는 항목만 필터링
    const itemsToLoad = filteredItems.filter(row => {
      const cacheKey = `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`
      return thumbnailCache[cacheKey] === undefined && !loadingThumbnails.has(cacheKey)
    })
    
    if (itemsToLoad.length === 0) {
      console.log('[RegionsManager] All thumbnails cached, skipping load')
      return
    }
    
    console.log(`[RegionsManager] Batch loading ${itemsToLoad.length} new thumbnails (total visible: ${filteredItems.length})`)
    
    // ✅ 50개씩 분할하여 배치 로드 (API 제한)
    const chunkSize = 50
    for (let i = 0; i < itemsToLoad.length; i += chunkSize) {
      const chunk = itemsToLoad.slice(i, i + chunkSize)
      loadThumbnailsBatch(chunk)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, selectedType])

  // 🐛 디버깅: 캐시 상태 추적
  useEffect(() => {
    console.log('[RegionsManager] thumbnailCache changed:', Object.keys(thumbnailCache).length, 'items')
  }, [thumbnailCache])

  useEffect(() => {
    console.log('[RegionsManager] loadingThumbnails changed:', loadingThumbnails.size, 'items')
  }, [loadingThumbnails])

  useEffect(() => {
    console.log('[RegionsManager] filteredItems changed:', filteredItems.length, 'items')
  }, [filteredItems])

  useEffect(() => {
    console.log('[RegionsManager] items changed:', items.length, 'items')
    
    // ✅ SANCASSIAN 레코드 찾기 (페이지 로드 시)
    const sancassianPatterns = ['SANCASSIAN', 'San Cassiano', 'san cassiano', 'SanCassiano', 'cassian']
    const sancassianItems = items.filter(item => 
      sancassianPatterns.some(pattern => {
        const code = String(item.city_code ?? '').toLowerCase()
        const en = String(item.city_en ?? '').toLowerCase()
        const ko = String(item.city_ko ?? '').toLowerCase()
        const p = String(pattern ?? '').toLowerCase()
        return code.includes(p) || en.includes(p) || ko.includes(p)
      })
    )
    
    if (sancassianItems.length > 0) {
      console.log('[RegionsManager] 🔍🔍🔍 SANCASSIAN records found:', sancassianItems.map(i => ({
        id: i.id,
        city_code: i.city_code,
        city_ko: i.city_ko,
        city_en: i.city_en,
        status: i.status,
        city_sort_order: i.city_sort_order,
        region_type: i.region_type
      })))
    } else {
      console.log('[RegionsManager] ⚠️ No SANCASSIAN records found in items')
    }
  }, [items])

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      console.log('[RegionsManager] ===== DRAG END DEBUG START =====')
      console.log('[RegionsManager] Drag ended:', { activeId: active.id, overId: over.id })
      
      // ID 형식이 "${region_type}-${id}"이므로 실제 ID 추출
      const extractId = (compositeId: string | number): number => {
        const id = String(compositeId).split('-').pop()
        return parseInt(id || '0')
      }
      
      const activeId = extractId(active.id)
      const overId = extractId(over.id)
      
      console.log('[RegionsManager] Extracted IDs:', { activeId, overId })
      
      let allUpdatedItems: SelectRegion[] = []
      
      setItems((items) => {
        // 현재 선택된 타입의 모든 아이템 가져오기
        const currentTypeItems = items.filter(item => item.region_type === selectedType)
        
        console.log(`[RegionsManager] Current type (${selectedType}) items count:`, currentTypeItems.length)
        
        // active와 inactive 분리
        const activeItems = currentTypeItems.filter(item => item.status === 'active')
        const inactiveItems = currentTypeItems.filter(item => item.status !== 'active')
        const otherTypeItems = items.filter(item => item.region_type !== selectedType)
        
        console.log(`[RegionsManager] Status split: ${activeItems.length} active, ${inactiveItems.length} inactive`)
        
        // 드래그된 아이템이 active인지 확인
        const draggedItem = currentTypeItems.find(item => item.id === activeId)
        const targetItem = currentTypeItems.find(item => item.id === overId)
        
        if (!draggedItem) {
          console.error(`[RegionsManager] ❌ Dragged item not found! ID: ${activeId}`)
          console.error('[RegionsManager] Available IDs in currentTypeItems:', currentTypeItems.map(i => i.id))
          return items
        }
        
        if (!targetItem) {
          console.error(`[RegionsManager] ❌ Target item not found! ID: ${overId}`)
          console.error('[RegionsManager] Available IDs in currentTypeItems:', currentTypeItems.map(i => i.id))
          return items
        }
        
        console.log('[RegionsManager] Dragged item:', { 
          id: draggedItem.id, 
          city_code: draggedItem.city_code, 
          city_ko: draggedItem.city_ko,
          city_en: draggedItem.city_en,
          status: draggedItem.status,
          city_sort_order: draggedItem.city_sort_order
        })
        console.log('[RegionsManager] Target item:', { 
          id: targetItem.id, 
          city_code: targetItem.city_code,
          city_ko: targetItem.city_ko,
          city_en: targetItem.city_en,
          status: targetItem.status,
          city_sort_order: targetItem.city_sort_order
        })
        
        // ✅ SANCASSIAN 특별 체크 (다양한 패턴 확인)
        const sancassianPatterns = ['SANCASSIAN', 'San Cassiano', 'san cassiano', 'SanCassiano']
        const isSancassianDragged = sancassianPatterns.some(pattern => 
          draggedItem.city_code?.includes(pattern) || 
          draggedItem.city_en?.includes(pattern) ||
          draggedItem.city_ko?.includes(pattern)
        )
        const isSancassianTarget = sancassianPatterns.some(pattern => 
          targetItem.city_code?.includes(pattern) || 
          targetItem.city_en?.includes(pattern) ||
          targetItem.city_ko?.includes(pattern)
        )
        
        if (isSancassianDragged) {
          console.log('[RegionsManager] 🔍🔍🔍 SANCASSIAN DETECTED as DRAGGED item!')
        }
        if (isSancassianTarget) {
          console.log('[RegionsManager] 🔍🔍🔍 SANCASSIAN DETECTED as TARGET item!')
        }
        
        const isActiveItem = draggedItem.status === 'active'
        const isTargetActive = targetItem.status === 'active'
        
        // ✅ 다른 status 그룹으로 드래그하는 경우 경고
        if (isActiveItem !== isTargetActive) {
          console.warn('[RegionsManager] ⚠️ Cannot move between active and inactive groups!')
          alert('active와 inactive 간에는 이동할 수 없습니다. 같은 상태의 레코드끼리만 순서를 변경할 수 있습니다.')
          return items
        }
        
        let reorderedActiveItems = activeItems
        let reorderedInactiveItems = inactiveItems
        
        if (isActiveItem) {
          // active 아이템 내에서 재정렬
          const oldIndex = activeItems.findIndex((item) => item.id === activeId)
          const newIndex = activeItems.findIndex((item) => item.id === overId)
          
          console.log('[RegionsManager] Active group reorder:', { oldIndex, newIndex })
          
          if (oldIndex === -1 || newIndex === -1) {
            console.error('[RegionsManager] ❌ Invalid index in active group:', { oldIndex, newIndex })
            return items
          }
          
          reorderedActiveItems = arrayMove(activeItems, oldIndex, newIndex)
        } else {
          // inactive 아이템 내에서 재정렬
          const oldIndex = inactiveItems.findIndex((item) => item.id === activeId)
          const newIndex = inactiveItems.findIndex((item) => item.id === overId)
          
          console.log('[RegionsManager] Inactive group reorder:', { oldIndex, newIndex })
          
          if (oldIndex === -1 || newIndex === -1) {
            console.error('[RegionsManager] ❌ Invalid index in inactive group:', { oldIndex, newIndex })
            return items
          }
          
          reorderedInactiveItems = arrayMove(inactiveItems, oldIndex, newIndex)
        }
        
        // 순서 부여: active는 1부터, inactive는 active 마지막 + 1부터
        const sortOrderKey = getSortOrderKey(selectedType)
        const activeCount = reorderedActiveItems.length
        
        const updatedActiveItems = reorderedActiveItems.map((item, index) => ({
          ...item,
          [sortOrderKey]: index + 1  // active: 1부터 시작
        }))
        
        const updatedInactiveItems = reorderedInactiveItems.map((item, index) => ({
          ...item,
          [sortOrderKey]: activeCount + index + 1  // inactive: active 마지막 + 1부터
        }))
        
        console.log(`[RegionsManager] Updated sort orders:`, {
          active: updatedActiveItems.slice(0, 3).map(i => ({ 
            id: i.id, 
            city_code: (i as any).city_code,
            status: i.status,
            [sortOrderKey]: i[sortOrderKey as keyof SelectRegion] 
          })),
          inactive: updatedInactiveItems.slice(0, 3).map(i => ({ 
            id: i.id,
            city_code: (i as any).city_code,
            status: i.status,
            [sortOrderKey]: i[sortOrderKey as keyof SelectRegion] 
          }))
        })
        
        // 전체 아이템 병합 (다른 타입 + 업데이트된 active + 업데이트된 inactive)
        allUpdatedItems = [...updatedActiveItems, ...updatedInactiveItems]
        const newItems = [...otherTypeItems, ...updatedActiveItems, ...updatedInactiveItems]
        
        // ✅ SANCASSIAN 레코드 확인
        const sancassianInUpdated = allUpdatedItems.find(i => (i as any).city_code === 'SANCASSIAN')
        if (sancassianInUpdated) {
          console.log('[RegionsManager] 🔍 SANCASSIAN in updated items:', {
            id: sancassianInUpdated.id,
            city_code: (sancassianInUpdated as any).city_code,
            city_sort_order: sancassianInUpdated.city_sort_order,
            status: sancassianInUpdated.status
          })
        }
        
        console.log('[RegionsManager] ===== DRAG END DEBUG END =====')
        
        return newItems
      })
      
      // 순서 자동 저장 (active와 inactive 모두)
      console.log('[RegionsManager] Auto-saving order after drag...')
      console.log('[RegionsManager] Items to save count:', allUpdatedItems.length)
      await handleAutoSaveOrder(allUpdatedItems)
    }
  }

  // 자동 순서 저장 (드래그 후)
  const handleAutoSaveOrder = async (itemsToSave: SelectRegion[]) => {
    setIsSavingOrder(true)
    let successCount = 0
    let errorCount = 0
    let notFoundCount = 0
    const notFoundIds: number[] = []

    // 이미 필터링된 아이템을 받으므로 추가 필터링 불필요
    const itemsToUpdate = itemsToSave

    console.log(`[RegionsManager] Auto-saving ${itemsToUpdate.length} items with 1-based sort order...`)
    
    // 첫 3개 아이템의 sort_order 로깅
    const sortOrderKey = getSortOrderKey(selectedType)
    console.log(`[RegionsManager] First 3 items sort orders:`, 
      itemsToUpdate.slice(0, 3).map(i => ({ 
        id: i.id, 
        [sortOrderKey]: i[sortOrderKey as keyof SelectRegion] 
      }))
    )

    for (const item of itemsToUpdate) {
      // ✅ SANCASSIAN 레코드 특별 로깅 (다양한 패턴 체크)
      const sancassianPatterns = ['SANCASSIAN', 'San Cassiano', 'san cassiano', 'SanCassiano', 'cassian']
      const isSancassian = sancassianPatterns.some(pattern => {
        const code = String(item.city_code ?? '').toLowerCase()
        const en = String(item.city_en ?? '').toLowerCase()
        const ko = String(item.city_ko ?? '').toLowerCase()
        const p = String(pattern ?? '').toLowerCase()
        return code.includes(p) || en.includes(p) || ko.includes(p)
      })
      
      const input: RegionFormInput & { id?: number } = {
        id: item.id,
        region_type: item.region_type,
        status: item.status,
        city_ko: item.city_ko,
        city_en: item.city_en,
        city_code: item.city_code,
        city_slug: item.city_slug,
        city_sort_order: item.city_sort_order,
        country_ko: item.country_ko,
        country_en: item.country_en,
        country_code: item.country_code,
        country_slug: item.country_slug,
        country_sort_order: item.country_sort_order,
        continent_ko: item.continent_ko,
        continent_en: item.continent_en,
        continent_code: item.continent_code,
        continent_slug: item.continent_slug,
        continent_sort_order: item.continent_sort_order,
        region_name_ko: item.region_name_ko,
        region_name_en: item.region_name_en,
        region_code: item.region_code,
        region_slug: item.region_slug,
        region_name_sort_order: item.region_name_sort_order,
      }

      if (isSancassian) {
        console.log('[RegionsManager] 🔍 SANCASSIAN save input:', {
          id: input.id,
          city_code: input.city_code,
          city_ko: input.city_ko,
          city_sort_order: input.city_sort_order,
          status: input.status
        })
      }

      const res = await upsertRegion(input)
      
      if (isSancassian) {
        console.log('[RegionsManager] 🔍 SANCASSIAN save result:', {
          success: res.success,
          error: res.error,
          data: res.data ? {
            id: res.data.id,
            city_code: res.data.city_code,
            city_sort_order: res.data.city_sort_order
          } : null
        })
      }
      
      if (res.success) {
        successCount++
      } else {
        // 레코드를 찾을 수 없는 경우는 별도로 카운트
        if (res.error && res.error.includes('해당하는 레코드를 찾을 수 없습니다')) {
          notFoundCount++
          notFoundIds.push(item.id)
          console.warn(`[RegionsManager] Record not found (skipping): ID ${item.id}, city_code: ${item.city_code}`)
        } else {
          errorCount++
          console.error(`[RegionsManager] Failed to save order for item ${item.id} (${item.city_code}):`, res.error)
        }
      }
    }

    setIsSavingOrder(false)
    console.log(`[RegionsManager] Auto-save complete: ${successCount} success, ${errorCount} errors, ${notFoundCount} not found`)
    
    // 레코드를 찾을 수 없는 경우가 있으면 데이터를 새로고침하여 동기화
    if (notFoundCount > 0) {
      console.log(`[RegionsManager] Refreshing data due to ${notFoundCount} missing records (IDs: ${notFoundIds.join(', ')})`)
      await refreshData()
    }
    
    // 성공/실패 피드백 (토스트 알림처럼)
    if (errorCount === 0 && notFoundCount === 0) {
      console.log(`✅ 순서가 자동 저장되었습니다 (${successCount}개)`)
    } else if (notFoundCount > 0) {
      console.warn(`⚠️ 순서 저장 완료: ${successCount}개 성공, ${notFoundCount}개 스킵됨 (레코드 없음)`)
      if (errorCount > 0) {
        console.error(`❌ ${errorCount}개 저장 실패`)
      }
    } else {
      console.warn(`⚠️ 순서 저장 완료: ${successCount}개 성공, ${errorCount}개 실패`)
    }
  }

  // 타입별 sort_order 키 가져오기
  const getSortOrderKey = (type: RegionType): string => {
    switch (type) {
      case 'city': return 'city_sort_order'
      case 'country': return 'country_sort_order'
      case 'continent': return 'continent_sort_order'
      case 'region': return 'region_name_sort_order'
    }
  }

  // handleSaveOrder 함수 제거됨 (드래그 앤 드롭 자동 저장으로 대체)

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

  const handleImageManage = (row: SelectRegion) => {
    setImageModalCity({
      cityKo: row.city_ko,
      cityEn: row.city_en,
      cityCode: row.city_code ?? null,
      citySlug: row.city_code ?? null  // city_slug 컬럼이 없으므로 city_code 사용
    })
    setShowImageModal(true)
  }

  const handleSaveRow = async (row: SelectRegion) => {
    if (!confirm('현재 레코드 정보를 저장하시겠습니까?')) return
    
    // ✅ 안전 체크: row.id가 없으면 저장 중단
    if (!row.id || typeof row.id !== 'number') {
      console.error('[handleSaveRow] ERROR: Invalid row.id:', row.id)
      alert('⚠️ 레코드 ID가 유효하지 않습니다.')
      return
    }
    
    setLoading(true)
    
    // ✅ 편집 중인 row라면 editingData의 값을 병합
    const isEditing = editingRowId === row.id
    const mergedData = isEditing ? { ...row, ...editingData } : row
    
    console.log('[handleSaveRow] ===== SAVE ROW DEBUG =====')
    console.log('[handleSaveRow] row.id:', row.id, 'type:', typeof row.id)
    console.log('[handleSaveRow] isEditing:', isEditing)
    console.log('[handleSaveRow] editingData:', editingData)
    console.log('[handleSaveRow] mergedData.id:', mergedData.id)
    console.log('[handleSaveRow] mergedData.status:', mergedData.status)
    console.log('[handleSaveRow] ===============================')
    
    const input: RegionFormInput & { id?: number } = {
      id: row.id, // ✅ row.id를 직접 사용 (병합된 데이터 ID가 아닌 원본 row.id)
      region_type: mergedData.region_type,
      status: mergedData.status, // ✅ 자동 'active' 제거
      city_ko: mergedData.city_ko,
      city_en: mergedData.city_en,
      city_code: mergedData.city_code,
      city_slug: mergedData.city_slug,
      city_sort_order: mergedData.city_sort_order,
      country_ko: mergedData.country_ko,
      country_en: mergedData.country_en,
      country_code: mergedData.country_code,
      country_slug: mergedData.country_slug,
      country_sort_order: mergedData.country_sort_order,
      continent_ko: mergedData.continent_ko,
      continent_en: mergedData.continent_en,
      continent_code: mergedData.continent_code,
      continent_slug: mergedData.continent_slug,
      continent_sort_order: mergedData.continent_sort_order,
      region_name_ko: mergedData.region_name_ko,
      region_name_en: mergedData.region_name_en,
      region_code: mergedData.region_code,
      region_slug: mergedData.region_slug,
      region_name_sort_order: mergedData.region_name_sort_order,
    }

    console.log('[handleSaveRow] Saving with input.id:', input.id, 'status:', input.status)

    const res = await upsertRegion(input)
    setLoading(false)

    if (res.success) {
      // ✅ 저장 성공 시 편집 모드 해제
      if (isEditing) {
        setEditingRowId(null)
        setEditingData({})
      }
      await refreshData()
      alert('저장되었습니다.')
    } else {
      alert(res.error || '저장 실패')
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

    // city 타입 필수 필드 검증
    if (editingData.region_type === 'city') {
      if (!editingData.city_ko && !editingData.city_en) {
        alert('도시명(한글 또는 영문)을 입력해주세요.')
        return
      }
    }

    // country 타입 필수 필드 검증
    if (editingData.region_type === 'country') {
      if (!editingData.country_ko && !editingData.country_en) {
        alert('국가명(한글 또는 영문)을 입력해주세요.')
        return
      }
    }

    // continent 타입 필수 필드 검증
    if (editingData.region_type === 'continent') {
      if (!editingData.continent_ko && !editingData.continent_en) {
        alert('대륙명(한글 또는 영문)을 입력해주세요.')
        return
      }
    }

    // region 타입 필수 필드 검증
    if (editingData.region_type === 'region') {
      if (!editingData.region_name_ko && !editingData.region_name_en) {
        alert('지역명(한글 또는 영문)을 입력해주세요.')
        return
      }
    }

    setLoading(true)
    
    // ✅ ID 명확하게 결정 (editingData.id 또는 editingRowId)
    let targetId: number | undefined = undefined
    
    if (editingRowId !== 'new' && typeof editingRowId === 'number') {
      targetId = editingRowId
    } else if (typeof editingData.id === 'number') {
      targetId = editingData.id
    }
    
    // ✅ 안전장치: ID가 없으면 저장 중단 (신규 생성 제외)
    if (editingRowId !== 'new' && !targetId) {
      console.error('[RegionsManager] ERROR: No valid ID found!')
      console.error('[RegionsManager] editingRowId:', editingRowId)
      console.error('[RegionsManager] editingData.id:', editingData.id)
      alert('⚠️ 레코드 ID를 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.')
      setLoading(false)
      return
    }
    
    const input: RegionFormInput & { id?: number } = {
      id: targetId, // ✅ ID 먼저 설정
      region_type: editingData.region_type,
      status: editingData.status, // ✅ 자동 'active' 제거
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

    console.log('[RegionsManager] ===== SAVE EDIT DEBUG =====')
    console.log('[RegionsManager] editingRowId:', editingRowId, 'type:', typeof editingRowId)
    console.log('[RegionsManager] editingData.id:', editingData.id, 'type:', typeof editingData.id)
    console.log('[RegionsManager] targetId:', targetId, 'type:', typeof targetId)
    console.log('[RegionsManager] Saving with input.id:', input.id)
    console.log('[RegionsManager] input.status:', input.status)
    console.log('[RegionsManager] Full input:', input)
    console.log('[RegionsManager] =============================')
    
    if (input.region_type === 'city') {
      console.log('[RegionsManager] City fields:', {
        city_ko: input.city_ko,
        city_en: input.city_en,
        city_code: input.city_code,
        country_ko: input.country_ko,
        country_en: input.country_en,
        country_code: input.country_code,
        continent_ko: input.continent_ko,
        continent_en: input.continent_en,
        continent_code: input.continent_code,
        region_name_ko: input.region_name_ko,
        region_name_en: input.region_name_en,
        region_code: input.region_code
      })
    }

    const res = await upsertRegion(input)
      setLoading(false)

    if (res.success) {
      console.log('[RegionsManager] Save successful:', res.data)
          await refreshData()
      setEditingRowId(null)
      setEditingData({})
      alert('저장되었습니다.')
        } else {
      console.error('[RegionsManager] Save failed:', res.error)
      alert(res.error || '저장 실패')
    }
  }

  const handleMapToHotels = async (row: SelectRegion) => {
    console.log('[RegionsManager] === OPENING MAP MODAL ===')
    console.log('[RegionsManager] Selected row:', {
      id: row.id,
      region_type: row.region_type,
      city_code: row.city_code,
      city_ko: row.city_ko,
      city_en: row.city_en,
      country_code: row.country_code,
      country_ko: row.country_ko,
      country_en: row.country_en
    })
    
    // 명시적으로 새 객체로 복사하여 상태 업데이트
    setSelectedRegion({ ...row })
    setShowMapModal(true)
    setSelectedHotels(new Set())
  }
  
  const handleCloseMapModal = () => {
    console.log('[RegionsManager] === CLOSING MAP MODAL ===')
    console.log('[RegionsManager] Clearing selectedRegion and selectedHotels')
    setShowMapModal(false)
    setSelectedRegion(null)
    setSelectedHotels(new Set())
  }

  const refreshData = async () => {
    try {
      const typeParam = selectedType === 'city' || selectedType === 'country' || selectedType === 'continent' || selectedType === 'region' ? `&type=${selectedType}` : ''
      const response = await fetch(`/api/regions?page=1&pageSize=${pageSize}${typeParam}`, { cache: 'no-store' })
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        const regionData = data.data as SelectRegion[]
        
        // 중복 제거
        const uniqueData = regionData.reduce((acc: SelectRegion[], current) => {
          const isDuplicate = acc.some(item => 
            item.id === current.id && item.region_type === current.region_type
          )
          if (!isDuplicate) {
            acc.push(current)
          } else {
            console.warn(`[RegionsManager] Duplicate in refreshData: ${current.region_type}-${current.id}`)
          }
          return acc
        }, [])
        
        // ✅ active와 inactive를 분리하여 정렬
        // active는 sort_order 순으로, inactive는 그 다음에 배치
        const activeItems = uniqueData.filter(item => item.status === 'active')
        const inactiveItems = uniqueData.filter(item => item.status !== 'active')
        
        // 타입별 sort_order로 정렬
        const sortOrderKey = getSortOrderKey(selectedType)
        activeItems.sort((a, b) => {
          const aOrder = (a[sortOrderKey as keyof SelectRegion] as number) || 0
          const bOrder = (b[sortOrderKey as keyof SelectRegion] as number) || 0
          return aOrder - bOrder
        })
        inactiveItems.sort((a, b) => {
          const aOrder = (a[sortOrderKey as keyof SelectRegion] as number) || 0
          const bOrder = (b[sortOrderKey as keyof SelectRegion] as number) || 0
          return aOrder - bOrder
        })
        
        const sortedData = [...activeItems, ...inactiveItems]
        
        console.log(`[RegionsManager] Loaded data: ${activeItems.length} active, ${inactiveItems.length} inactive`)
        
        // ✅ 기존 items와 비교하여 실제로 변경된 경우에만 업데이트
        const hasChanged = JSON.stringify(items) !== JSON.stringify(sortedData)
        if (hasChanged) {
          console.log('[RegionsManager] Data changed, updating items')
          setItems(sortedData)
        } else {
          console.log('[RegionsManager] Data unchanged, skipping update')
        }
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

    console.log('[RegionsManager] === SAVE MAPPING DEBUG START ===')
    console.log('[RegionsManager] Selected Region:', selectedRegion)
    console.log('[RegionsManager] Selected Hotels:', Array.from(selectedHotels))

    if (!confirm(`선택한 ${selectedHotels.size}개 호텔에 지역 정보를 매핑하시겠습니까?`)) return

    setLoading(true)
    
    const updateData: Record<string, string | null> = {}
    
    if (selectedRegion.region_type === 'city') {
      // 도시 정보 매핑
      updateData.city_code = selectedRegion.city_code ?? null
      updateData.city_ko = selectedRegion.city_ko ?? null
      updateData.city_en = selectedRegion.city_en ?? null
      
      // 도시 매핑 시 상위 지역(국가, 대륙, 지역)도 함께 매핑
      updateData.country_code = selectedRegion.country_code ?? null
      updateData.country_ko = selectedRegion.country_ko ?? null
      updateData.country_en = selectedRegion.country_en ?? null
      
      updateData.continent_code = selectedRegion.continent_code ?? null
      updateData.continent_ko = selectedRegion.continent_ko ?? null
      updateData.continent_en = selectedRegion.continent_en ?? null
      
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
      
      console.log('[RegionsManager] City mapping - updateData:', updateData)
    } else if (selectedRegion.region_type === 'country') {
      // 국가 정보 매핑
      updateData.country_code = selectedRegion.country_code ?? null
      updateData.country_ko = selectedRegion.country_ko ?? null
      updateData.country_en = selectedRegion.country_en ?? null
      
      // 국가 매핑 시 상위 지역(대륙, 지역)도 함께 매핑
      updateData.continent_code = selectedRegion.continent_code ?? null
      updateData.continent_ko = selectedRegion.continent_ko ?? null
      updateData.continent_en = selectedRegion.continent_en ?? null
      
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
      
      console.log('[RegionsManager] Country mapping - updateData:', updateData)
    } else if (selectedRegion.region_type === 'continent') {
      // 대륙 정보 매핑
      updateData.continent_code = selectedRegion.continent_code ?? null
      updateData.continent_ko = selectedRegion.continent_ko ?? null
      updateData.continent_en = selectedRegion.continent_en ?? null
      
      // 대륙 매핑 시 지역 정보도 함께 매핑
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
      
      console.log('[RegionsManager] Continent mapping - updateData:', updateData)
    } else if (selectedRegion.region_type === 'region') {
      // 지역 정보 매핑
      updateData.region_code = selectedRegion.region_code ?? null
      updateData.region_ko = selectedRegion.region_name_ko ?? null
      updateData.region_en = selectedRegion.region_name_en ?? null
      
      console.log('[RegionsManager] Region mapping - updateData:', updateData)
    }
    
    console.log('[RegionsManager] Final updateData to be sent:', updateData)

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
        console.log(`[RegionsManager] Updating hotel ${sabreId} with:`, updateData)
        
        const response = await fetch('/api/hotel/update-region-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sabre_id: sabreId,
            update_data: updateData
          })
        })
        
        const result = await response.json()
        console.log(`[RegionsManager] Result for ${sabreId}:`, result)
        
        if (result.success) {
          updated++
        } else {
          errors.push(`${sabreId}: ${result.error}`)
        }
      }

      setLoading(false)
      
      console.log('[RegionsManager] Mapping complete. Refreshing data...')
      await refreshData()
      
      // 모달 닫고 상태 초기화
      setShowMapModal(false)
      setSelectedRegion(null)
      setSelectedHotels(new Set())
      
      console.log('[RegionsManager] === SAVE MAPPING DEBUG END ===')
      
      if (errors.length > 0) {
        alert(`호텔 매핑 완료: ${updated}/${selectedHotels.size}개 성공\n\n오류:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n... 외 ${errors.length - 3}건` : ''}`)
      } else {
        alert(`호텔 매핑 완료: ${updated}/${selectedHotels.size}개 호텔 업데이트됨`)
      }
    } catch (error) {
      console.error('[RegionsManager] Mapping error:', error)
      setLoading(false)
      setShowMapModal(false)
      setSelectedRegion(null)
      setSelectedHotels(new Set())
      alert('호텔 매핑 중 오류가 발생했습니다.')
    }
  }

  const handleRowClick = async (row: SelectRegion) => {
    if (editingRowId) return // 편집 중이면 클릭 무시
    
    let code: string | null = null
    let nameKo: string | null = null
    let nameEn: string | null = null
    let codeType: 'city' | 'country' | 'continent' | 'region' | null = null
    let title = ''
    
    if (row.region_type === 'city') {
      code = (row.city_code ?? null) as string | null
      nameKo = (row.city_ko ?? null) as string | null
      nameEn = (row.city_en ?? null) as string | null
      codeType = 'city'
      const displayName = row.city_ko || row.city_en || '이름없음'
      const displayCode = code ? ` (${code})` : ''
      title = `도시 "${displayName}"${displayCode} 매핑된 호텔`
    } else if (row.region_type === 'country') {
      code = (row.country_code ?? null) as string | null
      nameKo = (row.country_ko ?? null) as string | null
      nameEn = (row.country_en ?? null) as string | null
      codeType = 'country'
      const displayName = row.country_ko || row.country_en || '이름없음'
      const displayCode = code ? ` (${code})` : ''
      title = `국가 "${displayName}"${displayCode} 매핑된 호텔`
    } else if (row.region_type === 'continent') {
      code = (row.continent_code ?? null) as string | null
      nameKo = (row.continent_ko ?? null) as string | null
      nameEn = (row.continent_en ?? null) as string | null
      codeType = 'continent'
      const displayName = row.continent_ko || row.continent_en || '이름없음'
      const displayCode = code ? ` (${code})` : ''
      title = `대륙 "${displayName}"${displayCode} 매핑된 호텔`
    } else if (row.region_type === 'region') {
      code = (row.region_code ?? null) as string | null
      nameKo = (row.region_name_ko ?? null) as string | null
      nameEn = (row.region_name_en ?? null) as string | null
      codeType = 'region'
      const displayName = row.region_name_ko || row.region_name_en || '이름없음'
      const displayCode = code ? ` (${code})` : ''
      title = `지역 "${displayName}"${displayCode} 매핑된 호텔`
    }
    
    if (!codeType) {
      alert('잘못된 지역 타입입니다.')
      return
    }
    
    // 코드 또는 이름이 있어야 조회 가능
    if (!code && !nameKo && !nameEn) {
      alert('이 레코드에는 코드나 이름이 없습니다.')
      return
    }
    
    setLoading(true)
    const res = await getMappedHotels(code, codeType, nameKo, nameEn)
    setLoading(false)
    
    if (res.success && res.data) {
      setMappedHotels(res.data.hotels)
      setModalTitle(title)
      setShowHotelModal(true)
    } else {
      alert(res.error || '호텔 조회 실패')
    }
  }

  // 국가(한) 직접 입력 시 매칭되는 레코드 자동 선택
  const handleCountryKoInput = (value: string) => {
    setEditingData(prev => ({ ...prev, country_ko: value }))
    const matchedCountry = countryOptions.find(c => c.country_ko === value)
    if (matchedCountry) {
      setEditingData(prev => ({
        ...prev,
        country_ko: matchedCountry.country_ko,
        country_en: matchedCountry.country_en,
        country_code: matchedCountry.country_code,
      }))
    }
  }

  const handleCountrySelect = (countryId: string) => {
    const country = countryOptions.find(c => String(c.id) === countryId)
    if (country) {
      setEditingData(prev => ({
        ...prev,
        country_code: country.country_code,
        country_ko: country.country_ko,
        country_en: country.country_en,
      }))
    }
  }

  // 대륙(한) 직접 입력 시 매칭되는 레코드 자동 선택
  const handleContinentKoInput = (value: string) => {
    setEditingData(prev => ({ ...prev, continent_ko: value }))
    const matchedContinent = continentOptions.find(c => c.continent_ko === value)
    if (matchedContinent) {
      setEditingData(prev => ({
        ...prev,
        continent_ko: matchedContinent.continent_ko,
        continent_en: matchedContinent.continent_en,
        continent_code: matchedContinent.continent_code,
      }))
    }
  }

  const handleContinentSelect = (continentId: string) => {
    const continent = continentOptions.find(c => String(c.id) === continentId)
    if (continent) {
      setEditingData(prev => ({
        ...prev,
        continent_code: continent.continent_code,
        continent_ko: continent.continent_ko,
        continent_en: continent.continent_en,
      }))
    }
  }

  // 지역(한) 직접 입력 시 매칭되는 레코드 자동 선택
  const handleRegionKoInput = (value: string) => {
    setEditingData(prev => ({ ...prev, region_name_ko: value }))
    const matchedRegion = regionOptions.find(r => r.region_name_ko === value)
    if (matchedRegion) {
      setEditingData(prev => ({
        ...prev,
        region_name_ko: matchedRegion.region_name_ko,
        region_name_en: matchedRegion.region_name_en,
        region_code: matchedRegion.region_code,
      }))
    }
  }

  const handleRegionSelect = (regionId: string) => {
    const region = regionOptions.find(r => String(r.id) === regionId)
    if (region) {
      setEditingData(prev => ({
        ...prev,
        region_code: region.region_code,
        region_name_ko: region.region_name_ko,
        region_name_en: region.region_name_en,
      }))
    }
  }

  const renderCell = (row: SelectRegion, columnKey: string, isParent?: boolean) => {
    const isEditing = editingRowId === row.id
    const value = (row as any)[columnKey]

    if (!isEditing) {
      if (columnKey === 'thumbnail') {
        // 썸네일은 city 타입일 때만 표시
        // 고유한 캐시 키 생성 (region_type-id 조합으로 완전히 고유하게)
        const cacheKey = `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`
        const thumbnailUrl = thumbnailCache[cacheKey]
        const isLoading = loadingThumbnails.has(cacheKey)
        
        return (
          <div 
            className="relative w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
            onClick={() => {
              setImageModalCity({
                cityKo: row.city_ko,
                cityEn: row.city_en,
                cityCode: row.city_code ?? null,
                citySlug: row.city_code ?? null
              })
              setShowImageModal(true)
            }}
            title="클릭하여 이미지 관리"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
            ) : thumbnailUrl ? (
              <Image 
                src={thumbnailUrl} 
                alt={row.city_ko || row.city_en || ''} 
                fill
                sizes="64px"
                className="object-cover"
                loading="lazy"
                unoptimized={thumbnailUrl.includes('supabase')}
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>
        )
      }
      if (columnKey === 'status') {
        // ✅ 스위치 UI로 표시 (일반 모드에서도 바로 토글 가능)
        const isActive = value === 'active'
        return (
          <button
            onClick={async (e) => {
              e.stopPropagation()
              
              // ✅ 안전 체크: row.id가 없으면 실행 중단
              if (!row.id || typeof row.id !== 'number') {
                console.error('[Status Toggle] ERROR: Invalid row.id:', row.id)
                alert('⚠️ 레코드 ID가 유효하지 않습니다.')
                return
              }
              
              const newStatus = isActive ? 'inactive' : 'active'
              console.log('[Status Toggle] ===== STATUS TOGGLE DEBUG =====')
              console.log('[Status Toggle] Row ID:', row.id, 'Type:', typeof row.id)
              console.log('[Status Toggle] From:', value, 'To:', newStatus)
              console.log('[Status Toggle] row.region_type:', row.region_type)
              console.log('[Status Toggle] ===================================')
              
              // 즉시 상태 업데이트
              if (!confirm(`상태를 ${isActive ? '비활성' : '활성'}으로 변경하시겠습니까?`)) return
              
              // ✅ 먼저 로컬 상태 즉시 업데이트
              setItems(prev => prev.map(item => 
                item.id === row.id && item.region_type === row.region_type
                  ? { ...item, status: newStatus }
                  : item
              ))
              
              setLoading(true)
              const input: RegionFormInput & { id?: number } = {
                id: row.id, // ✅ row.id 직접 사용
                region_type: row.region_type,
                status: newStatus,
                city_ko: row.city_ko,
                city_en: row.city_en,
                city_code: row.city_code,
                city_slug: row.city_slug,
                city_sort_order: row.city_sort_order,
                country_ko: row.country_ko,
                country_en: row.country_en,
                country_code: row.country_code,
                country_slug: row.country_slug,
                country_sort_order: row.country_sort_order,
                continent_ko: row.continent_ko,
                continent_en: row.continent_en,
                continent_code: row.continent_code,
                continent_slug: row.continent_slug,
                continent_sort_order: row.continent_sort_order,
                region_name_ko: row.region_name_ko,
                region_name_en: row.region_name_en,
                region_code: row.region_code,
                region_slug: row.region_slug,
                region_name_sort_order: row.region_name_sort_order,
              }
              
              console.log('[Status Toggle] Saving with payload:', input)
              const res = await upsertRegion(input)
              
              if (res.success) {
                console.log('[Status Toggle] Save success!')
                // ✅ refreshData 대신 성공 메시지만 표시 (이미 로컬 상태 업데이트됨)
                alert(`상태가 ${newStatus === 'active' ? '활성' : '비활성'}으로 변경되었습니다.`)
              } else {
                console.error('[Status Toggle] Save failed:', res.error)
                alert(res.error || '상태 변경 실패')
                // ✅ 실패 시 원래 상태로 롤백
                setItems(prev => prev.map(item => 
                  item.id === row.id && item.region_type === row.region_type
                    ? { ...item, status: value }
                    : item
                ))
              }
              setLoading(false)
            }}
            disabled={loading}
            className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: isActive ? '#10b981' : '#d1d5db' }}
            title={`클릭하여 ${isActive ? '비활성' : '활성'}으로 변경`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        )
      }
      // 상위 지역 필드는 회색으로 표시
      if (isParent && value) {
        return <span className="text-xs text-gray-600">{value}</span>
      }
      return <span className="text-sm">{value ?? '-'}</span>
    }

    // 편집 모드
    if (columnKey === 'id' || columnKey === 'region_type' || columnKey === 'thumbnail') {
      // ✅ thumbnail은 편집 모드에서도 동일하게 표시 (읽기 전용)
      if (columnKey === 'thumbnail') {
        const cacheKey = `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`
        const thumbnailUrl = thumbnailCache[cacheKey]
        const isLoading = loadingThumbnails.has(cacheKey)
        
        return (
          <div 
            className="relative w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden"
            onClick={(e) => {
              e.stopPropagation() // 편집 모드에서도 클릭 가능
              setImageModalCity({
                cityKo: row.city_ko,
                cityEn: row.city_en,
                cityCode: row.city_code ?? null,
                citySlug: row.city_code ?? null
              })
              setShowImageModal(true)
            }}
            title="클릭하여 이미지 관리"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
            ) : thumbnailUrl ? (
              <Image 
                src={thumbnailUrl} 
                alt={row.city_ko || row.city_en || ''} 
                fill
                sizes="64px"
                className="object-cover"
                loading="lazy"
                unoptimized={thumbnailUrl.includes('supabase')}
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>
        )
      }
      return <span className="text-gray-500">{value ?? '-'}</span>
    }

    if (columnKey === 'status') {
      // ✅ 편집 모드에서도 스위치 UI 사용
      const currentStatus = editingData.status ?? row.status ?? 'active'
      const isActive = currentStatus === 'active'
      
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const newStatus = isActive ? 'inactive' : 'active'
            console.log('[Status Edit] From:', currentStatus, 'To:', newStatus)
            setEditingData(prev => ({ ...prev, status: newStatus }))
          }}
          className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          style={{ backgroundColor: isActive ? '#10b981' : '#d1d5db' }}
          title={`클릭하여 ${isActive ? '비활성' : '활성'}으로 변경`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      )
    }

    if (columnKey.includes('sort_order')) {
      return (
        <input
          type="number"
          value={String((editingData as any)[columnKey] ?? '')}
          onChange={(e) => {
            const val = e.target.value === '' ? null : parseInt(e.target.value)
            // smallint 범위 제한: -32768 ~ 32767
            if (val !== null && (val < -32768 || val > 32767)) {
              return // 범위 초과 시 무시
            }
            setEditingData(prev => ({ ...prev, [columnKey]: val }))
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="순서"
          min="0"
          max="32767"
          title="0 ~ 32767 범위 내 숫자만 입력 가능"
        />
      )
    }

    // 국가 관련 필드
    // country 타입에서는 자기 자신의 필드이므로 텍스트 입력, 다른 타입에서는 콤보박스
    if (columnKey === 'country_ko') {
      if (selectedType === 'country') {
        // country 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.country_ko ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, country_ko: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentCountry = countryOptions.find(c => 
        c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
      )
      return (
        <select
          value={currentCountry ? String(currentCountry.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
            } else {
              handleCountrySelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {countryOptions.map(country => (
            <option key={country.id} value={country.id}>
              {country.country_ko || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'country_en') {
      if (selectedType === 'country') {
        // country 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.country_en ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, country_en: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentCountry = countryOptions.find(c => 
        c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
      )
      return (
        <select
          value={currentCountry ? String(currentCountry.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
            } else {
              handleCountrySelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {countryOptions.map(country => (
            <option key={country.id} value={country.id}>
              {country.country_en || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'country_code') {
      if (selectedType === 'country') {
        // country 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.country_code ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            maxLength={3}
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentCountry = countryOptions.find(c => 
        c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
      )
      return (
        <select
          value={currentCountry ? String(currentCountry.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
            } else {
              handleCountrySelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {countryOptions.map(country => (
            <option key={country.id} value={country.id}>
              {country.country_code || '(코드 없음)'}
            </option>
          ))}
        </select>
      )
    }

    // 대륙 관련 필드
    // continent 타입에서는 자기 자신의 필드이므로 텍스트 입력, 다른 타입에서는 콤보박스
    if (columnKey === 'continent_ko') {
      if (selectedType === 'continent') {
        // continent 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.continent_ko ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, continent_ko: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentContinent = continentOptions.find(c => 
        c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
      )
      return (
        <select
          value={currentContinent ? String(currentContinent.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
            } else {
              handleContinentSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {continentOptions.map(continent => (
            <option key={continent.id} value={continent.id}>
              {continent.continent_ko || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'continent_en') {
      if (selectedType === 'continent') {
        // continent 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.continent_en ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, continent_en: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentContinent = continentOptions.find(c => 
        c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
      )
      return (
        <select
          value={currentContinent ? String(currentContinent.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
            } else {
              handleContinentSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {continentOptions.map(continent => (
            <option key={continent.id} value={continent.id}>
              {continent.continent_en || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'continent_code') {
      if (selectedType === 'continent') {
        // continent 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.continent_code ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, continent_code: e.target.value.toUpperCase() }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            maxLength={3}
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentContinent = continentOptions.find(c => 
        c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
      )
      return (
        <select
          value={currentContinent ? String(currentContinent.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
            } else {
              handleContinentSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {continentOptions.map(continent => (
            <option key={continent.id} value={continent.id}>
              {continent.continent_code || '(코드 없음)'}
            </option>
          ))}
        </select>
      )
    }

    // 지역 관련 필드
    // region 타입에서는 자기 자신의 필드이므로 텍스트 입력, 다른 타입에서는 콤보박스
    if (columnKey === 'region_name_ko') {
      if (selectedType === 'region') {
        // region 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.region_name_ko ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, region_name_ko: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentRegion = regionOptions.find(r => 
        r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
      )
      return (
        <select
          value={currentRegion ? String(currentRegion.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
            } else {
              handleRegionSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {regionOptions.map(region => (
            <option key={region.id} value={region.id}>
              {region.region_name_ko || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'region_name_en') {
      if (selectedType === 'region') {
        // region 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.region_name_en ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, region_name_en: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentRegion = regionOptions.find(r => 
        r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
      )
      return (
        <select
          value={currentRegion ? String(currentRegion.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
            } else {
              handleRegionSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {regionOptions.map(region => (
            <option key={region.id} value={region.id}>
              {region.region_name_en || '(이름 없음)'}
            </option>
          ))}
        </select>
      )
    }

    if (columnKey === 'region_code') {
      if (selectedType === 'region') {
        // region 타입: 텍스트 입력
        return (
          <input
            type="text"
            value={String(editingData.region_code ?? '')}
            onChange={(e) => setEditingData(prev => ({ ...prev, region_code: e.target.value.toUpperCase() }))}
            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
        )
      }
      // 다른 타입: 콤보박스
      const currentRegion = regionOptions.find(r => 
        r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
      )
      return (
        <select
          value={currentRegion ? String(currentRegion.id) : ''}
          onChange={(e) => {
            if (!e.target.value) {
              setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
            } else {
              handleRegionSelect(e.target.value)
            }
          }}
          className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
        >
          <option value="">선택</option>
          {regionOptions.map(region => (
            <option key={region.id} value={region.id}>
              {region.region_code || '(코드 없음)'}
            </option>
          ))}
        </select>
      )
    }

    // 기타 일반 필드
    const isParentField = isParent || columnKey.startsWith('country_') || columnKey.startsWith('continent_') || columnKey.startsWith('region_')
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
        {/* 드래그 핸들 (신규 행에는 비활성화) */}
        <td className="border p-2 text-center">
          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
        </td>
        <td className="border p-2">
          <span className="text-xs text-gray-500">NEW</span>
        </td>
        <td className="border p-2">
          <span className="text-xs text-gray-500">{selectedType}</span>
        </td>
        {columns.slice(2).map((col) => {
          const isParentField = (col as any).isParent
          const bgClass = isParentField ? 'bg-blue-50' : ''
          const columnKey = col.key
          
          return (
            <td key={col.key} className={`border p-2 ${isParentField ? 'bg-gray-50' : ''}`}>
              {columnKey === 'status' ? (
                <select
                  value={String(editingData.status ?? 'active')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, status: e.target.value as RegionStatus }))}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
              ) : columnKey.includes('sort_order') ? (
                <input
                  type="number"
                  value={String((editingData as any)[columnKey] ?? '')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={col.label}
                />
              ) : columnKey === 'country_ko' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_ko || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'country_en' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_en || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'country_code' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder={col.label}
                    maxLength={3}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_code || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'country_ko' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_ko || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'country_en' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_en || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'country_code' ? (
                selectedType === 'country' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder={col.label}
                    maxLength={3}
                  />
                ) : (
                  <select
                    value={countryOptions.find(c => 
                      c.country_ko === editingData.country_ko && c.country_en === editingData.country_en && c.country_code === editingData.country_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, country_ko: null, country_en: null, country_code: null }))
                      } else {
                        handleCountrySelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {countryOptions.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.country_code || '-'}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'continent_ko' ? (
                selectedType === 'continent' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={continentOptions.find(c => 
                      c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
                      } else {
                        handleContinentSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {continentOptions.filter(c => c.continent_ko).map(continent => (
                      <option key={continent.id} value={continent.id}>
                        {continent.continent_ko}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'continent_en' ? (
                selectedType === 'continent' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={continentOptions.find(c => 
                      c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
                      } else {
                        handleContinentSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {continentOptions.filter(c => c.continent_en).map(continent => (
                      <option key={continent.id} value={continent.id}>
                        {continent.continent_en}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'continent_code' ? (
                selectedType === 'continent' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder={col.label}
                    maxLength={3}
                  />
                ) : (
                  <select
                    value={continentOptions.find(c => 
                      c.continent_ko === editingData.continent_ko && c.continent_en === editingData.continent_en && c.continent_code === editingData.continent_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, continent_ko: null, continent_en: null, continent_code: null }))
                      } else {
                        handleContinentSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {continentOptions.filter(c => c.continent_code).map(continent => (
                      <option key={continent.id} value={continent.id}>
                        {continent.continent_code}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'region_name_ko' ? (
                selectedType === 'region' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={regionOptions.find(r => 
                      r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
                      } else {
                        handleRegionSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {regionOptions.filter(r => r.region_name_ko).map(region => (
                      <option key={region.id} value={region.id}>
                        {region.region_name_ko}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'region_name_en' ? (
                selectedType === 'region' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={regionOptions.find(r => 
                      r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
                      } else {
                        handleRegionSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {regionOptions.filter(r => r.region_name_en).map(region => (
                      <option key={region.id} value={region.id}>
                        {region.region_name_en}
                      </option>
                    ))}
                  </select>
                )
              ) : columnKey === 'region_code' ? (
                selectedType === 'region' ? (
                  <input
                    type="text"
                    value={String((editingData as any)[columnKey] ?? '')}
                    onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    placeholder={col.label}
                  />
                ) : (
                  <select
                    value={regionOptions.find(r => 
                      r.region_name_ko === editingData.region_name_ko && r.region_name_en === editingData.region_name_en && r.region_code === editingData.region_code
                    )?.id || ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setEditingData(prev => ({ ...prev, region_name_ko: null, region_name_en: null, region_code: null }))
                      } else {
                        handleRegionSelect(e.target.value)
                      }
                    }}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    <option value="">선택</option>
                    {regionOptions.filter(r => r.region_code).map(region => (
                      <option key={region.id} value={region.id}>
                        {region.region_code}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <input
                  type="text"
                  value={String((editingData as any)[columnKey] ?? '')}
                  onChange={(e) => setEditingData(prev => ({ ...prev, [columnKey]: e.target.value }))}
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

        <label className="text-sm text-gray-600 ml-4">상태:</label>
        <select
          className="border rounded px-2 py-1 text-sm font-medium"
          value={statusFilter}
          onChange={(e) => {
            const newFilter = e.target.value as 'all' | 'active' | 'inactive'
            console.log('[RegionsManager] Status filter changed:', statusFilter, '→', newFilter)
            setStatusFilter(newFilter)
          }}
          disabled={loading || editingRowId !== null}
        >
          <option value="all">전체 (All)</option>
          <option value="active">✓ 활성 (Active)</option>
          <option value="inactive">✗ 비활성 (Inactive)</option>
        </select>

        <label className="text-sm text-gray-600 ml-4">표시 개수:</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          disabled={loading || editingRowId !== null}
        >
          <option value="50">50개</option>
          <option value="100">100개</option>
          <option value="200">200개</option>
          <option value="500">500개</option>
          <option value="1000">1000개</option>
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
                if (!confirm('모든 지역 타입의 호텔 코드를 일괄 업데이트하시겠습니까?\n\n• 코드/한글명/영문명 중 하나라도 일치하는 호텔을 찾아 업데이트합니다.\n• city, country, continent, region 모든 타입을 처리합니다.\n• 계층적 지역 정보도 함께 업데이트됩니다.\n\n시간이 다소 걸릴 수 있습니다.')) return
                
                setLoading(true)
                const res = await bulkUpdateHotelRegionCodes()
                setLoading(false)
                
                if (res.success && res.data) {
                  await refreshData()
                  const { updated, total, errors, details } = res.data
                  
                  const detailsText = details ? `\n\n타입별 업데이트:\n• City: ${details.city || 0}개\n• Country: ${details.country || 0}개\n• Continent: ${details.continent || 0}개\n• Region: ${details.region || 0}개` : ''
                  
                  let message = `맵핑 호텔 코드 일괄 업데이트 완료! ✅\n\n`
                  message += `총 ${total}개 지역 처리\n`
                  message += `${updated}개 호텔 업데이트 완료`
                  message += detailsText
                  
                  if (errors && errors.length > 0) {
                    message += `\n\n오류 ${errors.length}건:\n${errors.slice(0, 3).join('\n')}`
                    if (errors.length > 3) {
                      message += `\n... 외 ${errors.length - 3}건`
                    }
                  }
                  alert(message)
                } else {
                  alert(res.error || '일괄 업데이트 실패')
                }
              }} 
              className="ml-2 bg-purple-600 hover:bg-purple-700"
              disabled={editingRowId !== null || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1">진행 중...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="ml-1">🔄 맵핑 호텔 코드 일괄 업데이트</span>
                </>
              )}
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="border p-2 text-center font-medium text-gray-700" style={{ width: '40px' }}>
                    <GripVertical className="h-4 w-4 text-gray-400 mx-auto" />
                  </th>
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
              <SortableContext
                items={filteredItems.map(item => `${item.region_type}-${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
              {renderNewRow()}
              {loading && filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="p-8 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    로딩 중...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="p-8 text-center text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((row) => {
                  const isEditing = editingRowId === row.id
                  
                  // 편집 모드일 때는 일반 tr, 아니면 SortableRow
                  if (isEditing) {
                    return (
                      <tr 
                        key={`${row.region_type}-${row.id}`} 
                        className="bg-blue-50 border-2 border-blue-400"
                      >
                        {/* 드래그 핸들 (편집 중에는 비활성화) */}
                        <td className="border p-2 text-center">
                          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
                        </td>
                        {columns.map((col) => (
                          <td key={col.key} className={`border p-2 ${(col as any).isParent ? 'bg-gray-50' : ''}`}>
                            {renderCell(row, col.key, (col as any).isParent)}
                          </td>
                        ))}
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
                    <SortableRow
                      key={`${row.region_type}-${row.id}`}
                      row={row}
                      isEditing={isEditing}
        columns={columns}
                      selectedType={selectedType}
                      editingRowId={editingRowId}
                      renderCell={renderCell}
        onRowClick={handleRowClick}
                      onMapToHotels={handleMapToHotels}
                      onEdit={handleEdit}
                      onSaveRow={handleSaveRow}
                      onDelete={handleDelete}
                      onImageManage={handleImageManage}
                      loading={loading}
                    />
                  )
                })
              )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
        <div className="p-3 border-t bg-gray-50 text-sm text-gray-600 flex justify-between items-center">
          <span>
            표시 중: {filteredItems.length}개 항목
            {statusFilter !== 'all' && ` (${statusFilter === 'active' ? '활성' : '비활성'})`}
            {items.length !== filteredItems.length && ` / 전체 ${items.length}개`}
            {items.length >= pageSize && (
              <span className="ml-2 text-orange-600 font-medium">
                (최대 {pageSize}개까지 표시됨 - 더 보려면 표시 개수 늘리기)
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500">
            행을 클릭하면 매핑된 호텔을 확인할 수 있습니다.
          </span>
        </div>
      </div>

      {/* 호텔 매핑 모달 (검색 및 선택) */}
      {showMapModal && selectedRegion && (
        <div className="fixed inset-0 flex items-center justify-center z-50" onClick={handleCloseMapModal}>
          <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-blue-50">
              <div>
                <h2 className="text-xl font-bold text-blue-900">호텔 매핑</h2>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedRegion.region_type === 'city' && `도시: ${selectedRegion.city_ko || selectedRegion.city_en} (${selectedRegion.city_code || '코드없음'})`}
                  {selectedRegion.region_type === 'country' && `국가: ${selectedRegion.country_ko || selectedRegion.country_en} (${selectedRegion.country_code || '코드없음'})`}
                  {selectedRegion.region_type === 'continent' && `대륙: ${selectedRegion.continent_ko || selectedRegion.continent_en} (${selectedRegion.continent_code || '코드없음'})`}
                  {selectedRegion.region_type === 'region' && `지역: ${selectedRegion.region_name_ko || selectedRegion.region_name_en} (${selectedRegion.region_code || '코드없음'})`}
                </p>
              </div>
              <button onClick={handleCloseMapModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>
            
            <HotelSearchSelector
              selectedHotels={selectedHotels}
              onSelectionChange={setSelectedHotels}
              multiple={true}
            />

            <div className="p-4 border-t bg-gray-50 flex justify-end items-center gap-2">
              <Button onClick={handleCloseMapModal} variant="outline">
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

      {/* 도시 이미지 관리 모달 */}
      {showImageModal && imageModalCity && (
        <CityImageManagerModal
          isOpen={showImageModal}
        onClose={() => {
            setShowImageModal(false)
            setImageModalCity(null)
          }}
          onImageChanged={() => {
            // ✅ 이미지 변경 시 즉시 썸네일 새로고침
            if (imageModalCity?.cityCode) {
              console.log(`[RegionsManager] Image changed for city: ${imageModalCity.cityCode}`)
              
              // 1. 캐시 및 로딩 상태 제거
              setThumbnailCache(prev => {
                const newCache = { ...prev }
                Object.keys(newCache).forEach(key => {
                  if (key.includes(imageModalCity.cityCode!)) {
                    delete newCache[key]
                    console.log(`[RegionsManager] Removed cache key: ${key}`)
                  }
                })
                return newCache
              })
              
              setLoadingThumbnails(prev => {
                const newSet = new Set(prev)
                Array.from(newSet).forEach(key => {
                  if (key.includes(imageModalCity.cityCode!)) {
                    newSet.delete(key)
                    console.log(`[RegionsManager] Removed loading key: ${key}`)
                  }
                })
                return newSet
              })
              
              // 2. 즉시 새로운 썸네일 로드 (강제 새로고침)
              setTimeout(() => {
                // items 상태에서 직접 찾기
                const cityItems = items.filter(item => 
                  item.region_type === 'city' && (
                    item.city_code === imageModalCity.cityCode || 
                    item.city_ko === imageModalCity.cityKo ||
                    item.city_en === imageModalCity.cityEn
                  )
                )
                
                console.log(`[RegionsManager] Force reloading ${cityItems.length} thumbnails for ${imageModalCity.cityCode}`)
                
                if (cityItems.length === 0) {
                  console.warn(`[RegionsManager] No city items found for ${imageModalCity.cityCode}`)
                }
                
                // ✅ 해당 도시의 썸네일 캐시를 초기화하고 다시 로드
                cityItems.forEach(row => {
                  const cacheKey = `${row.region_type}-${row.id}-${row.city_code || row.city_ko || row.city_en || 'none'}`
                  console.log(`[RegionsManager] Force reloading thumbnail for: ${cacheKey}`)
                  
                  // 캐시 삭제
                  setThumbnailCache(prev => {
                    const newCache = { ...prev }
                    delete newCache[cacheKey]
                    return newCache
                  })
                })
                
                // 배치로 다시 로드
                loadThumbnailsBatch(cityItems)
              }, 100) // 최소한의 지연만 적용
            }
          }}
          cityKo={imageModalCity.cityKo}
          cityEn={imageModalCity.cityEn}
          cityCode={imageModalCity.cityCode}
          citySlug={imageModalCity.citySlug}
        />
      )}
    </div>
  )
}
