'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Trash2,
  Plus,
  Image as ImageIcon,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/data-table'
import { saveFeatureSlot, deleteFeatureSlot } from '@/features/advertisements/actions'

interface FeatureSlot {
  id: number
  sabre_id: string
  surface: string
  slot_key: string
  start_date?: string
  end_date?: string
  created_at: string
  select_hotels: {
    property_name_ko: string
    property_name_en: string
    slug: string
  }
  hotel_image?: string
}


interface Hotel {
  sabre_id: string
  property_name_ko: string
  property_name_en: string
  slug?: string
  image_1?: string
  image_2?: string
  image_3?: string
  image_4?: string
  image_5?: string
  brand_id?: string
  hotel_brands?: {
    brand_id: string
    brand_name_ko: string
    brand_name_en: string
    chain_id: string
    hotel_chains?: {
      chain_id: string
      chain_name_ko: string
      chain_name_en: string
    }
  }
}

export default function BannerManager() {
  const [slots, setSlots] = useState<FeatureSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // 새 항목 추가 폼 상태
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    sabre_id: '',
    start_date: '',
    end_date: ''
  })
  
  // 호텔 검색 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hotel[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  
  // Server Actions을 위한 transition
  const [isPending, startTransition] = useTransition()
  
  

  // 호텔 이미지 가져오기
  const fetchHotelImage = async (sabreId: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/hotel/first-image?sabreId=${sabreId}`)
      const data = await response.json()
      
      if (data.success && data.data.imageUrl) {
        return data.data.imageUrl
      }
      return null
    } catch (error) {
      console.error(`호텔 ${sabreId} 이미지 조회 오류:`, error)
      return null
    }
  }

  // 데이터 로드
  const loadSlots = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/feature-slots/banner')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }

      if (data.success) {
        // 배열 데이터 처리 (여러 상단 베너 스케줄)
        const bannerSlots = data.data || []
        
        // 날짜 정규화 함수
        const normalizeDate = (d?: string | null) => {
          if (!d) return undefined
          const dt = new Date(d)
          if (Number.isNaN(dt.getTime())) return undefined
          return dt.toISOString().slice(0, 10)
        }
        
        // 각 슬롯에 호텔 이미지 추가 및 날짜 정규화
        const slotsWithImages = await Promise.all(
          bannerSlots.map(async (slot: Record<string, unknown>) => {
            const imageUrl = await fetchHotelImage(slot.sabre_id)
            return { 
              ...slot, 
              hotel_image: imageUrl,
              start_date: normalizeDate(slot.start_date),
              end_date: normalizeDate(slot.end_date)
            } as FeatureSlot
          })
        )
        
        setSlots(slotsWithImages)
      } else {
        throw new Error(data.error || '데이터를 불러올 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 초기 로드
  useEffect(() => {
    loadSlots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // 새 항목 추가
  const handleAddNew = () => {
    setShowForm(true)
    setFormData({
      sabre_id: '',
      start_date: '',
      end_date: ''
    })
  }


  // 인라인 저장 (PromotionManager의 handleUpsert와 동일한 방식)
  const saveInline = async (slot: FeatureSlot) => {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        // FormData 생성
        const formData = new FormData()
        formData.append('id', String(slot.id))
        formData.append('sabre_id', slot.sabre_id)
        formData.append('surface', '상단베너')
        formData.append('slot_key', 'top-banner')
        formData.append('start_date', slot.start_date || '')
        formData.append('end_date', slot.end_date || '')

        const result = await saveFeatureSlot(formData)
        
        if (!result.success) {
          throw new Error(result.error || '저장에 실패했습니다.')
        }
        
        setSuccess('저장되었습니다.')
        loadSlots()
        
        // 성공 메시지 3초 후 자동 숨김
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
      }
    })
  }


  // 호텔 검색
  const searchHotels = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
      })

      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data || [])
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error('호텔 검색 오류:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // 호텔 선택
  const selectHotel = (hotel: Hotel) => {
    setFormData(prev => ({
      ...prev,
      sabre_id: hotel.sabre_id
    }))
    // 선택한 호텔명을 검색 필드에 표시
    setSearchQuery(hotel.property_name_ko || hotel.property_name_en || '')
    setSearchResults([])
  }

  // 검색어 변경 핸들러 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchHotels(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // 삭제
  const handleDelete = async (row?: unknown) => {
    const target = (row as FeatureSlot) || slots[0]
    if (!target) return
    if (!confirm('정말로 상단 베너를 삭제하시겠습니까?')) {
      return
    }

    startTransition(async () => {
      try {
        const result = await deleteFeatureSlot(target.id)

        if (!result.success) {
          throw new Error(result.error || '삭제에 실패했습니다.')
        }

        setSuccess('상단 베너가 삭제되었습니다.')
        loadSlots()
      } catch (err) {
        setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
      }
    })
  }


  return (
    <div className="space-y-6">
      {/* 헤더 (복원) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <ImageIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              호텔 목록 메인 베너 노출 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              select_feature_slots 테이블의 surface가 &apos;상단베너&apos;인 레코드를 관리합니다
            </p>
          </div>
        </div>
      </div>

      {/* 성공/에러 메시지 */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 폼 제거: 인라인 편집으로 대체 */}

      {/* 선택 패널 제거: 인라인 편집으로 대체 */}

      {/* 메인 베너 노출 호텔 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleAddNew}
          disabled={showForm}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          메인 베너 노출 호텔 추가
        </Button>
      </div>

      {/* 새 항목 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            메인 베너 노출 호텔 추가
          </h3>
          
          <form onSubmit={async (e) => {
            e.preventDefault()
            
            if (!formData.sabre_id.trim()) {
              setError('호텔을 선택해주세요.')
              return
            }

            setError(null)
            setSuccess(null)

            startTransition(async () => {
              try {
                const formDataToSubmit = new FormData()
                formDataToSubmit.append('sabre_id', formData.sabre_id)
                formDataToSubmit.append('surface', '상단베너')
                formDataToSubmit.append('slot_key', 'top-banner')
                formDataToSubmit.append('start_date', formData.start_date || '')
                formDataToSubmit.append('end_date', formData.end_date || '')

                const result = await saveFeatureSlot(formDataToSubmit)
                
                if (!result.success) {
                  throw new Error(result.error || '저장에 실패했습니다.')
                }
                
                setSuccess('저장되었습니다.')
                setShowForm(false)
                setFormData({
                  sabre_id: '',
                  start_date: '',
                  end_date: ''
                })
                loadSlots()
                
                // 성공 메시지 3초 후 자동 숨김
                setTimeout(() => setSuccess(null), 3000)
              } catch (err) {
                setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
              }
            })
          }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  호텔명 또는 Sabre ID*
                </label>
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={formData.sabre_id ? "호텔이 선택되었습니다" : "호텔명을 입력하여 검색하세요..."}
                    className="w-full"
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  
                  {/* 검색 결과 드롭다운 */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((hotel) => (
                        <div
                          key={hotel.sabre_id}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => selectHotel(hotel)}
                        >
                          <div className="font-medium text-gray-900">
                            {hotel.property_name_ko}
                          </div>
                          <div className="text-sm text-gray-500">
                            {hotel.property_name_en}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            Sabre ID: {hotel.sabre_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sabre ID
                </label>
                <Input
                  value={formData.sabre_id}
                  onChange={(e) => setFormData({ ...formData, sabre_id: e.target.value })}
                  placeholder="Sabre ID"
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-blue-600">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="text-sm text-blue-800">
                  <strong>Surface:</strong> 상단베너 (자동 설정)
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    추가
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isPending}
              >
                취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 데이터 테이블 */}
      <DataTable
        title="상단 베너 슬롯 목록"
        subtitle={`총 ${slots.length}개의 항목`}
        data={slots as unknown as Record<string, unknown>[]}
        loading={loading}
        columns={[
          {
            key: 'hotel_image',
            label: '호텔 이미지',
            width: '120px',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              return (
                <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {slot.hotel_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.hotel_image}
                      alt={`${slot.select_hotels?.property_name_ko || '호텔'} 이미지`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="flex items-center justify-center text-gray-400 text-xs">이미지 없음</div>';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center text-gray-400 text-xs">
                      이미지 없음
                    </div>
                  )}
                </div>
              )
            }
          },
          {
            key: 'select_hotels.property_name_ko',
            label: '호텔명 (한국어)',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              
              // 일반 표시 모드 (읽기 전용)
              return (
                <div>
                  <div className="font-medium text-gray-900">
                    {slot.select_hotels?.property_name_ko || '-'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {slot.select_hotels?.property_name_en || '-'}
                  </div>
                </div>
              )
            }
          },
          {
            key: 'sabre_id',
            label: 'Sabre ID',
            render: (value) => (
              <span className="font-mono text-sm text-gray-600">{value as string}</span>
            )
          },
          {
            key: 'slot_key',
            label: '슬롯 키',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              return (
                <Input 
                  type="text" 
                  value={slot.slot_key} 
                  onChange={(e) => setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, slot_key: e.target.value } : s))} 
                  className="w-full"
                />
              )
            }
          },
          {
            key: 'start_date',
            label: '노출 시작일',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              return (
                <Input 
                  type="date" 
                  value={slot.start_date ?? ''} 
                  onChange={(e) => setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, start_date: e.target.value || undefined } : s))} 
                />
              )
            }
          },
          {
            key: 'end_date',
            label: '노출 종료일',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              return (
                <Input 
                  type="date" 
                  value={slot.end_date ?? ''} 
                  onChange={(e) => setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, end_date: e.target.value || undefined } : s))} 
                />
              )
            }
          },
          {
            key: 'created_at',
            label: '생성일',
            render: (value) => (
              <span className="text-sm text-gray-500">
                {value ? new Date(value as string).toLocaleDateString('ko-KR') : '-'}
              </span>
            )
          },
          {
            key: 'actions',
            label: '작업',
            render: (value, row) => {
              const slot = row as unknown as FeatureSlot
              return (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveInline(slot)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(row)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )
            }
          }
        ]}
      />
    </div>
  )
}
