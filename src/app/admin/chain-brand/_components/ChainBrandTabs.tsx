'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, X, Trash2, Link2, Edit, GripVertical, PlusCircle, List, ChevronUp, ChevronDown } from 'lucide-react'
import { saveChain, createChain, saveBrand, createBrand, updateChainSortOrder, updateBrandSortOrder, deleteChain, deleteBrand } from '@/features/chain-brand/actions'
import ConnectedHotelsModal from './ConnectedHotelsModal'
import { slugify } from '@/lib/format'
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
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

export type Chain = {
  chain_id: number
  name_kr: string | null
  name_en: string | null
  chain_slug: string | null
  chain_sort_order?: number | null
  status?: string | null
  rate_plan_code?: string | null
}

export type Brand = {
  brand_id: number
  name_kr: string | null
  name_en: string | null
  brand_slug: string | null
  chain_id: number | null
  brand_sort_order?: number | null
  status?: string | null
}

type TabType = 'brands' | 'chains'

interface Props {
  initialChains: Chain[]
  initialBrands: Brand[]
}

type EditingBrand = Brand & { isNew?: boolean }
type EditingChain = Chain & { isNew?: boolean }

// 정렬 함수
function sortBrands(brands: Brand[]): Brand[] {
  return [...brands].sort((a, b) => {
    // 1순위: sort_order (오름차순, null은 맨 뒤)
    if (a.brand_sort_order != null && b.brand_sort_order == null) return -1
    if (a.brand_sort_order == null && b.brand_sort_order != null) return 1
    if (a.brand_sort_order != null && b.brand_sort_order != null) {
      if (a.brand_sort_order !== b.brand_sort_order) {
        return a.brand_sort_order - b.brand_sort_order
      }
    }
    // 2순위: brand_id (최신순)
    return b.brand_id - a.brand_id
  })
}

function sortChains(chains: Chain[]): Chain[] {
  return [...chains].sort((a, b) => {
    // 1순위: sort_order (오름차순, null은 맨 뒤)
    if (a.chain_sort_order != null && b.chain_sort_order == null) return -1
    if (a.chain_sort_order == null && b.chain_sort_order != null) return 1
    if (a.chain_sort_order != null && b.chain_sort_order != null) {
      if (a.chain_sort_order !== b.chain_sort_order) {
        return a.chain_sort_order - b.chain_sort_order
      }
    }
    // 2순위: chain_id (최신순)
    return b.chain_id - a.chain_id
  })
}

