'use client'

import { useState, useRef, useMemo } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  MapPin,
  Globe,
  Sparkles,
  Layers,
  Plus,
  FileSpreadsheet,
  ListChecks,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Maximize2,
} from 'lucide-react'
import type { AiHotelLookupResult } from '@/app/api/sabre-id/ai-hotel-lookup/route'
import { Modal } from '@/components/shared/modal'

const SABRE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1X_kFUoRbvY1SIv2Vv8dzzgGa51qbt91DdGgua8Q8I54/edit?gid=510702393#gid=510702393'
const SHEET_DATA_SOURCE = 'tourvis.com API (sabre_api_hotel_list 시트 B열)'

interface HotelInfo {
  HotelCode?: string
  CodeContext?: string
  HotelName?: string
  ChainCode?: string
  ChainName?: string
  BrandCode?: string
  BrandName?: string
  SabreRating?: string
  SabreHotelCode?: string
  // 기존 필드들도 유지 (호환성)
  sabreId?: string
  hotelName?: string
  propertyNameKo?: string
  propertyNameEn?: string
  address?: string
  city?: string
  country?: string
  chainName?: string
  brandName?: string
  phone?: string
  email?: string
  website?: string
  description?: string
}

interface SheetCheckEntry {
  sabreId: string
  paragonId: string
  hotelName: string
  chain: string
  exists: boolean
  propertyNameKo: string | null
  propertyNameEn: string | null
}

interface SheetCheckResult {
  sheetRowCount: number
  uniqueSabreIdCount: number
  matchedCount: number
  missingCount: number
  duplicateCount: number
  missingSabreIds: string[]
  entries: SheetCheckEntry[]
}

// interface HotelDetailsResponse {
//   success: boolean
//   data?: {
//     HotelDetailsInfo?: {
//       HotelInfo?: HotelInfo
//     }
//     // 기존 구조도 지원
//     sabre_id?: string
//     property_name_ko?: string
//     property_name_en?: string
//     [key: string]: unknown
//   }
//   error?: string
// }

interface SabreHotelResponse {
  success: boolean
  data?: HotelInfo | {
    HotelDetailsInfo?: {
      HotelInfo?: HotelInfo
    }
    [key: string]: unknown
  }
  error?: string
}

