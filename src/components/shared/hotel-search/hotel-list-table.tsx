import React from 'react'
import Link from 'next/link'
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  X,
  Play,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDate, parseRatePlanCode, formatJson } from '@/lib/utils'
import { HotelSearchResult, ExpandedRowState } from '@/types/hotel'
import { ImageManagementPanel } from './image-management-panel'
import { UrlGeneratorPanel } from '../url-generator-panel'
import { SeoManagementPanel } from './seo-management-panel'
import DateInput from '@/components/shared/date-input'
import { RatePlanCodeSelector } from '@/components/shared/rate-plan-code-selector'
import { BaseButton } from '@/components/shared/form-actions'

interface HotelListTableProps {
  results: HotelSearchResult[]
  count: number
  showInitialHotels: boolean
  enableHotelEdit: boolean
  enableChainBrandConnect: boolean
  
  expandedRowId: string | null
  expandedRowState: ExpandedRowState | null
  
  onRowClick: (hotel: HotelSearchResult) => void
  setExpandedRowId: (id: string | null) => void
  setExpandedRowState: (state: ExpandedRowState | null) => void
  
  // Chain Connect
  connectingHotelId?: string | null
  connectChainId?: number | null
  connectBrandId?: number | null
  connectHotelToChainBrand?: (sabreId: string, brandPosition?: 1 | 2 | 3) => void
  
  // Image Management
  imageManagementState?: any
  toggleImageEditMode?: (hotelId: string) => void
  saveImageUrls?: (hotelId: string, sabreId: string) => void
  createStorageFolder?: (hotelId: string, sabreId: string) => void
  checkStorageFolder?: (hotelId: string, sabreId: string) => void
  loadStorageImages?: (hotelId: string, sabreId: string) => void
  
  // Detail Test
  updateExpandedRowState?: (updates: Partial<ExpandedRowState>) => void
  handleTestHotelDetails?: () => void
  handleCopyJson?: () => void
  copiedJson?: boolean
  
  // SEO Management
  enableSeoManagement?: boolean
  onSeoUpdate?: (sabreId: string, seoData: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    canonicalUrl: string;
  }) => Promise<void>;
  onSeoGenerate?: (sabreId: string) => Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }>;
  
  // Pagination
  currentPage?: number
  limit?: number
  onPageChange?: (page: number) => void
  
  // Bulk SEO Generation
  onBulkSeoGenerate?: (sabreIds: string[]) => Promise<void>;
  
  // Rate Plan Button Text
  ratePlanButtonText?: string;
  // Room List Title
  roomListTitle?: string;
  // Use ProductCode Table Format
  useProductCodeTableFormat?: boolean;
}