// Sortable Brand Row
function SortableBrandRow({
  brand,
  chains,
  isEditing,
  editingData,
  onEdit,
  onSave,
  onDelete,
  onConnect,
  onViewConnected,
  onFieldChange,
  onSaveEdit,
  onCancelEdit,
  isRecentlyUpdated
}: {
  brand: Brand
  chains: Chain[]
  isEditing: boolean
  editingData: Partial<EditingBrand>
  onEdit: () => void
  onSave: () => void
  onDelete: () => void
  onConnect: () => void
  onViewConnected: () => void
  onFieldChange: (field: string, value: string | number | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isRecentlyUpdated?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: brand.brand_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : (isRecentlyUpdated ? 'background-color 3s ease-out' : transition),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#f0f9ff' : (isRecentlyUpdated ? '#fef3c7' : undefined),
  }

  if (isEditing) {
    return (
      <tr ref={setNodeRef} style={style} className="bg-blue-50 border-2 border-blue-400">
        <td className="border p-2 text-center">
          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
        </td>
        <td className="border p-2">
          <input
            type="number"
            value={String(editingData.brand_sort_order ?? '')}
            onChange={(e) => onFieldChange('brand_sort_order', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="순서"
            min="0"
            max="32767"
          />
        </td>
        <td className="border p-2 text-center text-sm font-mono text-gray-600 bg-gray-50">
          {brand.brand_id}
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.name_kr ?? '')}
            onChange={(e) => onFieldChange('name_kr', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="브랜드(한글)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.name_en ?? '')}
            onChange={(e) => {
              const newValue = e.target.value
              onFieldChange('name_en', newValue)
              // 자동으로 brand_slug 생성
              if (newValue) {
                onFieldChange('brand_slug', slugify(newValue))
              }
            }}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="브랜드(영문)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.brand_slug ?? '')}
            onChange={(e) => onFieldChange('brand_slug', e.target.value)}
            onFocus={(e) => {
              // 포커스 시 값이 비어있다면 브랜드(영문)으로부터 자동 생성
              if (!e.target.value && editingData.name_en) {
                onFieldChange('brand_slug', slugify(String(editingData.name_en)))
              }
            }}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="brand-slug (포커스 시 자동 생성)"
          />
        </td>
        <td className="border p-2">
          <select
            value={String(editingData.chain_id ?? '')}
            onChange={(e) => onFieldChange('chain_id', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="">선택</option>
            {chains.map((c, idx) => (
              <option key={`chain-option-${c.chain_id}-${idx}`} value={c.chain_id}>
                {c.name_kr || c.name_en || `ID: ${c.chain_id}`}
              </option>
            ))}
          </select>
        </td>
        <td className="border p-2">
          <select
            value={String(editingData.status ?? 'active')}
            onChange={(e) => onFieldChange('status', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </td>
        <td className="border p-2">
          <div className="flex gap-1">
            <Button onClick={onSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="h-3 w-3" />
            </Button>
            <Button onClick={onCancelEdit} size="sm" variant="outline">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-t hover:bg-gray-50">
      <td className="border p-2 text-center" style={{ width: '40px' }}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-200 rounded p-1">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </td>
      <td className="border p-2 text-center text-sm">{brand.brand_sort_order ?? '-'}</td>
      <td className="border p-2 text-center text-sm font-mono text-gray-700">{brand.brand_id}</td>
      <td className="border p-2 text-sm">{brand.name_kr || '-'}</td>
      <td className="border p-2 text-sm">{brand.name_en || '-'}</td>
      <td className="border p-2 text-sm font-mono text-gray-700">{brand.brand_slug || '-'}</td>
      <td className="border p-2 text-sm">
        {chains.find(c => c.chain_id === brand.chain_id)?.name_kr || '-'}
      </td>
      <td className="border p-2 text-center">
        <span className={`px-2 py-1 rounded text-xs font-medium ${brand.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {brand.status === 'active' ? '활성' : '비활성'}
        </span>
      </td>
      <td className="border p-2">
        <div className="flex gap-1 flex-wrap">
          <Button onClick={onEdit} size="sm" variant="outline" title="수정">
            <Edit className="h-3 w-3" />
          </Button>
          <Button onClick={onViewConnected} size="sm" variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-100" title="연결된 호텔 보기">
            <List className="h-3 w-3" />
          </Button>
          <Button onClick={onConnect} size="sm" variant="outline" className="bg-orange-50 text-orange-600 hover:bg-orange-100" title="호텔 연결">
            <Link2 className="h-3 w-3" />
          </Button>
          <Button onClick={onSave} size="sm" variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100" title="저장">
            <Save className="h-3 w-3" />
          </Button>
          <Button onClick={onDelete} size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" title="삭제">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// Sortable Chain Row
function SortableChainRow({
  chain,
  isEditing,
  editingData,
  onEdit,
  onSave,
  onDelete,
  onConnect,
  onViewConnected,
  onFieldChange,
  onSaveEdit,
  onCancelEdit,
  onRatePlanCodeSave,
  savingRatePlanCodeChainId,
  isRecentlyUpdated
}: {
  chain: Chain
  isEditing: boolean
  editingData: Partial<EditingChain>
  onEdit: () => void
  onSave: () => void
  onDelete: () => void
  onConnect: () => void
  onViewConnected: () => void
  onFieldChange: (field: string, value: string | number | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  isRecentlyUpdated?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chain.chain_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : (isRecentlyUpdated ? 'background-color 3s ease-out' : transition),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? '#f0f9ff' : (isRecentlyUpdated ? '#fef3c7' : undefined),
  }

  if (isEditing) {
    return (
      <tr ref={setNodeRef} style={style} className="bg-blue-50 border-2 border-blue-400">
        <td className="border p-2 text-center">
          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
        </td>
        <td className="border p-2">
          <input
            type="number"
            value={String(editingData.chain_sort_order ?? '')}
            onChange={(e) => onFieldChange('chain_sort_order', e.target.value === '' ? null : parseInt(e.target.value))}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="순서"
            min="0"
            max="32767"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.name_kr ?? '')}
            onChange={(e) => onFieldChange('name_kr', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="체인(한글)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.name_en ?? '')}
            onChange={(e) => onFieldChange('name_en', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="체인(영문)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.chain_slug ?? '')}
            onChange={(e) => onFieldChange('chain_slug', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="chain-slug"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingData.rate_plan_code ?? '')}
            onChange={(e) => onFieldChange('rate_plan_code', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="API,ZP3 (쉼표 구분)"
          />
        </td>
        <td className="border p-2">
          <select
            value={String(editingData.status ?? 'active')}
            onChange={(e) => onFieldChange('status', e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </td>
        <td className="border p-2">
          <div className="flex gap-1">
            <Button onClick={onSaveEdit} size="sm" className="bg-green-600 hover:bg-green-700">
              <Save className="h-3 w-3" />
            </Button>
            <Button onClick={onCancelEdit} size="sm" variant="outline">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-t hover:bg-gray-50">
      <td className="border p-2 text-center" style={{ width: '40px' }}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing inline-flex items-center justify-center hover:bg-gray-200 rounded p-1">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </td>
      <td className="border p-2 text-center text-sm">{chain.chain_sort_order ?? '-'}</td>
      <td className="border p-2 text-sm">{chain.name_kr || '-'}</td>
      <td className="border p-2 text-sm">{chain.name_en || '-'}</td>
      <td className="border p-2 text-sm font-mono text-gray-700">{chain.chain_slug || '-'}</td>
      <td className="border p-2 text-sm font-mono text-gray-700">{chain.rate_plan_code || '-'}</td>
      <td className="border p-2 text-center">
        <span className={`px-2 py-1 rounded text-xs font-medium ${chain.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {chain.status === 'active' ? '활성' : '비활성'}
        </span>
      </td>
      <td className="border p-2">
        <div className="flex gap-1 flex-wrap">
          <Button onClick={onEdit} size="sm" variant="outline" title="수정">
            <Edit className="h-3 w-3" />
          </Button>
          <Button onClick={onViewConnected} size="sm" variant="outline" className="bg-blue-50 text-blue-600 hover:bg-blue-100" title="연결된 호텔 보기">
            <List className="h-3 w-3" />
          </Button>
          <Button onClick={onConnect} size="sm" variant="outline" className="bg-orange-50 text-orange-600 hover:bg-orange-100" title="호텔 연결">
            <Link2 className="h-3 w-3" />
          </Button>
          <Button onClick={onSave} size="sm" variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100" title="저장">
            <Save className="h-3 w-3" />
          </Button>
          <Button onClick={onDelete} size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" title="삭제">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function ChainBrandTabs({ initialChains, initialBrands }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('chains')
  
  // 중복 제거 후 초기화
  const uniqueChains = initialChains.reduce((acc: Chain[], current) => {
    const isDuplicate = acc.some(item => item.chain_id === current.chain_id)
    if (!isDuplicate) {
      acc.push(current)
    } else {
      console.warn(`[ChainBrandTabs] Duplicate chain removed: ${current.chain_id}`)
    }
    return acc
  }, [])
  
  const uniqueBrands = initialBrands.reduce((acc: Brand[], current) => {
    const isDuplicate = acc.some(item => item.brand_id === current.brand_id)
    if (!isDuplicate) {
      acc.push(current)
    } else {
      console.warn(`[ChainBrandTabs] Duplicate brand removed: ${current.brand_id}`)
    }
    return acc
  }, [])
  
  const [chains, setChains] = useState<Chain[]>(sortChains(uniqueChains))
  const [brands, setBrands] = useState<Brand[]>(sortBrands(uniqueBrands))
  const [loading, setLoading] = useState(false)
  const [editingBrandId, setEditingBrandId] = useState<number | 'new' | null>(null)
  const [editingChainId, setEditingChainId] = useState<number | 'new' | null>(null)
  const [editingBrandData, setEditingBrandData] = useState<Partial<EditingBrand>>({})
  const [editingChainData, setEditingChainData] = useState<Partial<EditingChain>>({})
  const [showHotelModal, setShowHotelModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Brand | Chain | null>(null)
  const [recentlyUpdatedBrandId, setRecentlyUpdatedBrandId] = useState<number | null>(null)
  const [recentlyUpdatedChainId, setRecentlyUpdatedChainId] = useState<number | null>(null)
  const [showConnectedHotelsModal, setShowConnectedHotelsModal] = useState(false)
  const [connectedHotelsItem, setConnectedHotelsItem] = useState<{
    type: 'brand' | 'chain'
    id: number
    name: string
  } | null>(null)
  
  // 정렬 상태
  const [brandSortField, setBrandSortField] = useState<'chain' | 'status' | null>(null)
  const [brandSortDirection, setBrandSortDirection] = useState<'asc' | 'desc'>('asc')
  const [chainSortField, setChainSortField] = useState<'status' | null>(null)
  const [chainSortDirection, setChainSortDirection] = useState<'asc' | 'desc'>('asc')

  // 드래그앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 브랜드 드래그 종료
  const handleBrandDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      let updatedBrands: Brand[] = []
      setBrands((items) => {
        const oldIndex = items.findIndex((item) => item.brand_id === active.id)
        const newIndex = items.findIndex((item) => item.brand_id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        updatedBrands = newItems.map((item, index) => ({
          ...item,
          brand_sort_order: index + 1
        }))
        return sortBrands(updatedBrands)
      })
      await autoSaveBrandOrder(updatedBrands)
    }
  }

  // 체인 드래그 종료
  const handleChainDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      let updatedChains: Chain[] = []
      setChains((items) => {
        const oldIndex = items.findIndex((item) => item.chain_id === active.id)
        const newIndex = items.findIndex((item) => item.chain_id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        updatedChains = newItems.map((item, index) => ({
          ...item,
          chain_sort_order: index + 1
        }))
        return sortChains(updatedChains)
      })
      await autoSaveChainOrder(updatedChains)
    }
  }

  // 자동 브랜드 순서 저장
  const autoSaveBrandOrder = async (brandsToSave: Brand[]) => {
    setLoading(true)
    for (const brand of brandsToSave) {
      if (brand.brand_sort_order != null) {
        await updateBrandSortOrder(brand.brand_id, brand.brand_sort_order)
      }
    }
    setLoading(false)
    console.log('✅ 브랜드 순서가 저장되었습니다.')
  }

  // 자동 체인 순서 저장
  const autoSaveChainOrder = async (chainsToSave: Chain[]) => {
    setLoading(true)
    for (const chain of chainsToSave) {
      if (chain.chain_sort_order != null) {
        await updateChainSortOrder(chain.chain_id, chain.chain_sort_order)
      }
    }
    setLoading(false)
    console.log('✅ 체인 순서가 저장되었습니다.')
  }

  // 브랜드 정렬 핸들러
  const handleBrandSort = (field: 'chain' | 'status') => {
    if (brandSortField === field) {
      setBrandSortDirection(brandSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setBrandSortField(field)
      setBrandSortDirection('asc')
    }
  }

  // 체인 정렬 핸들러
  const handleChainSort = (field: 'status') => {
    if (chainSortField === field) {
      setChainSortDirection(chainSortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setChainSortField(field)
      setChainSortDirection('asc')
    }
  }

  // 정렬된 브랜드 목록
  const sortedBrands = React.useMemo(() => {
    let sorted = [...brands]
    
    if (brandSortField === 'chain') {
      sorted.sort((a, b) => {
        const aChainName = chains.find(c => c.chain_id === a.chain_id)?.name_kr || chains.find(c => c.chain_id === a.chain_id)?.name_en || ''
        const bChainName = chains.find(c => c.chain_id === b.chain_id)?.name_kr || chains.find(c => c.chain_id === b.chain_id)?.name_en || ''
        
        // null/빈 값 처리: null은 맨 뒤로
        if (!aChainName && !bChainName) return 0
        if (!aChainName) return 1
        if (!bChainName) return -1
        
        const comparison = aChainName.localeCompare(bChainName, 'ko', { numeric: true })
        return brandSortDirection === 'asc' ? comparison : -comparison
      })
      return sorted
    } else if (brandSortField === 'status') {
      sorted.sort((a, b) => {
        const aStatus = a.status || ''
        const bStatus = b.status || ''
        
        // null/빈 값 처리: null은 맨 뒤로
        if (!aStatus && !bStatus) return 0
        if (!aStatus) return 1
        if (!bStatus) return -1
        
        const comparison = aStatus.localeCompare(bStatus, 'ko', { numeric: true })
        return brandSortDirection === 'asc' ? comparison : -comparison
      })
      return sorted
    }
    
    // 정렬 필드가 없을 때만 기본 정렬 적용
    return sortBrands(sorted)
  }, [brands, chains, brandSortField, brandSortDirection])

  // 정렬된 체인 목록
  const sortedChains = React.useMemo(() => {
    let sorted = [...chains]
    
    if (chainSortField === 'status') {
      sorted.sort((a, b) => {
        const aStatus = a.status || ''
        const bStatus = b.status || ''
        
        // null/빈 값 처리: null은 맨 뒤로
        if (!aStatus && !bStatus) return 0
        if (!aStatus) return 1
        if (!bStatus) return -1
        
        const comparison = aStatus.localeCompare(bStatus, 'ko', { numeric: true })
        return chainSortDirection === 'asc' ? comparison : -comparison
      })
      return sorted
    }
    
    // 정렬 필드가 없을 때만 기본 정렬 적용
    return sortChains(sorted)
  }, [chains, chainSortField, chainSortDirection])

  // 브랜드 수정 시작
  const handleEditBrand = (brand: Brand) => {
    setEditingBrandId(brand.brand_id)
    setEditingBrandData({ ...brand })
  }

  // 체인 수정 시작
  const handleEditChain = (chain: Chain) => {
    setEditingChainId(chain.chain_id)
    setEditingChainData({ ...chain })
  }

  // 브랜드 저장 (개별 행 저장 버튼)
  const handleSaveBrand = async (brand: Brand) => {
    if (!confirm('현재 브랜드를 저장하시겠습니까?')) return
    setLoading(true)
    const fd = new FormData()
    fd.append('brand_id', String(brand.brand_id))
    fd.append('chain_id', String(brand.chain_id ?? ''))
    fd.append('name_kr', String(brand.name_kr ?? ''))
    fd.append('name_en', String(brand.name_en ?? ''))
    fd.append('brand_slug', String(brand.brand_slug ?? ''))
    fd.append('status', String(brand.status ?? 'active'))
    
    console.log('[ChainBrandTabs] Saving brand with FormData:', {
      brand_id: fd.get('brand_id'),
      chain_id: fd.get('chain_id'),
      name_kr: fd.get('name_kr'),
      name_en: fd.get('name_en'),
      brand_slug: fd.get('brand_slug'),
      status: fd.get('status')
    })
    
    const res = await saveBrand(fd)
    setLoading(false)
    if (res.success && res.data) {
      console.log('[ChainBrandTabs] Brand save success, returned data:', res.data)
      
      // DB에서 반환된 실제 데이터로 로컬 상태 업데이트
      const updatedBrand: Brand = {
        brand_id: res.data.brand_id || brand.brand_id,
        name_kr: res.data.name_kr ?? brand.name_kr,
        name_en: res.data.name_en ?? brand.name_en,
        brand_slug: res.data.brand_slug ?? brand.brand_slug,
        chain_id: res.data.chain_id ?? brand.chain_id,
        brand_sort_order: res.data.brand_sort_order ?? brand.brand_sort_order,
        status: res.data.status ?? brand.status
      }
      
      setBrands(prev => sortBrands(prev.map(b => 
        b.brand_id === brand.brand_id ? updatedBrand : b
      )))
      
      // 하이라이트 효과
      setRecentlyUpdatedBrandId(brand.brand_id)
      setTimeout(() => setRecentlyUpdatedBrandId(null), 3000)
      
      alert('저장되었습니다.')
    } else {
      console.error('[ChainBrandTabs] Brand save failed:', res.error)
      alert(res.error || '저장 실패')
    }
  }

  // 체인 저장 (개별 행 저장 버튼)
  const handleSaveChain = async (chain: Chain) => {
    if (!confirm('현재 체인을 저장하시겠습니까?')) return
    setLoading(true)
    const fd = new FormData()
    fd.append('chain_id', String(chain.chain_id))
    fd.append('name_kr', String(chain.name_kr ?? ''))
    fd.append('name_en', String(chain.name_en ?? ''))
    fd.append('chain_slug', String(chain.chain_slug ?? ''))
    fd.append('status', String(chain.status ?? 'active'))
    fd.append('rate_plan_code', String(chain.rate_plan_code ?? ''))

    console.log('[ChainBrandTabs] Saving chain with FormData:', {
      chain_id: fd.get('chain_id'),
      name_kr: fd.get('name_kr'),
      name_en: fd.get('name_en'),
      chain_slug: fd.get('chain_slug'),
      status: fd.get('status'),
      rate_plan_code: fd.get('rate_plan_code')
    })

    const res = await saveChain(fd)
    setLoading(false)
    if (res.success && res.data) {
      console.log('[ChainBrandTabs] Chain save success, returned data:', res.data)

      // DB에서 반환된 실제 데이터로 로컬 상태 업데이트
      const updatedChain: Chain = {
        chain_id: res.data.chain_id || chain.chain_id,
        name_kr: res.data.name_kr ?? chain.name_kr,
        name_en: res.data.name_en ?? chain.name_en,
        chain_slug: res.data.chain_slug ?? chain.chain_slug,
        chain_sort_order: res.data.chain_sort_order ?? chain.chain_sort_order,
        status: res.data.status ?? chain.status,
        rate_plan_code: res.data.rate_plan_code ?? chain.rate_plan_code
      }
      
      setChains(prev => sortChains(prev.map(c => 
        c.chain_id === chain.chain_id ? updatedChain : c
      )))
      
      // 하이라이트 효과
      setRecentlyUpdatedChainId(chain.chain_id)
      setTimeout(() => setRecentlyUpdatedChainId(null), 3000)
      
      alert('저장되었습니다.')
    } else {
      console.error('[ChainBrandTabs] Chain save failed:', res.error)
      alert(res.error || '저장 실패')
    }
  }

  // 브랜드 편집 저장 (인라인 편집 모드에서 저장 버튼)
  const handleSaveBrandEdit = async () => {
    if (!editingBrandData.name_kr && !editingBrandData.name_en) {
      alert('브랜드(한글) 또는 브랜드(영문) 중 하나는 입력해야 합니다.')
      return
    }
    setLoading(true)
    const fd = new FormData()
    if (editingBrandId !== 'new') {
      fd.append('brand_id', String(editingBrandId))
    }
    fd.append('chain_id', String(editingBrandData.chain_id ?? ''))
    fd.append('name_kr', String(editingBrandData.name_kr ?? ''))
    fd.append('name_en', String(editingBrandData.name_en ?? ''))
    fd.append('brand_slug', String(editingBrandData.brand_slug ?? ''))
    fd.append('status', String(editingBrandData.status ?? 'active'))

    const res = editingBrandId === 'new' ? await createBrand(fd) : await saveBrand(fd)
    setLoading(false)

    if (res.success && res.data) {
      const savedBrandId = editingBrandId === 'new' ? (res.data.brand_id || 0) : (editingBrandId as number)
      
      setEditingBrandId(null)
      setEditingBrandData({})
      
      if (editingBrandId === 'new') {
        // 신규 생성: DB에서 반환된 실제 데이터로 추가
        const newBrand: Brand = {
          brand_id: res.data.brand_id || 0,
          name_kr: res.data.name_kr ?? null,
          name_en: res.data.name_en ?? null,
          brand_slug: res.data.brand_slug ?? null,
          chain_id: res.data.chain_id ?? null,
          brand_sort_order: res.data.brand_sort_order ?? null,
          status: res.data.status ?? 'active'
        }
        setBrands(prev => sortBrands([...prev, newBrand]))
      } else {
        // 수정: DB에서 반환된 실제 데이터로 업데이트
        const updatedBrand: Brand = {
          brand_id: res.data.brand_id || (editingBrandId as number),
          name_kr: res.data.name_kr ?? null,
          name_en: res.data.name_en ?? null,
          brand_slug: res.data.brand_slug ?? null,
          chain_id: res.data.chain_id ?? null,
          brand_sort_order: res.data.brand_sort_order ?? null,
          status: res.data.status ?? 'active'
        }
        setBrands(prev => sortBrands(prev.map(b =>
          b.brand_id === editingBrandId ? updatedBrand : b
        )))
      }
      
      // 하이라이트 효과
      setRecentlyUpdatedBrandId(savedBrandId)
      setTimeout(() => setRecentlyUpdatedBrandId(null), 3000)
      
      alert('저장되었습니다.')
    } else {
      alert(res.error || '저장 실패')
    }
  }

  // 체인 편집 저장 (인라인 편집 모드에서 저장 버튼)
  const handleSaveChainEdit = async () => {
    if (!editingChainData.name_kr && !editingChainData.name_en) {
      alert('체인(한글) 또는 체인(영문) 중 하나는 입력해야 합니다.')
      return
    }
    setLoading(true)
    const fd = new FormData()
    if (editingChainId !== 'new') {
      fd.append('chain_id', String(editingChainId))
    }
    fd.append('name_kr', String(editingChainData.name_kr ?? ''))
    fd.append('name_en', String(editingChainData.name_en ?? ''))
    fd.append('chain_slug', String(editingChainData.chain_slug ?? ''))
    fd.append('status', String(editingChainData.status ?? 'active'))
    fd.append('rate_plan_code', String(editingChainData.rate_plan_code ?? ''))

    const res = editingChainId === 'new' ? await createChain(fd) : await saveChain(fd)
    setLoading(false)

    if (res.success && res.data) {
      const savedChainId = editingChainId === 'new' ? (res.data.chain_id || 0) : (editingChainId as number)

      setEditingChainId(null)
      setEditingChainData({})

      if (editingChainId === 'new') {
        // 신규 생성: DB에서 반환된 실제 데이터로 추가
        const newChain: Chain = {
          chain_id: res.data.chain_id || 0,
          name_kr: res.data.name_kr ?? null,
          name_en: res.data.name_en ?? null,
          chain_slug: res.data.chain_slug ?? null,
          chain_sort_order: res.data.chain_sort_order ?? null,
          status: res.data.status ?? 'active',
          rate_plan_code: res.data.rate_plan_code ?? null
        }
        setChains(prev => sortChains([...prev, newChain]))
      } else {
        // 수정: DB에서 반환된 실제 데이터로 업데이트
        const updatedChain: Chain = {
          chain_id: res.data.chain_id || (editingChainId as number),
          name_kr: res.data.name_kr ?? null,
          name_en: res.data.name_en ?? null,
          chain_slug: res.data.chain_slug ?? null,
          chain_sort_order: res.data.chain_sort_order ?? null,
          status: res.data.status ?? 'active',
          rate_plan_code: res.data.rate_plan_code ?? null
        }
        setChains(prev => sortChains(prev.map(c =>
          c.chain_id === editingChainId ? updatedChain : c
        )))
      }
      
      // 하이라이트 효과
      setRecentlyUpdatedChainId(savedChainId)
      setTimeout(() => setRecentlyUpdatedChainId(null), 3000)
      
      alert('저장되었습니다.')
    } else {
      alert(res.error || '저장 실패')
    }
  }

  // 브랜드 삭제
  const handleDeleteBrand = async (brandId: number) => {
    if (!confirm('이 브랜드를 삭제하시겠습니까?')) return
    setLoading(true)
    try {
      const result = await deleteBrand(brandId)
      if (result.success) {
        setBrands(prev => prev.filter(b => b.brand_id !== brandId))
        alert('브랜드가 삭제되었습니다.')
      } else {
        alert(result.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('[ChainBrandTabs] handleDeleteBrand error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 체인 삭제
  const handleDeleteChain = async (chainId: number) => {
    if (!confirm('이 체인을 삭제하시겠습니까?')) return
    setLoading(true)
    try {
      const result = await deleteChain(chainId)
      if (result.success) {
        setChains(prev => prev.filter(c => c.chain_id !== chainId))
        alert('체인이 삭제되었습니다.')
      } else {
        alert(result.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('[ChainBrandTabs] handleDeleteChain error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 호텔 연결
  const handleConnect = (item: Brand | Chain) => {
    setSelectedItem(item)
    setShowHotelModal(true)
  }

  // 연결된 호텔 보기 (브랜드)
  const handleViewConnectedHotels = (brand: Brand) => {
    setConnectedHotelsItem({
      type: 'brand',
      id: brand.brand_id,
      name: brand.name_kr || brand.name_en || `ID: ${brand.brand_id}`
    })
    setShowConnectedHotelsModal(true)
  }

  // 연결된 호텔 보기 (체인)
  const handleViewConnectedHotelsChain = (chain: Chain) => {
    setConnectedHotelsItem({
      type: 'chain',
      id: chain.chain_id,
      name: chain.name_kr || chain.name_en || `ID: ${chain.chain_id}`
    })
    setShowConnectedHotelsModal(true)
  }

  // 연결된 호텔 모달 닫기
  const handleCloseConnectedHotelsModal = () => {
    setShowConnectedHotelsModal(false)
    setConnectedHotelsItem(null)
  }

  // 신규 브랜드 추가
  const handleAddNewBrand = () => {
    setEditingBrandId('new')
    setEditingBrandData({ isNew: true, status: 'active' })
  }

  // 신규 체인 추가
  const handleAddNewChain = () => {
    setEditingChainId('new')
    setEditingChainData({ isNew: true, status: 'active' })
  }

  const renderNewBrandRow = () => {
    if (editingBrandId !== 'new') return null
    return (
      <tr className="bg-yellow-50 border-2 border-yellow-400">
        <td className="border p-2 text-center">
          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
        </td>
        <td className="border p-2"><span className="text-xs text-gray-500">NEW</span></td>
        <td className="border p-2 text-center"><span className="text-xs text-gray-500">자동생성</span></td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingBrandData.name_kr ?? '')}
            onChange={(e) => setEditingBrandData(prev => ({ ...prev, name_kr: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="브랜드(한글)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingBrandData.name_en ?? '')}
            onChange={(e) => {
              const newValue = e.target.value
              setEditingBrandData(prev => ({ 
                ...prev, 
                name_en: newValue,
                // 자동으로 brand_slug 생성
                brand_slug: newValue ? slugify(newValue) : ''
              }))
            }}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="브랜드(영문)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingBrandData.brand_slug ?? '')}
            onChange={(e) => setEditingBrandData(prev => ({ ...prev, brand_slug: e.target.value }))}
            onFocus={(e) => {
              // 포커스 시 값이 비어있다면 브랜드(영문)으로부터 자동 생성
              if (!e.target.value && editingBrandData.name_en) {
                setEditingBrandData(prev => ({ 
                  ...prev, 
                  brand_slug: slugify(String(editingBrandData.name_en))
                }))
              }
            }}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="brand-slug (포커스 시 자동 생성)"
          />
        </td>
        <td className="border p-2">
          <select
            value={String(editingBrandData.chain_id ?? '')}
            onChange={(e) => setEditingBrandData(prev => ({ ...prev, chain_id: e.target.value === '' ? null : parseInt(e.target.value) }))}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="">선택</option>
            {chains.map((c, idx) => (
              <option key={`chain-option-${c.chain_id}-${idx}`} value={c.chain_id}>
                {c.name_kr || c.name_en || `ID: ${c.chain_id}`}
              </option>
            ))}
          </select>
        </td>
        <td className="border p-2">
          <select
            value={String(editingBrandData.status ?? 'active')}
            onChange={(e) => setEditingBrandData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </td>
        <td className="border p-2">
          <div className="flex gap-1">
            <Button onClick={handleSaveBrandEdit} size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <Save className="h-3 w-3" />
            </Button>
            <Button onClick={() => { setEditingBrandId(null); setEditingBrandData({}); }} size="sm" variant="outline" disabled={loading}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  const renderNewChainRow = () => {
    if (editingChainId !== 'new') return null
    return (
      <tr className="bg-yellow-50 border-2 border-yellow-400">
        <td className="border p-2 text-center">
          <GripVertical className="h-4 w-4 text-gray-300 mx-auto" />
        </td>
        <td className="border p-2"><span className="text-xs text-gray-500">NEW</span></td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingChainData.name_kr ?? '')}
            onChange={(e) => setEditingChainData(prev => ({ ...prev, name_kr: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="체인(한글)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingChainData.name_en ?? '')}
            onChange={(e) => setEditingChainData(prev => ({ ...prev, name_en: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs"
            placeholder="체인(영문)"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingChainData.chain_slug ?? '')}
            onChange={(e) => setEditingChainData(prev => ({ ...prev, chain_slug: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="chain-slug"
          />
        </td>
        <td className="border p-2">
          <input
            type="text"
            value={String(editingChainData.rate_plan_code ?? '')}
            onChange={(e) => setEditingChainData(prev => ({ ...prev, rate_plan_code: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs font-mono text-gray-700"
            placeholder="API,ZP3 (쉼표 구분)"
          />
        </td>
        <td className="border p-2">
          <select
            value={String(editingChainData.status ?? 'active')}
            onChange={(e) => setEditingChainData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </td>
        <td className="border p-2">
          <div className="flex gap-1">
            <Button onClick={handleSaveChainEdit} size="sm" className="bg-green-600 hover:bg-green-700" disabled={loading}>
              <Save className="h-3 w-3" />
            </Button>
            <Button onClick={() => { setEditingChainId(null); setEditingChainData({}); }} size="sm" variant="outline" disabled={loading}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'chains'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('chains')}
        >
          체인 관리
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'brands'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
          onClick={() => setActiveTab('brands')}
        >
          브랜드 관리
        </button>
      </div>

      {/* 체인 관리 탭 */}
      {activeTab === 'chains' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={handleAddNewChain} className="bg-green-600 hover:bg-green-700" disabled={editingChainId !== null}>
              <PlusCircle className="h-4 w-4" />
              <span className="ml-2">신규 체인 추가</span>
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white shadow">
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChainDragEnd}>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="border p-2 text-center" style={{ width: '40px' }}>
                        <GripVertical className="h-4 w-4 text-gray-400 mx-auto" />
                      </th>
                      <th className="border p-2 text-center" style={{ width: '70px' }}>순서</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>체인(한글)</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>체인(영문)</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>Chain Slug</th>
                      <th className="border p-2 text-left" style={{ width: '140px' }}>Rate Plan Code</th>
                      <th 
                        className="border p-2 text-center cursor-pointer hover:bg-gray-200 select-none" 
                        style={{ width: '90px' }}
                        onClick={() => handleChainSort('status')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          상태
                          {chainSortField === 'status' && (
                            chainSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="border p-2 text-left" style={{ width: '200px' }}>작업</th>
                    </tr>
                  </thead>
                  <SortableContext items={sortedChains.map(c => c.chain_id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {renderNewChainRow()}
                      {sortedChains.map((chain) => {
                        const isEditing = editingChainId === chain.chain_id
                        const isRecentlyUpdated = recentlyUpdatedChainId === chain.chain_id
                        return (
                          <SortableChainRow
                            key={`chain-${chain.chain_id}`}
                            chain={chain}
                            isEditing={isEditing}
                            editingData={editingChainData}
                            onEdit={() => handleEditChain(chain)}
                            onSave={() => handleSaveChain(chain)}
                            isRecentlyUpdated={isRecentlyUpdated}
                            onDelete={() => handleDeleteChain(chain.chain_id)}
                            onConnect={() => handleConnect(chain)}
                            onViewConnected={() => handleViewConnectedHotelsChain(chain)}
                            onFieldChange={(field, value) => setEditingChainData(prev => ({ ...prev, [field]: value }))}
                            onSaveEdit={handleSaveChainEdit}
                            onCancelEdit={() => { setEditingChainId(null); setEditingChainData({}); }}
                          />
                        )
                      })}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
            <div className="p-3 border-t bg-gray-50 text-sm text-gray-600">
              총 {sortedChains.length}개 체인
            </div>
          </div>
        </div>
      )}

      {/* 브랜드 관리 탭 */}
      {activeTab === 'brands' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={handleAddNewBrand} className="bg-green-600 hover:bg-green-700" disabled={editingBrandId !== null}>
              <PlusCircle className="h-4 w-4" />
              <span className="ml-2">신규 브랜드 추가</span>
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white shadow">
            <div className="overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBrandDragEnd}>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="border p-2 text-center" style={{ width: '40px' }}>
                        <GripVertical className="h-4 w-4 text-gray-400 mx-auto" />
                      </th>
                      <th className="border p-2 text-center" style={{ width: '70px' }}>순서</th>
                      <th className="border p-2 text-center" style={{ width: '80px' }}>Brand ID</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>브랜드(한글)</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>브랜드(영문)</th>
                      <th className="border p-2 text-left" style={{ width: '150px' }}>Brand Slug</th>
                      <th 
                        className="border p-2 text-left cursor-pointer hover:bg-gray-200 select-none" 
                        style={{ width: '150px' }}
                        onClick={() => handleBrandSort('chain')}
                      >
                        <div className="flex items-center gap-1">
                          체인
                          {brandSortField === 'chain' && (
                            brandSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="border p-2 text-center cursor-pointer hover:bg-gray-200 select-none" 
                        style={{ width: '90px' }}
                        onClick={() => handleBrandSort('status')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          상태
                          {brandSortField === 'status' && (
                            brandSortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </th>
                      <th className="border p-2 text-left" style={{ width: '200px' }}>작업</th>
                    </tr>
                  </thead>
                  <SortableContext items={sortedBrands.map(b => b.brand_id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {renderNewBrandRow()}
                      {sortedBrands.map((brand) => {
                        const isEditing = editingBrandId === brand.brand_id
                        const isRecentlyUpdated = recentlyUpdatedBrandId === brand.brand_id
                        return (
                          <SortableBrandRow
                            key={`brand-${brand.brand_id}`}
                            brand={brand}
                            chains={chains}
                            isEditing={isEditing}
                            editingData={editingBrandData}
                            onEdit={() => handleEditBrand(brand)}
                            onSave={() => handleSaveBrand(brand)}
                            onDelete={() => handleDeleteBrand(brand.brand_id)}
                            onConnect={() => handleConnect(brand)}
                            onViewConnected={() => handleViewConnectedHotels(brand)}
                            onFieldChange={(field, value) => setEditingBrandData(prev => ({ ...prev, [field]: value }))}
                            onSaveEdit={handleSaveBrandEdit}
                            onCancelEdit={() => { setEditingBrandId(null); setEditingBrandData({}); }}
                            isRecentlyUpdated={isRecentlyUpdated}
                          />
                        )
                      })}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
            </div>
            <div className="p-3 border-t bg-gray-50 text-sm text-gray-600">
              총 {sortedBrands.length}개 브랜드
            </div>
          </div>
        </div>
      )}

      {/* 호텔 연결 모달 */}
      {showHotelModal && selectedItem && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowHotelModal(false); setSelectedItem(null); }} />
          <div className="absolute left-1/2 top-1/2 w-[min(95vw,1200px)] h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">호텔 연결</h2>
                <div className="mt-1 text-sm text-gray-600">
                  연결 대상: <span className="font-medium text-gray-900 ml-1">
                    {'brand_id' in selectedItem 
                      ? `${(selectedItem as Brand).name_kr || (selectedItem as Brand).name_en} (브랜드)`
                      : `${(selectedItem as Chain).name_kr || (selectedItem as Chain).name_en} (체인)`
                    }
                  </span>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => { setShowHotelModal(false); setSelectedItem(null); }}>
                닫기
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <HotelSearchWidget
                hideHeader={true}
                enableHotelEdit={true}
                showInitialHotels={true}
                enableChainBrandConnect={true}
                connectChainId={'chain_id' in selectedItem ? selectedItem.chain_id : ('brand_id' in selectedItem ? (selectedItem as Brand).chain_id : null)}
                connectBrandId={'brand_id' in selectedItem ? selectedItem.brand_id : null}
                onConnectSuccess={(sabreId) => {
                  console.log(`호텔 ${sabreId} 연결됨`)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 연결된 호텔 보기 모달 */}
      {showConnectedHotelsModal && connectedHotelsItem && (
        <ConnectedHotelsModal
          isOpen={showConnectedHotelsModal}
          onClose={handleCloseConnectedHotelsModal}
          itemType={connectedHotelsItem.type}
          itemId={connectedHotelsItem.id}
          itemName={connectedHotelsItem.name}
          onHotelDisconnected={() => {
            // 필요시 브랜드/체인 목록 새로고침
            console.log('[ChainBrandTabs] Hotel disconnected, may need to refresh')
          }}
        />
      )}
    </div>
  )
}

