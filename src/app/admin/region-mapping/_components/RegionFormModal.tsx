'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Save, Loader2 } from 'lucide-react'
import type { SelectRegion, RegionType, RegionStatus } from '@/types/regions'

interface RegionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: FormData) => Promise<void>
  regionType: RegionType
  initialData?: SelectRegion | null
  mode: 'create' | 'edit'
}

interface FormData {
  region_type: RegionType
  status?: RegionStatus
  area_ko?: string
  area_en?: string
  area_sort_order?: number
  city_ko?: string
  city_en?: string
  city_code?: string
  city_slug?: string
  city_sort_order?: number
  country_ko?: string
  country_en?: string
  country_code?: string
  country_slug?: string
  country_sort_order?: number
  continent_ko?: string
  continent_en?: string
  continent_code?: string
  continent_slug?: string
  continent_sort_order?: number
  region_name_ko?: string
  region_name_en?: string
  region_code?: string
  region_slug?: string
  region_name_sort_order?: number
}

export function RegionFormModal({ isOpen, onClose, onSave, regionType, initialData, mode }: RegionFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    region_type: regionType,
    status: 'active'
  })
  const [loading, setLoading] = useState(false)

  // initialData가 변경되면 formData 초기화
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        region_type: initialData.region_type,
        status: initialData.status || 'active',
        area_ko: initialData.area_ko || '',
        area_en: initialData.area_en || '',
        area_sort_order: initialData.area_sort_order ?? null,
        city_ko: initialData.city_ko || '',
        city_en: initialData.city_en || '',
        city_code: initialData.city_code || '',
        city_slug: initialData.city_slug || '',
        city_sort_order: initialData.city_sort_order || 0,
        country_ko: initialData.country_ko || '',
        country_en: initialData.country_en || '',
        country_code: initialData.country_code || '',
        country_slug: initialData.country_slug || '',
        country_sort_order: initialData.country_sort_order || 0,
        continent_ko: initialData.continent_ko || '',
        continent_en: initialData.continent_en || '',
        continent_code: initialData.continent_code || '',
        continent_slug: initialData.continent_slug || '',
        continent_sort_order: initialData.continent_sort_order || 0,
        region_name_ko: initialData.region_name_ko || '',
        region_name_en: initialData.region_name_en || '',
        region_code: initialData.region_code || '',
        region_slug: initialData.region_slug || '',
        region_name_sort_order: initialData.region_name_sort_order || 0,
      })
    } else {
      setFormData({ region_type: regionType, status: 'active' })
    }
  }, [initialData, mode, regionType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      console.log('[RegionFormModal] Submitting form data:', formData)
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('[RegionFormModal] Form submit error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? '신규 코드 추가' : '코드 수정'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {regionType === 'city' && '도시 정보를 입력하세요'}
              {regionType === 'area' && '지역(Area) 정보를 입력하세요'}
              {regionType === 'country' && '국가 정보를 입력하세요'}
              {regionType === 'continent' && '대륙 정보를 입력하세요'}
              {regionType === 'region' && '지역 정보를 입력하세요'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(85vh-180px)]">
          <div className="space-y-4">
            {/* Status 필드 (공통) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status || 'active'}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">활성 (Active)</option>
                <option value="inactive">비활성 (Inactive)</option>
              </select>
            </div>

            {/* City 타입 필드 */}
            {regionType === 'city' && (
              <>
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">도시 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시명 (한글) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city_ko || ''}
                        onChange={(e) => handleChange('city_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시명 (영문) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.city_en || ''}
                        onChange={(e) => handleChange('city_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시 코드 (IATA)
                      </label>
                      <input
                        type="text"
                        value={formData.city_code || ''}
                        onChange={(e) => handleChange('city_code', e.target.value.toUpperCase())}
                        placeholder="예: BKK"
                        maxLength={3}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.city_slug || ''}
                        onChange={(e) => handleChange('city_slug', e.target.value.toLowerCase())}
                        placeholder="예: bangkok"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      정렬 순서
                    </label>
                    <input
                      type="number"
                      value={formData.city_sort_order || 0}
                      onChange={(e) => handleChange('city_sort_order', parseInt(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 도시의 상위 지역: 국가 정보 */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    국가 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.country_ko || ''}
                        onChange={(e) => handleChange('country_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 태국"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.country_en || ''}
                        onChange={(e) => handleChange('country_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Thailand"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 코드 (ISO)
                      </label>
                      <input
                        type="text"
                        value={formData.country_code || ''}
                        onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                        placeholder="예: TH"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.country_slug || ''}
                        onChange={(e) => handleChange('country_slug', e.target.value.toLowerCase())}
                        placeholder="예: thailand"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>

                {/* 도시의 상위 지역: 대륙 정보 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    대륙 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_ko || ''}
                        onChange={(e) => handleChange('continent_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 아시아"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_en || ''}
                        onChange={(e) => handleChange('continent_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Asia"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 코드
                      </label>
                      <input
                        type="text"
                        value={formData.continent_code || ''}
                        onChange={(e) => handleChange('continent_code', e.target.value.toUpperCase())}
                        placeholder="예: AS"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.continent_slug || ''}
                        onChange={(e) => handleChange('continent_slug', e.target.value.toLowerCase())}
                        placeholder="예: asia"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Area 타입 필드 */}
            {regionType === 'area' && (
              <>
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">지역(Area) 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        지역명 (한글) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.area_ko || ''}
                        onChange={(e) => handleChange('area_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        지역명 (영문) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.area_en || ''}
                        onChange={(e) => handleChange('area_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      정렬 순서
                    </label>
                    <input
                      type="number"
                      value={formData.area_sort_order ?? 0}
                      onChange={(e) => handleChange('area_sort_order', Number(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Area의 상위 지역: 도시 정보 */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    도시 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.city_ko || ''}
                        onChange={(e) => handleChange('city_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 방콕"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.city_en || ''}
                        onChange={(e) => handleChange('city_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Bangkok"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시 코드 (IATA)
                      </label>
                      <input
                        type="text"
                        value={formData.city_code || ''}
                        onChange={(e) => handleChange('city_code', e.target.value.toUpperCase())}
                        placeholder="예: BKK"
                        maxLength={3}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        도시 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.city_slug || ''}
                        onChange={(e) => handleChange('city_slug', e.target.value.toLowerCase())}
                        placeholder="예: bangkok"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Area의 상위 지역: 국가 정보 */}
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    국가 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.country_ko || ''}
                        onChange={(e) => handleChange('country_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 태국"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.country_en || ''}
                        onChange={(e) => handleChange('country_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Thailand"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 코드 (ISO)
                      </label>
                      <input
                        type="text"
                        value={formData.country_code || ''}
                        onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                        placeholder="예: TH"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.country_slug || ''}
                        onChange={(e) => handleChange('country_slug', e.target.value.toLowerCase())}
                        placeholder="예: thailand"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Area의 상위 지역: 대륙 정보 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    대륙 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_ko || ''}
                        onChange={(e) => handleChange('continent_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 아시아"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_en || ''}
                        onChange={(e) => handleChange('continent_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Asia"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 코드
                      </label>
                      <input
                        type="text"
                        value={formData.continent_code || ''}
                        onChange={(e) => handleChange('continent_code', e.target.value.toUpperCase())}
                        placeholder="예: AS"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.continent_slug || ''}
                        onChange={(e) => handleChange('continent_slug', e.target.value.toLowerCase())}
                        placeholder="예: asia"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Country 타입 필드 */}
            {regionType === 'country' && (
              <>
                <div className="border-b pb-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">국가 정보</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (한글) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.country_ko || ''}
                        onChange={(e) => handleChange('country_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가명 (영문) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.country_en || ''}
                        onChange={(e) => handleChange('country_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 코드 (ISO)
                      </label>
                      <input
                        type="text"
                        value={formData.country_code || ''}
                        onChange={(e) => handleChange('country_code', e.target.value.toUpperCase())}
                        placeholder="예: TH"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        국가 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.country_slug || ''}
                        onChange={(e) => handleChange('country_slug', e.target.value.toLowerCase())}
                        placeholder="예: thailand"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      정렬 순서
                    </label>
                    <input
                      type="number"
                      value={formData.country_sort_order || 0}
                      onChange={(e) => handleChange('country_sort_order', parseInt(e.target.value) || 0)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 국가의 상위 지역: 대륙 정보 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    대륙 정보 <span className="text-xs text-gray-500">(선택사항 - 호텔 매핑 시 함께 적용됨)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (한글)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_ko || ''}
                        onChange={(e) => handleChange('continent_ko', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 아시아"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙명 (영문)
                      </label>
                      <input
                        type="text"
                        value={formData.continent_en || ''}
                        onChange={(e) => handleChange('continent_en', e.target.value)}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: Asia"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 코드
                      </label>
                      <input
                        type="text"
                        value={formData.continent_code || ''}
                        onChange={(e) => handleChange('continent_code', e.target.value.toUpperCase())}
                        placeholder="예: AS"
                        maxLength={2}
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        대륙 슬러그
                      </label>
                      <input
                        type="text"
                        value={formData.continent_slug || ''}
                        onChange={(e) => handleChange('continent_slug', e.target.value.toLowerCase())}
                        placeholder="예: asia"
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Continent 타입 필드 */}
            {regionType === 'continent' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대륙명 (한글) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.continent_ko || ''}
                      onChange={(e) => handleChange('continent_ko', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대륙명 (영문) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.continent_en || ''}
                      onChange={(e) => handleChange('continent_en', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대륙 코드
                    </label>
                    <input
                      type="text"
                      value={formData.continent_code || ''}
                      onChange={(e) => handleChange('continent_code', e.target.value.toUpperCase())}
                      placeholder="예: AS"
                      maxLength={2}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대륙 슬러그
                    </label>
                    <input
                      type="text"
                      value={formData.continent_slug || ''}
                      onChange={(e) => handleChange('continent_slug', e.target.value.toLowerCase())}
                      placeholder="예: asia"
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    정렬 순서
                  </label>
                  <input
                    type="number"
                    value={formData.continent_sort_order || 0}
                    onChange={(e) => handleChange('continent_sort_order', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Region 타입 필드 */}
            {regionType === 'region' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지역명 (한글) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.region_name_ko || ''}
                      onChange={(e) => handleChange('region_name_ko', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지역명 (영문) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.region_name_en || ''}
                      onChange={(e) => handleChange('region_name_en', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지역 코드
                    </label>
                    <input
                      type="text"
                      value={formData.region_code || ''}
                      onChange={(e) => handleChange('region_code', e.target.value.toUpperCase())}
                      placeholder="예: SEA"
                      maxLength={10}
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      지역 슬러그
                    </label>
                    <input
                      type="text"
                      value={formData.region_slug || ''}
                      onChange={(e) => handleChange('region_slug', e.target.value.toLowerCase())}
                      placeholder="예: southeast-asia"
                      className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    정렬 순서
                  </label>
                  <input
                    type="number"
                    value={formData.region_name_sort_order || 0}
                    onChange={(e) => handleChange('region_name_sort_order', parseInt(e.target.value) || 0)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </form>

        {/* 하단 버튼 */}
        <div className="p-4 border-t bg-gray-50 flex justify-end items-center gap-2">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