export default function SabreIdManager() {
  // Sabre API 검색 관련 state
  const [sabreId, setSabreId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // DB 검색 관련 state
  const [dbSearchTerm, setDbSearchTerm] = useState('')
  const [dbSearchLoading, setDbSearchLoading] = useState(false)
  const [dbSearchResults, setDbSearchResults] = useState<unknown[]>([])
  const [dbSearchError, setDbSearchError] = useState<string | null>(null)

  // Sabre 시설 일괄 생성 - AI 호텔 정보 조회
  const [bulkHotelName, setBulkHotelName] = useState('')
  const [aiLookupLoading, setAiLookupLoading] = useState(false)
  const [aiLookupResult, setAiLookupResult] = useState<AiHotelLookupResult | null>(null)
  const [aiLookupError, setAiLookupError] = useState<string | null>(null)

  // Sabre ID 단일 편집 값 (AI 결과로 초기화되며 항상 수정 가능)
  const [editableSabreId, setEditableSabreId] = useState('')
  const aiLookupRequestIdRef = useRef(0)
  const [createLoading, setCreateLoading] = useState(false)
  const [hotelExistsWarning, setHotelExistsWarning] = useState<string | null>(null)
  const [createResult, setCreateResult] = useState<{ sabre_id: string; property_name_ko: string; property_name_en: string; property_address: string } | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  // Google Sheet 기반 시설 체크
  const [sheetCheckLoading, setSheetCheckLoading] = useState(false)
  const [sheetCheckError, setSheetCheckError] = useState<string | null>(null)
  const [sheetCheckResult, setSheetCheckResult] = useState<SheetCheckResult | null>(null)

  // 일괄 등록 - 선택된 미등록 시설
  const [selectedMissingIds, setSelectedMissingIds] = useState<Set<string>>(new Set())
  const [bulkCreateLoading, setBulkCreateLoading] = useState(false)
  const [bulkCreateResult, setBulkCreateResult] = useState<{
    createdCount: number
    failedCount: number
    results: Array<{ sabreId: string; success: boolean; error?: string }>
  } | null>(null)
  const [bulkCreateError, setBulkCreateError] = useState<string | null>(null)

  // CHAIN 컬럼 정렬
  const [chainSortDir, setChainSortDir] = useState<'asc' | 'desc' | null>(null)

  // 크게 보기 레이어 팝업
  const [showLargeViewModal, setShowLargeViewModal] = useState(false)

  const sortedEntries = useMemo(() => {
    if (!sheetCheckResult?.entries) return []
    const entries = sheetCheckResult.entries
    if (chainSortDir === null) return entries
    return [...entries].sort((a, b) => {
      const va = (a.chain ?? '').toLowerCase()
      const vb = (b.chain ?? '').toLowerCase()
      const cmp = va.localeCompare(vb)
      return chainSortDir === 'asc' ? cmp : -cmp
    })
  }, [sheetCheckResult?.entries, chainSortDir])

  const handleChainSortClick = () => {
    setChainSortDir((prev) => (prev === null || prev === 'desc' ? 'asc' : 'desc'))
  }

  const handleAiHotelLookup = async () => {
    if (!bulkHotelName.trim()) {
      setAiLookupError('호텔명을 입력해주세요.')
      return
    }
    setAiLookupLoading(true)
    setAiLookupError(null)
    setAiLookupResult(null)
    setEditableSabreId('')
    setCreateResult(null)
    setCreateError(null)
    setHotelExistsWarning(null)
    const thisRequestId = ++aiLookupRequestIdRef.current
    try {
      const res = await fetch('/api/sabre-id/ai-hotel-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName: bulkHotelName.trim() }),
      })
      const json = await res.json()
      if (thisRequestId !== aiLookupRequestIdRef.current) return
      if (!res.ok) {
        throw new Error(json.error || '조회에 실패했습니다.')
      }
      if (json.success && json.data) {
        const data = json.data
        setAiLookupResult(data)
        const extractedSabreId = data.sabreId?.trim() ?? ''
        setEditableSabreId(extractedSabreId)

        // 추출된 sabre_id로 select_hotels 테이블 중복 확인
        if (extractedSabreId && thisRequestId === aiLookupRequestIdRef.current) {
          try {
            const checkRes = await fetch(
              `/api/hotel/check-sabre-id?sabreId=${encodeURIComponent(extractedSabreId)}`,
              { method: 'GET', headers: { 'Content-Type': 'application/json' } }
            )
            const checkJson = await checkRes.json()
            if (thisRequestId !== aiLookupRequestIdRef.current) return
            if (checkJson.success && checkJson.data?.exists) {
              setHotelExistsWarning('이미 등록된 호텔 시설 입니다')
            }
          } catch {
            // 중복 확인 실패 시 무시 (메인 결과는 이미 표시됨)
          }
        }
      } else {
        throw new Error(json.error || '결과를 찾을 수 없습니다.')
      }
    } catch (err) {
      if (thisRequestId !== aiLookupRequestIdRef.current) return
      setAiLookupError(err instanceof Error ? err.message : 'AI 호텔 정보 조회 중 오류가 발생했습니다.')
    } finally {
      if (thisRequestId === aiLookupRequestIdRef.current) setAiLookupLoading(false)
    }
  }

  const handleCreateHotel = async () => {
    if (!aiLookupResult) return
    const effectiveSabreId = editableSabreId.trim()
    if (!effectiveSabreId) {
      setCreateError(
        '저장할 Sabre ID 값을 입력해주세요. AI 웹 검색에서 Sabre ID를 찾지 못한 경우 위 "Sabre id" 필드에 직접 입력하거나, ' +
        '하단 "Sabre API 기준 Sabre ID 검색"에서 Sabre ID를 확인한 뒤 입력해 주세요.'
      )
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    setCreateResult(null)
    try {
      const res = await fetch('/api/hotel/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sabre_id: effectiveSabreId,
          hotel_data: {
            property_name_ko: aiLookupResult.propertyNameKo?.trim() || null,
            property_name_en: aiLookupResult.propertyNameEn?.trim() || null,
            property_address: aiLookupResult.addressEn?.trim() || null,
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            '호텔 기본 데이터 생성이 불가능합니다. 해당 Sabre ID는 이미 select_hotels 테이블에 존재합니다. ' +
            '호텔 정보 수정이 필요하면 "호텔 정보 업데이트" 메뉴에서 해당 Sabre ID로 검색하여 수정해 주세요.'
          )
        }
        throw new Error(json.error || '호텔 기본 데이터 생성에 실패했습니다.')
      }
      if (json.success && json.data) {
        const d = json.data
        setCreateResult({
          sabre_id: String(d.sabre_id ?? effectiveSabreId),
          property_name_ko: String(d.property_name_ko ?? aiLookupResult.propertyNameKo ?? ''),
          property_name_en: String(d.property_name_en ?? aiLookupResult.propertyNameEn ?? ''),
          property_address: String(d.property_address ?? aiLookupResult.addressEn ?? ''),
        })
      } else {
        throw new Error(json.error || '생성 결과를 확인할 수 없습니다.')
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '호텔 기본 데이터 생성 중 오류가 발생했습니다.')
    } finally {
      setCreateLoading(false)
    }
  }

  // DB 검색 함수
  const handleDbSearch = async () => {
    if (!dbSearchTerm.trim()) {
      setDbSearchError('검색어를 입력해주세요.')
      return
    }

    setDbSearchLoading(true)
    setDbSearchError(null)
    setDbSearchResults([])

    try {
      const response = await fetch(`/api/sabre/db-search?q=${encodeURIComponent(dbSearchTerm.trim())}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'DB 검색이 실패했습니다.')
      }

      if (data.success && data.data) {
        setDbSearchResults(data.data)
      } else {
        throw new Error(data.error || '검색 결과를 찾을 수 없습니다.')
      }
    } catch (err) {
      setDbSearchError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setDbSearchLoading(false)
    }
  }

  const handleSheetCheck = async (opts?: { preserveBulkResult?: boolean }) => {
    setSheetCheckLoading(true)
    setSheetCheckError(null)
    setSelectedMissingIds(new Set())
    setChainSortDir(null)
    if (!opts?.preserveBulkResult) {
      setBulkCreateResult(null)
      setBulkCreateError(null)
    }
    try {
      const response = await fetch('/api/sabre-id/google-sheet-check', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '구글 시트 데이터 조회에 실패했습니다.')
      }

      setSheetCheckResult(data.data as SheetCheckResult)
    } catch (err) {
      setSheetCheckError(err instanceof Error ? err.message : '구글 시트 데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setSheetCheckLoading(false)
    }
  }

  const missingEntries = sheetCheckResult?.entries.filter((e) => !e.exists) ?? []
  const isAllMissingSelected =
    missingEntries.length > 0 &&
    missingEntries.every((e) => selectedMissingIds.has(e.sabreId))
  const handleSelectAllMissing = (checked: boolean) => {
    if (checked) {
      setSelectedMissingIds(new Set(missingEntries.map((e) => e.sabreId)))
    } else {
      setSelectedMissingIds(new Set())
    }
  }
  const handleToggleMissing = (sabreId: string, checked: boolean) => {
    setSelectedMissingIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(sabreId)
      else next.delete(sabreId)
      return next
    })
  }

  const handleBulkCreate = async () => {
    if (selectedMissingIds.size === 0) {
      setBulkCreateError('등록할 미등록 시설을 선택해주세요.')
      return
    }
    if (!sheetCheckResult) return

    const entriesToCreate = sheetCheckResult.entries.filter(
      (e) => !e.exists && selectedMissingIds.has(e.sabreId)
    )
    if (entriesToCreate.length === 0) {
      setBulkCreateError('선택한 시설 중 등록할 항목이 없습니다.')
      return
    }

    setBulkCreateLoading(true)
    setBulkCreateError(null)
    setBulkCreateResult(null)
    try {
      const res = await fetch('/api/hotel/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: entriesToCreate.map((e) => ({
            sabreId: e.sabreId,
            hotelName: e.hotelName || null,
            paragonId: e.paragonId || null,
          })),
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || '일괄 등록에 실패했습니다.')
      }

      if (json.success && json.data) {
        setBulkCreateResult(json.data)
        setSelectedMissingIds(new Set())
        await handleSheetCheck({ preserveBulkResult: true })
      } else {
        throw new Error(json.error || '일괄 등록 결과를 확인할 수 없습니다.')
      }
    } catch (err) {
      setBulkCreateError(err instanceof Error ? err.message : '일괄 등록 중 오류가 발생했습니다.')
    } finally {
      setBulkCreateLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!sabreId.trim()) {
      setError('Sabre ID를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setWarning(null)
    setHotelInfo(null)

    try {
      const response = await fetch(`/api/sabre/hotel-details?sabre_id=${encodeURIComponent(sabreId.trim())}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      const data: SabreHotelResponse = await response.json()
      
      // 디버깅을 위한 로그
      console.log('API 응답 상태:', response.status)
      console.log('API 응답 데이터:', data)

      if (!response.ok) {
        throw new Error(data.error || 'API 요청이 실패했습니다.')
      }

      if (data.success && data.data) {
        const responseData = data.data as Record<string, unknown>
        
        // 실제 Sabre API 응답 구조 (GetHotelDetailsRS.HotelDetailsInfo.HotelInfo) 처리
        if (typeof responseData === 'object' && 'GetHotelDetailsRS' in responseData) {
          const getHotelDetailsRS = responseData.GetHotelDetailsRS as Record<string, unknown>
          if (getHotelDetailsRS && typeof getHotelDetailsRS === 'object' && 'HotelDetailsInfo' in getHotelDetailsRS) {
            const hotelDetailsInfo = getHotelDetailsRS.HotelDetailsInfo as Record<string, unknown>
            if (hotelDetailsInfo && typeof hotelDetailsInfo === 'object' && 'HotelInfo' in hotelDetailsInfo) {
              setHotelInfo(hotelDetailsInfo.HotelInfo as HotelInfo)
            }
          }
        }
        // 백업 구조 (HotelDetailsInfo.HotelInfo) 처리
        else if (typeof responseData === 'object' && 'HotelDetailsInfo' in responseData) {
          const hotelDetailsInfo = responseData.HotelDetailsInfo as Record<string, unknown>
          if (hotelDetailsInfo && typeof hotelDetailsInfo === 'object' && 'HotelInfo' in hotelDetailsInfo) {
            setHotelInfo(hotelDetailsInfo.HotelInfo as HotelInfo)
          }
        }
        // 직접 HotelInfo 객체인 경우
        else if (typeof responseData === 'object' && ('HotelName' in responseData || 'SabreHotelCode' in responseData)) {
          setHotelInfo(responseData as HotelInfo)
        }
        else {
          console.error('예상치 못한 응답 구조:', data.data)
          throw new Error('호텔 정보 형식이 올바르지 않습니다.')
        }
        
        // 경고 메시지가 있으면 표시
        if (data.error) {
          setWarning(data.error)
        }
      } else {
        throw new Error(data.error || '호텔 정보를 찾을 수 없습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch()
    }
  }

  return (
    <div className="space-y-8">
      {/* Sabre 시설 일괄 생성 - 위로 이동 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Sabre 시설 조회 및 기초 데이터 생성</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
              <Input
                type="text"
                placeholder="호텔명을 입력하세요 (예: Grand Hyatt Seoul)"
                value={bulkHotelName}
                onChange={(e) => {
                  setBulkHotelName(e.target.value)
                  setAiLookupError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !aiLookupLoading) handleAiHotelLookup()
                }}
                disabled={aiLookupLoading}
                className="h-10 flex-1 min-w-0"
                aria-label="호텔명 입력"
              />
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={handleAiHotelLookup}
                  disabled={aiLookupLoading || !bulkHotelName.trim()}
                  className="h-10 px-6 bg-purple-600 hover:bg-purple-700"
                  aria-label="Sabre id 및 호텔명 확인"
                >
                  {aiLookupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      조회 중
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Sabre id 및 호텔명 확인
                    </>
                  )}
                </Button>
                {aiLookupResult && (
                  <Button
                    onClick={handleCreateHotel}
                    disabled={createLoading || !editableSabreId.trim()}
                    className="h-10 px-6 bg-green-600 hover:bg-green-700"
                    aria-label="호텔 기본 데이터 생성"
                  >
                    {createLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        생성 중
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        호텔 기본 데이터 생성
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {(aiLookupError || createError) && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>{createError ?? aiLookupError}</div>
              </div>
            )}

            {hotelExistsWarning && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>{hotelExistsWarning}</div>
              </div>
            )}

            {aiLookupResult && (
              <div className="rounded-lg border bg-purple-50/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-900">AI 웹 검색 결과</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">Sabre id</span>
                    <Input
                      type="text"
                      placeholder="Sabre ID 입력 (AI 결과 없으면 직접 입력)"
                      value={editableSabreId}
                      onChange={(e) => setEditableSabreId(e.target.value)}
                      className="font-mono h-9 text-base"
                      aria-label="Sabre ID (편집 가능)"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">한글 호텔명</span>
                    <p className="text-base font-medium text-gray-900">
                      {aiLookupResult.propertyNameKo || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">영문 호텔명</span>
                    <p className="text-base font-medium text-gray-900">
                      {aiLookupResult.propertyNameEn || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">호텔 위치 도시</span>
                    <p className="text-base text-gray-900">{aiLookupResult.city || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">국가</span>
                    <p className="text-base text-gray-900">{aiLookupResult.country || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">영문주소</span>
                    <p className="text-sm text-gray-900 break-words">
                      {aiLookupResult.addressEn || '-'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">브랜드명</span>
                    <p className="text-base text-gray-900">{aiLookupResult.brandName || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">소속체인</span>
                    <p className="text-base text-gray-900">{aiLookupResult.chainName || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {createResult && (
              <div className="rounded-lg border bg-green-50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">호텔 기본 데이터 생성 완료</h3>
                </div>
                <p className="text-sm text-green-800">select_hotels 테이블에 저장되었습니다.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">sabre_id</span>
                    <p className="text-base font-mono font-semibold text-green-800">
                      {createResult.sabre_id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">property_name_ko</span>
                    <p className="text-base text-gray-900">{createResult.property_name_ko || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-500">property_name_en</span>
                    <p className="text-base text-gray-900">{createResult.property_name_en || '-'}</p>
                  </div>
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-medium text-gray-500">property_address</span>
                    <p className="text-sm text-gray-900 break-words">
                      {createResult.property_address || '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-dashed pt-6 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-slate-700" />
                    <h3 className="text-base font-semibold">구글 시트 시설 체크 및 기초 데이터 등록</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    구글 시트 B열의 Sabre ID를 불러와 <code className="font-mono">select_hotels</code> 테이블 존재 여부를 확인합니다.
                  </p>
                  <p className="text-xs text-gray-500">
                    데이터 소스: <span className="font-mono">{SHEET_DATA_SOURCE}</span>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SABRE_SHEET_URL && (
                    <a
                      href={SABRE_SHEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-6')}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      시트 열기
                    </a>
                  )}
                  <Button
                    onClick={handleSheetCheck}
                    disabled={sheetCheckLoading}
                    className="h-10 bg-slate-900 px-6 text-white hover:bg-slate-800"
                  >
                    {sheetCheckLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        불러오는 중
                      </>
                    ) : (
                      <>
                        <ListChecks className="mr-2 h-4 w-4" />
                        시트 데이터 확인
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {sheetCheckError && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>{sheetCheckError}</div>
                </div>
              )}

              {sheetCheckLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  구글 시트에서 Sabre ID를 불러오고 있습니다. 잠시만 기다려주세요.
                </div>
              )}

              {sheetCheckResult && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: '시트 행 수',
                        value: sheetCheckResult.sheetRowCount,
                        description: '중복 포함',
                      },
                      {
                        label: '고유 Sabre ID',
                        value: sheetCheckResult.uniqueSabreIdCount,
                        description:
                          sheetCheckResult.duplicateCount > 0
                            ? `중복 ${sheetCheckResult.duplicateCount}건`
                            : '중복 없음',
                      },
                      {
                        label: '등록 완료',
                        value: sheetCheckResult.matchedCount,
                        description: 'select_hotels 존재',
                      },
                      {
                        label: '미등록',
                        value: sheetCheckResult.missingCount,
                        description: 'select_hotels 부재',
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900">{stat.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{stat.description}</p>
                      </div>
                    ))}
                  </div>

                  {sheetCheckResult.missingCount === 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">모든 Sabre ID가 select_hotels 테이블에 이미 등록되어 있습니다.</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLargeViewModal(true)}
                      className="h-9"
                    >
                      <Maximize2 className="mr-2 h-4 w-4" />
                      크게 보기
                    </Button>
                  </div>

                  <div className="rounded-lg border">
                    <div className="overflow-auto max-h-80">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <tr>
                            <th scope="col" className="px-4 py-2 text-left w-10">
                              <input
                                type="checkbox"
                                checked={isAllMissingSelected}
                                onChange={(e) => handleSelectAllMissing(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                aria-label="미등록 시설 전체 선택"
                              />
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              #
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              Sabre ID
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              Paragon ID
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              Hotel name
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              <button
                                type="button"
                                onClick={handleChainSortClick}
                                className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                                aria-label={chainSortDir ? `Chain ${chainSortDir === 'asc' ? '오름차순' : '내림차순'} 정렬` : 'Chain 정렬'}
                              >
                                Chain
                                {chainSortDir === 'asc' && <ArrowUp className="h-4 w-4" />}
                                {chainSortDir === 'desc' && <ArrowDown className="h-4 w-4" />}
                              </button>
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              상태
                            </th>
                            <th scope="col" className="px-4 py-2 text-left">
                              등록된 호텔명
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white text-gray-900">
                          {sortedEntries.map((entry, index) => (
                            <tr key={`${entry.sabreId}-${index}`} className={entry.exists ? '' : 'bg-rose-50/60'}>
                              <td className="px-4 py-3">
                                {!entry.exists ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedMissingIds.has(entry.sabreId)}
                                    onChange={(e) => handleToggleMissing(entry.sabreId, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    aria-label={`${entry.sabreId} 선택`}
                                  />
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500">{index + 1}</td>
                              <td className="px-4 py-3 font-mono text-sm font-semibold">{entry.sabreId}</td>
                              <td className="px-4 py-3 text-sm">{entry.paragonId || '-'}</td>
                              <td className="px-4 py-3 text-sm max-w-[200px] truncate" title={entry.hotelName || ''}>
                                {entry.hotelName || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">{entry.chain || '-'}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    entry.exists
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {entry.exists ? '등록됨' : '미등록'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {entry.exists ? (
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-gray-900">{entry.propertyNameKo || '-'}</p>
                                    <p className="text-xs text-gray-500">{entry.propertyNameEn || '-'}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500 space-y-1">
                      <p>총 {sheetCheckResult.entries.length.toLocaleString()}건 · 최신 상태로 확인하려면 상단 버튼을 다시 실행하세요.</p>
                      <p>위 목록은 select_hotels 테이블에 존재하지 않아 신규 등록이 필요한 Sabre ID입니다.</p>
                    </div>

                    {sheetCheckResult.missingCount > 0 && (
                      <div className="border-t p-4 space-y-3">
                        {bulkCreateError && (
                          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>{bulkCreateError}</div>
                          </div>
                        )}
                        {bulkCreateResult && (
                          <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">선택 시설 일괄 기초 데이터 등록 완료</p>
                              <p className="text-xs mt-1">
                                등록 성공 {bulkCreateResult.createdCount}건
                                {bulkCreateResult.failedCount > 0
                                  ? ` · 실패 ${bulkCreateResult.failedCount}건`
                                  : ''}
                              </p>
                            </div>
                          </div>
                        )}
                        <Button
                          onClick={handleBulkCreate}
                          disabled={bulkCreateLoading || selectedMissingIds.size === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {bulkCreateLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              등록 중...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              선택 시설 일괄 기초 데이터 등록
                              {selectedMissingIds.size > 0
                                ? ` (${selectedMissingIds.size}건)`
                                : ' (미등록 시설을 선택해주세요)'}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 크게 보기 레이어 팝업 */}
      <Modal
        isOpen={showLargeViewModal}
        onClose={() => setShowLargeViewModal(false)}
        title="시설 데이터 테이블"
        size="full"
        className="max-h-[90vh]"
      >
        {sheetCheckResult && (
          <div className="space-y-4">
            <div className="rounded-lg border">
              <div className="overflow-auto max-h-[40rem]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left w-10">
                        <input
                          type="checkbox"
                          checked={isAllMissingSelected}
                          onChange={(e) => handleSelectAllMissing(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label="미등록 시설 전체 선택"
                        />
                      </th>
                      <th scope="col" className="px-4 py-2 text-left">#</th>
                      <th scope="col" className="px-4 py-2 text-left">Sabre ID</th>
                      <th scope="col" className="px-4 py-2 text-left">Paragon ID</th>
                      <th scope="col" className="px-4 py-2 text-left">Hotel name</th>
                      <th scope="col" className="px-4 py-2 text-left">
                        <button
                          type="button"
                          onClick={handleChainSortClick}
                          className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          aria-label={chainSortDir ? `Chain ${chainSortDir === 'asc' ? '오름차순' : '내림차순'} 정렬` : 'Chain 정렬'}
                        >
                          Chain
                          {chainSortDir === 'asc' && <ArrowUp className="h-4 w-4" />}
                          {chainSortDir === 'desc' && <ArrowDown className="h-4 w-4" />}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-2 text-left">상태</th>
                      <th scope="col" className="px-4 py-2 text-left">등록된 호텔명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-gray-900">
                    {sortedEntries.map((entry, index) => (
                      <tr key={`${entry.sabreId}-${index}`} className={entry.exists ? '' : 'bg-rose-50/60'}>
                        <td className="px-4 py-3">
                          {!entry.exists ? (
                            <input
                              type="checkbox"
                              checked={selectedMissingIds.has(entry.sabreId)}
                              onChange={(e) => handleToggleMissing(entry.sabreId, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              aria-label={`${entry.sabreId} 선택`}
                            />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-mono text-sm font-semibold">{entry.sabreId}</td>
                        <td className="px-4 py-3 text-sm">{entry.paragonId || '-'}</td>
                        <td className="px-4 py-3 text-sm max-w-[200px] truncate" title={entry.hotelName || ''}>
                          {entry.hotelName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">{entry.chain || '-'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              entry.exists ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {entry.exists ? '등록됨' : '미등록'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {entry.exists ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium text-gray-900">{entry.propertyNameKo || '-'}</p>
                              <p className="text-xs text-gray-500">{entry.propertyNameEn || '-'}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-500 space-y-1">
                <p>총 {sheetCheckResult.entries.length.toLocaleString()}건 · 최신 상태로 확인하려면 상단 버튼을 다시 실행하세요.</p>
                <p>위 목록은 select_hotels 테이블에 존재하지 않아 신규 등록이 필요한 Sabre ID입니다.</p>
              </div>
              {sheetCheckResult.missingCount > 0 && (
                <div className="border-t p-4 space-y-3">
                  {bulkCreateError && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>{bulkCreateError}</div>
                    </div>
                  )}
                  {bulkCreateResult && (
                    <div className="flex items-start gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">선택 시설 일괄 기초 데이터 등록 완료</p>
                        <p className="text-xs mt-1">
                          등록 성공 {bulkCreateResult.createdCount}건
                          {bulkCreateResult.failedCount > 0 ? ` · 실패 ${bulkCreateResult.failedCount}건` : ''}
                        </p>
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={handleBulkCreate}
                    disabled={bulkCreateLoading || selectedMissingIds.size === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {bulkCreateLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        등록 중...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        선택 시설 일괄 기초 데이터 등록
                        {selectedMissingIds.size > 0 ? ` (${selectedMissingIds.size}건)` : ' (미등록 시설을 선택해주세요)'}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Sabre API 기준 Sabre ID 검색 - 아래로 이동 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Sabre API 기준 Sabre ID 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="Sabre ID를 입력하세요 (예: 12345)"
                value={sabreId}
                onChange={(e) => setSabreId(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="h-10"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !sabreId.trim()}
                className="h-10 px-8"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    검색중
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    검색
                  </>
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {warning && (
              <div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>{warning}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {hotelInfo && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">호텔 정보</h3>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* 기본 정보 */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Sabre Hotel Code</h4>
                <div className="text-2xl font-bold text-blue-600 font-mono">
                  {hotelInfo.SabreHotelCode || hotelInfo.sabreId || '-'}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Hotel Code</h4>
                <div className="text-lg font-semibold text-gray-900 font-mono">
                  {hotelInfo.HotelCode || '-'}
                </div>
                {hotelInfo.CodeContext && (
                  <div className="text-xs text-gray-500">
                    컨텍스트: {hotelInfo.CodeContext}
                  </div>
                )}
              </div>
            </div>

            {/* 호텔명 및 등급 */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔명</h4>
                <div className="text-xl font-semibold text-gray-900">
                  {hotelInfo.HotelName || hotelInfo.propertyNameEn || hotelInfo.hotelName || '-'}
                </div>
              </div>
              
              {hotelInfo.SabreRating && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-500">Sabre 등급</h4>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-yellow-600">
                      {hotelInfo.SabreRating}
                    </div>
                    <div className="text-sm text-gray-500">
                      / 5.0
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 한글 호텔명 */}
            {hotelInfo.propertyNameKo && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔명 (한글)</h4>
                <div className="text-lg font-semibold text-gray-900">
                  {hotelInfo.propertyNameKo}
                </div>
              </div>
            )}

            {/* 체인/브랜드 정보 */}
            {(hotelInfo.ChainName || hotelInfo.BrandName || hotelInfo.chainName || hotelInfo.brandName) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">체인/브랜드</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {(hotelInfo.ChainName || hotelInfo.chainName) && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">체인</span>
                        <div className="text-sm font-medium text-gray-900">
                          {hotelInfo.ChainName || hotelInfo.chainName}
                        </div>
                        {hotelInfo.ChainCode && (
                          <div className="text-xs text-gray-500 font-mono">
                            코드: {hotelInfo.ChainCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(hotelInfo.BrandName || hotelInfo.brandName) && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <span className="text-xs text-gray-500">브랜드</span>
                        <div className="text-sm font-medium text-gray-900">
                          {hotelInfo.BrandName || hotelInfo.brandName}
                        </div>
                        {hotelInfo.BrandCode && (
                          <div className="text-xs text-gray-500 font-mono">
                            코드: {hotelInfo.BrandCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 주소 정보 */}
            {(hotelInfo.address || hotelInfo.city || hotelInfo.country) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">주소 정보</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {hotelInfo.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">주소</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.address}
                        </div>
                      </div>
                    </div>
                  )}
                  {hotelInfo.city && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">도시</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.city}
                        </div>
                      </div>
                    </div>
                  )}
                  {hotelInfo.country && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <span className="text-xs text-gray-500">국가</span>
                        <div className="text-sm text-gray-900 mt-1">
                          {hotelInfo.country}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 연락처 정보 */}
            {(hotelInfo.phone || hotelInfo.email || hotelInfo.website) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">연락처 정보</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {hotelInfo.phone && (
                    <div>
                      <span className="text-xs text-gray-500">전화번호</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {hotelInfo.phone}
                      </div>
                    </div>
                  )}
                  {hotelInfo.email && (
                    <div>
                      <span className="text-xs text-gray-500">이메일</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {hotelInfo.email}
                      </div>
                    </div>
                  )}
                  {hotelInfo.website && (
                    <div>
                      <span className="text-xs text-gray-500">웹사이트</span>
                      <div className="text-sm text-gray-900 mt-1">
                        <a 
                          href={hotelInfo.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {hotelInfo.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 호텔 설명 */}
            {hotelInfo.description && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔 설명</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {hotelInfo.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-900">Sabre ID 검색 시스템</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>직접 검색:</strong> Sabre ID를 입력하여 호텔 정보를 직접 조회합니다</p>
              <p>• <strong>실시간 데이터:</strong> Sabre API를 통해 최신 호텔 정보를 가져옵니다</p>
              <p>• <strong>상세 정보:</strong> 호텔명, 주소, 연락처 등 상세 정보를 제공합니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* DB 검색 영역 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">DB 기준 Sabre 호텔 및 ID 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="호텔명 또는 Sabre ID를 입력하세요"
                value={dbSearchTerm}
                onChange={(e) => setDbSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !dbSearchLoading) {
                    handleDbSearch()
                  }
                }}
                disabled={dbSearchLoading}
                className="h-10"
              />
              <Button 
                onClick={handleDbSearch}
                disabled={dbSearchLoading || !dbSearchTerm.trim()}
                className="h-10 px-8 bg-green-600 hover:bg-green-700"
              >
                {dbSearchLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    DB 검색
                  </>
                )}
              </Button>
            </div>

            {/* DB 검색 에러 메시지 */}
            {dbSearchError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">검색 오류</h3>
                  <p className="text-sm mt-1">{dbSearchError}</p>
                </div>
              </div>
            )}

            {/* DB 검색 결과 */}
            {dbSearchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">
                    검색 결과 ({dbSearchResults.length}개)
                  </h3>
                </div>
                
                <div className="grid gap-4">
                  {dbSearchResults.map((hotelData, index) => {
                    const hotel = hotelData as Record<string, unknown>
                    return (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Sabre ID</h4>
                            <p className="text-lg font-bold text-blue-600 font-mono">
                              {(hotel.sabre_id as string) || '-'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">호텔명 (영문)</h4>
                            <p className="text-base font-semibold text-gray-900">
                              {(hotel.property_name_en as string) || '-'}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">호텔명 (한글)</h4>
                            <p className="text-base font-semibold text-gray-900">
                              {(hotel.property_name_ko as string) || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 빈 결과 메시지 */}
            {!dbSearchLoading && dbSearchTerm && dbSearchResults.length === 0 && !dbSearchError && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">검색 결과가 없습니다.</p>
                <p className="text-xs mt-1">다른 검색어로 시도해보세요.</p>
              </div>
            )}
          </div>

          {/* DB 검색 시스템 설명 */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">DB 기준 검색 시스템</h3>
            <div className="text-sm text-green-800 space-y-1">
              <p>• <strong>로컬 DB 검색:</strong> Supabase 데이터베이스의 sabre_hotels 테이블에서 검색합니다</p>
              <p>• <strong>검색 대상:</strong> Sabre ID 및 호텔 영문명으로 검색 가능합니다</p>
              <p>• <strong>빠른 검색:</strong> 로컬 DB를 활용하여 빠른 검색 결과를 제공합니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}