// 지정 경로 순회해서 RatePlan 행 추출 (AmountAfterTax 정렬은 호출부에서)
function extractRatePlanTableRows(data: unknown): Array<{
  rateKey: string
  roomType: string
  roomName: string
  description: string
  currency: string
  amountAfterTax: number | ''
  amountBeforeTax: number | ''
  taxes: number | ''
  fees: number | ''
  refundable: string
  cancelOffset: string
}> {
  const rows: Array<{
    rateKey: string
    roomType: string
    roomName: string
    description: string
    currency: string
    amountAfterTax: number | ''
    amountBeforeTax: number | ''
    taxes: number | ''
    fees: number | ''
    refundable: string
    cancelOffset: string
  }> = []

  const deepGet = (obj: unknown, keys: string[]): unknown => {
    let cur: unknown = obj
    for (const key of keys) {
      if (cur && typeof cur === 'object' && Object.prototype.hasOwnProperty.call(cur as object, key)) {
        cur = (cur as Record<string, unknown>)[key]
      } else {
        return undefined
      }
    }
    return cur
  }
  const root = deepGet(data, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo', 'Rooms', 'Room'])
  if (!root) return rows
  const roomArray: unknown[] = Array.isArray(root) ? root : [root]

  const toNumber = (v: unknown): number | '' => {
    if (v === null || v === undefined || v === '') return ''
    const n = Number(v)
    return Number.isFinite(n) ? n : ''
  }

  for (const room of roomArray) {
    const r = room as Record<string, unknown>
    const rt = deepGet(r, ['RoomType'])
    const rdName = deepGet(r, ['RoomDescription', 'Name'])
    const descSrc = deepGet(r, ['RoomDescription', 'Text'])
    const roomType: string = typeof rt === 'string' ? rt : (typeof rdName === 'string' ? rdName : '')
    const roomName: string = typeof rdName === 'string' ? rdName : ''
    const description: string = Array.isArray(descSrc) ? (typeof (descSrc as unknown[])[0] === 'string' ? (descSrc as unknown[])[0] as string : '') : (typeof descSrc === 'string' ? descSrc as string : '')

    const plansNode = deepGet(r, ['RatePlans', 'RatePlan'])
    if (!plansNode) continue
    const plans: unknown[] = Array.isArray(plansNode) ? plansNode : [plansNode]

    for (const plan of plans) {
      const p = plan as Record<string, unknown>
      const currency: string = (() => {
        const v = deepGet(p, ['ConvertedRateInfo', 'CurrencyCode'])
        return typeof v === 'string' ? v : ''
      })()
      const amountAfterTax = toNumber(deepGet(p, ['ConvertedRateInfo', 'AmountAfterTax']))
      const amountBeforeTax = toNumber(deepGet(p, ['ConvertedRateInfo', 'AmountBeforeTax']))
      const taxes = toNumber(deepGet(p, ['ConvertedRateInfo', 'Taxes', 'Amount']))
      const fees = toNumber(deepGet(p, ['ConvertedRateInfo', 'Fees', 'Amount']))
      const cpNode = deepGet(p, ['ConvertedRateInfo', 'CancelPenalties', 'CancelPenalty'])
      const cp0 = Array.isArray(cpNode) ? (cpNode[0] as Record<string, unknown> | undefined) : (cpNode as Record<string, unknown> | undefined)
      const refundableVal = cp0 ? deepGet(cp0, ['Refundable']) : undefined
      const refundable = typeof refundableVal === 'boolean' ? String(refundableVal) : (typeof refundableVal === 'string' ? refundableVal : '')
      const offsetUnitMultiplier = cp0 ? deepGet(cp0, ['OffsetUnitMultiplier']) : undefined
      const offsetTimeUnit = cp0 ? deepGet(cp0, ['OffsetTimeUnit']) : undefined
      const offsetDropTime = cp0 ? deepGet(cp0, ['OffsetDropTime']) : undefined
      const cancelOffset = [offsetUnitMultiplier, offsetTimeUnit, offsetDropTime]
        .filter((x: unknown) => x !== undefined && x !== null && x !== '')
        .join(' ')
      const rateKeyVal = deepGet(p, ['RateKey'])
      const rateKey: string = typeof rateKeyVal === 'string' ? rateKeyVal : ''

      rows.push({
        rateKey,
        roomType,
        roomName,
        description,
        currency,
        amountAfterTax,
        amountBeforeTax,
        taxes,
        fees,
        refundable,
        cancelOffset,
      })
    }
  }
  return rows
}

export function HotelListTable({
  results,
  count,
  showInitialHotels,
  enableHotelEdit,
  enableChainBrandConnect,
  
  expandedRowId,
  expandedRowState,
  
  onRowClick,
  setExpandedRowId,
  setExpandedRowState,
  
  connectingHotelId,
  connectChainId,
  connectBrandId,
  connectHotelToChainBrand,
  
  imageManagementState,
  toggleImageEditMode,
  saveImageUrls,
  createStorageFolder,
  checkStorageFolder,
  loadStorageImages,
  
  updateExpandedRowState,
  handleTestHotelDetails,
  handleCopyJson,
  copiedJson,
  
  enableSeoManagement,
  onSeoUpdate,
  onSeoGenerate,
  
  currentPage = 1,
  limit = 20,
  onPageChange,
  
  onBulkSeoGenerate,
  
  ratePlanButtonText,
  roomListTitle,
  useProductCodeTableFormat,
}: HotelListTableProps) {
  
  if (results.length === 0) return null

  // 클립보드 복사 상태 (내부 관리)
  const [internalCopied, setInternalCopied] = React.useState(false);
  
  // 선택된 호텔 관리
  const [selectedHotels, setSelectedHotels] = React.useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = React.useState(false);
  const [bulkMessage, setBulkMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedHotels(new Set(results.map(h => String(h.sabre_id))))
    } else {
      setSelectedHotels(new Set())
    }
  };
  
  // 개별 선택/해제
  const handleSelectHotel = (sabreId: string, checked: boolean) => {
    setSelectedHotels(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(sabreId)
      } else {
        next.delete(sabreId)
      }
      return next
    })
  };
  
  // 일괄 AI SEO 생성
  const handleBulkGenerate = async () => {
    if (!onBulkSeoGenerate || selectedHotels.size === 0) return;
    
    setIsBulkGenerating(true);
    setBulkMessage(null);
    try {
      await onBulkSeoGenerate(Array.from(selectedHotels));
      setSelectedHotels(new Set());
      setBulkMessage({ type: 'success', text: 'AI SEO 일괄 생성이 완료되었습니다.' });
    } catch (error) {
      console.error('일괄 SEO 생성 실패:', error);
      setBulkMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '일괄 SEO 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };
  
  const totalPages = Math.ceil(count / limit);
  const isAllSelected = results.length > 0 && results.every(h => selectedHotels.has(String(h.sabre_id)));
  const hasSelection = selectedHotels.size > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 테이블 헤더 정보 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">검색 결과</h3>
            <p className="text-sm text-gray-600 mt-1">
              총 {count.toLocaleString()}개의 호텔이 검색되었습니다
              {totalPages > 1 && (
                <span className="ml-2">
                  (페이지 {currentPage} / {totalPages})
                </span>
              )}
            </p>
          </div>
          {enableSeoManagement && hasSelection && (
            <Button
              onClick={handleBulkGenerate}
              disabled={isBulkGenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isBulkGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI SEO 일괄 생성 중...
                </>
              ) : (
                `AI SEO 일괄 생성 (${selectedHotels.size}개)`
              )}
            </Button>
          )}
        </div>
        {bulkMessage && (
          <div
            className={cn(
              'mt-3 rounded-md px-3 py-2 text-sm',
              bulkMessage.type === 'success' && 'bg-green-50 text-green-700',
              bulkMessage.type === 'error' && 'bg-red-50 text-red-700',
            )}
          >
            {bulkMessage.text}
          </div>
        )}
      </div>

      {/* 반응형 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200" role="table">
          <thead className="bg-gray-50">
            <tr>
              {enableSeoManagement && (
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sabre ID
              </th>
              {showInitialHotels ? (
                <>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔명(한글)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔명(영문)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    체인(영문)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    브랜드(영문)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔 페이지 경로
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate Plan Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔 연결
                  </th>
                </>
              ) : (
                <>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Framer CMS ID (id_old)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔명 (한글)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔명 (영문)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호텔 페이지 경로
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate Plan Code
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((hotel, index) => {
              const hotelId = String(hotel.sabre_id);
              const hotelSabreId = String(hotel.sabre_id);
              const isExpanded = expandedRowId === hotelId;
              const isSelected = selectedHotels.has(hotelSabreId);
              const hotelPageUrl = hotel.slug ? `https://luxury-select.co.kr/hotel/${hotel.slug}` : null;
              
              return (
                <React.Fragment key={`hotel-${hotel.sabre_id}-${hotel.paragon_id}-${index}`}>
                  <tr 
                    onClick={(e) => {
                      // 체크박스 클릭 시에는 행 클릭 이벤트 방지
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                        return;
                      }
                      onRowClick(hotel);
                    }}
                    className={cn(
                      "transition-colors duration-150",
                      enableHotelEdit ? "hover:bg-green-50" : "hover:bg-blue-50 cursor-pointer",
                      isExpanded ? "bg-blue-100" : index % 2 === 0 ? "bg-white" : "bg-gray-50/50",
                      isSelected && "bg-blue-50"
                    )}
                  >
                    {enableSeoManagement && (
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectHotel(hotelSabreId, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {hotel.sabre_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {hotel.sabre_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    {showInitialHotels ? (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.property_name_ko || '한글명 없음'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.property_name_en || '영문명 없음'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {(hotel as any).hotel_brands?.hotel_chains?.chain_name_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {(hotel as any).hotel_brands?.brand_name_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotelPageUrl ? (
                            <a
                              href={hotelPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {hotelPageUrl}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {hotel.rate_plan_code ? (
                            <span className="font-mono text-xs">{hotel.rate_plan_code}</span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {enableChainBrandConnect ? (
                            <div className="relative inline-block">
                              <select
                                disabled={connectingHotelId === hotel.sabre_id || !connectChainId || !connectBrandId}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  const position = parseInt(e.target.value) as 1 | 2 | 3
                                  if (hotel.sabre_id && connectHotelToChainBrand) {
                                    connectHotelToChainBrand(hotel.sabre_id, position)
                                    // 선택 후 초기화
                                    e.target.value = ''
                                  }
                                }}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="" disabled>
                                  {connectingHotelId === hotel.sabre_id ? '연결 중...' : '브랜드 연결'}
                                </option>
                                <option value="1">브랜드1로 연결</option>
                                <option value="2">브랜드2로 연결</option>
                                <option value="3">브랜드3로 연결</option>
                              </select>
                            </div>
                          ) : (
                            <Link
                              href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              연결
                            </Link>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {(hotel as any).id_old ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {(hotel as any).id_old}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {enableHotelEdit ? (
                            <Link
                              href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                              className={cn(
                                'font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-blue-600'
                              )}
                            >
                              {hotel.property_name_ko || '한글명 없음'}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRowClick(hotel);
                              }}
                              className={cn(
                                'font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
                                !hotel.property_name_ko ? 'text-gray-400 italic font-normal focus:ring-0' : ''
                              )}
                              aria-label="호텔명 선택"
                            >
                              {hotel.property_name_ko || '한글명 없음'}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {enableHotelEdit ? (
                            <Link
                              href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                              className={cn(
                                'font-medium hover:underline text-blue-600',
                                !hotel.property_name_en ? 'text-gray-400 italic' : ''
                              )}
                            >
                              {hotel.property_name_en || '영문명 없음'}
                            </Link>
                          ) : (
                            hotel.property_name_en ? (
                              <div className="font-medium">{hotel.property_name_en}</div>
                            ) : (
                              <span className="text-gray-400 italic">영문명 없음</span>
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotelPageUrl ? (
                            <a
                              href={hotelPageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {hotelPageUrl}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const ratePlanCodes = parseRatePlanCode(hotel.rate_plan_code);
                              if (ratePlanCodes.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {ratePlanCodes.map((code, idx) => 
                                      enableHotelEdit ? (
                                        <Link 
                                          href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:underline"
                                        >
                                          {code}
                                        </Link>
                                      ) : (
                                        <span 
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                        >
                                          {code}
                                        </span>
                                      )
                                    )}
                                  </div>
                                );
                              } else {
                                return enableHotelEdit ? (
                                  <Link
                                    href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                    className="text-gray-400 italic hover:underline"
                                  >
                                    N/A
                                  </Link>
                                ) : (
                                  <span className="text-gray-400 italic">N/A</span>
                                );
                              }
                            })()}
                            <div className="ml-auto">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                  
                  {/* 확장 패널 */}
                  {isExpanded && expandedRowState && (
                    <tr>
                      <td colSpan={showInitialHotels ? (enableSeoManagement ? 9 : 8) : (enableSeoManagement ? 7 : 6)} className="p-0">
                        <div className="bg-gray-50 border-t border-gray-200">
                          <div className="px-6 py-6">
                            {/* 이미지 관리 모드 */}
                            {expandedRowState.type === 'image-management' && expandedRowState.hotel && imageManagementState && (
                              <ImageManagementPanel 
                                hotel={expandedRowState.hotel}
                                hotelId={hotelId}
                                state={imageManagementState[hotelId]}
                                onToggleEditMode={toggleImageEditMode}
                                onSaveImageUrls={saveImageUrls}
                                onCreateStorageFolder={createStorageFolder}
                                onCheckStorageFolder={checkStorageFolder}
                                onLoadStorageImages={loadStorageImages}
                              />
                            )}

                            {/* URL 생성 모드 */}
                            {expandedRowState.type === 'url-generation' && expandedRowState.hotel && (
                              <UrlGeneratorPanel
                                hotel={expandedRowState.hotel}
                                hotelId={hotelId}
                                onClose={() => {
                                  setExpandedRowId(null);
                                  setExpandedRowState(null);
                                }}
                                initialSelectedCodes={expandedRowState.selectedRatePlanCodes}
                                dbCodes={expandedRowState.originalRatePlanCodes}
                                ratePlanButtonText={ratePlanButtonText}
                                roomListTitle={roomListTitle}
                                useProductCodeTableFormat={useProductCodeTableFormat}
                              />
                            )}

                            {/* SEO 관리 모드 */}
                            {expandedRowState.type === 'seo-management' && expandedRowState.hotel && (
                              <SeoManagementPanel
                                hotel={expandedRowState.hotel}
                                hotelId={hotelId}
                                initialSeoData={expandedRowState.seoData}
                                onUpdate={onSeoUpdate}
                                onGenerate={onSeoGenerate}
                              />
                            )}
                            
                            {/* 기존 패널 (호텔 상세 정보 테스트) */}
                            {expandedRowState.type !== 'image-management' && expandedRowState.type !== 'url-generation' && expandedRowState.type !== 'seo-management' && updateExpandedRowState && handleTestHotelDetails && (
                              <>
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-lg font-medium text-gray-900">
                                    호텔 상세 정보 테스트
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedRowId(null);
                                      setExpandedRowState(null);
                                    }}
                                    className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                                    aria-label="패널 닫기"
                                  >
                                    <X className="h-5 w-5 text-gray-500" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                      Start Date
                                    </label>
                                    <DateInput
                                      name="startDate"
                                      value={expandedRowState.startDate}
                                      onChange={(e) => {
                                        const v = e.currentTarget.value
                                        if (!v) {
                                          updateExpandedRowState({ startDate: v })
                                          return
                                        }
                                        const parts = v.split('-').map((n) => Number(n))
                                        if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
                                          const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
                                          dt.setUTCDate(dt.getUTCDate() + 1)
                                          const next = dt.toISOString().slice(0, 10)
                                          updateExpandedRowState({ startDate: v, endDate: next })
                                        } else {
                                          updateExpandedRowState({ startDate: v })
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                      End Date
                                    </label>
                                    <DateInput
                                      name="endDate"
                                      value={expandedRowState.endDate}
                                      onChange={(e) => updateExpandedRowState({ endDate: e.currentTarget.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor="adults" className="block text-sm font-medium text-gray-700 mb-2">
                                      Adults
                                    </label>
                                    <input
                                      id="adults"
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={expandedRowState.adults}
                                      onChange={(e) => updateExpandedRowState({ adults: parseInt(e.target.value) || 1 })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor="currencyCode" className="block text-sm font-medium text-gray-700 mb-2">
                                      Currency Code
                                    </label>
                                    <select
                                      id="currencyCode"
                                      value={expandedRowState.currencyCode}
                                      onChange={(e) => updateExpandedRowState({ currencyCode: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="KRW">KRW</option>
                                      <option value="USD">USD</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="mt-6">
                                  <RatePlanCodeSelector
                                    selectedCodes={expandedRowState.selectedRatePlanCodes}
                                    dbCodes={expandedRowState.originalRatePlanCodes}
                                    onChange={(codes) => updateExpandedRowState({ selectedRatePlanCodes: codes })}
                                    description="DB 현재 설정값은 녹색 뱃지로 표시됩니다."
                                  />
                                </div>

                                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                                  <button
                                    onClick={handleTestHotelDetails}
                                    disabled={expandedRowState.isLoading}
                                    className={cn(
                                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                                      "bg-blue-600 text-white hover:bg-blue-700",
                                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    {expandedRowState.isLoading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        조회 중...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-2" />
                                        호텔 상세 조회 테스트
                                      </>
                                    )}
                                  </button>
                                  
                                  {expandedRowState.isSaving && (
                                    <span className="flex items-center text-sm text-gray-500">
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Rate Plan Code 저장 중...
                                    </span>
                                  )}
                                  {expandedRowState.saveSuccess && (
                                    <span className="flex items-center text-sm text-green-600 animate-in fade-in">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      저장 완료!
                                    </span>
                                  )}
                                </div>

                                {expandedRowState.error && (
                                  <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <h3 className="font-medium">오류가 발생했습니다</h3>
                                      <p className="text-sm mt-1">{expandedRowState.error}</p>
                                    </div>
                                  </div>
                                )}

                                {expandedRowState.testResult && (
                                  <>
                                    <div className="mt-6 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-lg font-medium text-gray-900">조회 결과</h5>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            try {
                                              const text = formatJson(expandedRowState.testResult)
                                              navigator.clipboard?.writeText(text)
                                              setInternalCopied(true)
                                              setTimeout(() => setInternalCopied(false), 1500)
                                            } catch {}
                                          }}
                                          className="text-gray-600"
                                        >
                                          {internalCopied ? (
                                            <>
                                              <Check className="h-4 w-4 mr-2" />
                                              복사됨
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="h-4 w-4 mr-2" />
                                              JSON 복사
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[500px]">
                                        <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                          {formatJson(expandedRowState.testResult)}
                                        </pre>
                                      </div>
                                    </div>

                                    {/* 지정 경로 테이블 (AmountAfterTax 오름차순, 마크다운 스타일) */}
                                    {(() => {
                                      const rows = extractRatePlanTableRows(expandedRowState.testResult)
                                      if (rows.length === 0) {
                                        return (
                                          <div className="mt-6 rounded-lg border bg-white">
                                            <div className="px-4 py-2 border-b text-sm font-medium">RatePlan Table (sorted by AmountAfterTax)</div>
                                            <div className="p-4 text-sm text-gray-600">선택한 일자와 조건에 요금이 없습니다.</div>
                                          </div>
                                        )
                                      }
                                      const sorted = [...rows].sort((a, b) => {
                                        const ax = a.amountAfterTax === '' ? Number.POSITIVE_INFINITY : (a.amountAfterTax as number)
                                        const bx = b.amountAfterTax === '' ? Number.POSITIVE_INFINITY : (b.amountAfterTax as number)
                                        return ax - bx
                                      })
                                      return (
                                        <div className="mt-6 rounded-lg border bg-white">
                                          <div className="px-4 py-2 border-b text-sm font-medium">RatePlan Table (sorted by AmountAfterTax)</div>
                                          <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RateKey</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RoomType</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RoomName</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Currency</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">AmountAfterTax</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">AmountBeforeTax</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Taxes</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Fees</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Refundable</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">CancelOffset</th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-gray-100">
                                                {sorted.map((r, i) => (
                                                  <tr key={`table-${i}`} className="hover:bg-blue-100 transition-colors duration-75">
                                                    <td className="px-4 py-2 align-top text-xs font-mono text-gray-800">{r.rateKey ? (r.rateKey.length > 10 ? `${r.rateKey.slice(0,10)}...` : r.rateKey) : ''}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.roomType}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.roomName}</td>
                                                    <td className="px-4 py-2 align-top text-xs text-gray-700 break-words">{r.description}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.currency}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.amountAfterTax === '' ? '' : (r.amountAfterTax as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.amountBeforeTax === '' ? '' : (r.amountBeforeTax as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.taxes === '' ? '' : (r.taxes as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.fees === '' ? '' : (r.fees as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.refundable}</td>
                                                    <td className="px-4 py-2 align-top text-xs text-gray-900">{r.cancelOffset}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 페이지네이션 */}
      {onPageChange && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {((currentPage - 1) * limit + 1).toLocaleString()} - {Math.min(currentPage * limit, count).toLocaleString()} / {count.toLocaleString()}개
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                이전
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1"
              >
                다음
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
