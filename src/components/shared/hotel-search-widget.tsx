'use client';

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { Search, Loader2, Building2, AlertCircle, CheckCircle, ChevronDown, ChevronUp, X, Play } from 'lucide-react';
import { cn, getDateAfterDays, formatJson } from '@/lib/utils';
import { BaseButton } from '@/components/shared/form-actions'
import DateInput from '@/components/shared/date-input'
import { HotelSearchResult, HotelSearchApiResponse, RatePlanCodesApiResponse, ExpandedRowState, HotelDetailsRequest } from '@/types/hotel';
import Link from 'next/link';

interface HotelSearchWidgetProps {
  /** 위젯의 타이틀 */
  title?: string;
  /** 위젯의 설명 */
  description?: string;
  /** 컨테이너 클래스명 */
  className?: string;
  /** 헤더를 숨길지 여부 */
  hideHeader?: boolean;
  /** 호텔 편집 모드 (호텔명 클릭시 상세 편집 페이지로 이동) */
  enableHotelEdit?: boolean;
  /** 초기 로딩 시 최신 호텔 리스트 표시 */
  showInitialHotels?: boolean;
  /** 호텔 선택 시 콜백 함수 */
  onHotelSelect?: (sabreId: string) => void;
}

export default function HotelSearchWidget({ 
  title = "호텔 검색", 
  description = "호텔 데이터베이스에서 호텔을 검색하고 관리하세요",
  className = "",
  hideHeader = false,
  enableHotelEdit = false,
  showInitialHotels = false,
  onHotelSelect
}: HotelSearchWidgetProps) {
  // State 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState(false);
  // 입력 제안 상태
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suppressSuggest, setSuppressSuggest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const firstResultRef = useRef<HTMLButtonElement | null>(null);
  
  // 확장 패널 관련 state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedRowState, setExpandedRowState] = useState<ExpandedRowState | null>(null);
  const [allRatePlanCodes, setAllRatePlanCodes] = useState<string[]>([]);
  const [ratePlanCodesLoading, setRatePlanCodesLoading] = useState(false);

  // 날짜 포맷팅 함수 (YYYY-MM-DD)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '-';
    }
  };

  // 검색 핸들러 + 외부 호출 함수로 분리 (자동완성 Enter 선택 시 재사용)
  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setError('호텔명을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);
    setOpenSuggest(false);
    setSuppressSuggest(true);

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searching_string: term }),
      });

      if (!response.ok) {
        const errorText = await response.text()
        setError(`서버 오류 (${response.status}): ${errorText}`)
        return
      }

      const data: HotelSearchApiResponse = await response.json().catch(() => {
        setError('서버 응답을 파싱할 수 없습니다.')
        return null
      })

      if (!data) return

      if (!data.success) {
        setError(data.error || '검색에 실패했습니다.');
        return;
      }

      setResults(data.data || []);
      setCount(data.count || 0);
    } catch (err) {
      console.error('Search error:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setOpenSuggest(false);
    setSuggestions([]);
    await performSearch(searchTerm);
  };

  // 검색 결과 초기화
  const handleReset = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
    setCount(0);
    setHasSearched(false);
    setExpandedRowId(null);
    setExpandedRowState(null);
    setSuggestions([]);
    setOpenSuggest(false);
  };

  // Rate Plan Codes 가져오기
  useEffect(() => {
    const fetchRatePlanCodes = async () => {
      setRatePlanCodesLoading(true);
      try {
        const response = await fetch('/api/rate-plan-codes', {
          cache: 'no-store'
        });

        if (!response.ok) {
          console.error('Rate plan codes fetch failed:', response.status, await response.text())
          return
        }

        const data: RatePlanCodesApiResponse = await response.json().catch(() => {
          console.error('Failed to parse rate plan codes response')
          return null
        })

        if (!data) return
        
        if (data.success && data.data) {
          setAllRatePlanCodes(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch rate plan codes:', error);
      } finally {
        setRatePlanCodesLoading(false);
      }
    };

    fetchRatePlanCodes();
  }, []);

  // 초기 호텔 리스트 로딩
  useEffect(() => {
    if (showInitialHotels) {
      loadInitialHotels();
    }
  }, [showInitialHotels]);

  const loadInitialHotels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searching_string: ''
        }),
      });

      if (!response.ok) {
        const errorText = await response.text()
        setError(`서버 오류 (${response.status}): ${errorText}`)
        return
      }

      const data: HotelSearchApiResponse = await response.json().catch(() => {
        setError('서버 응답을 파싱할 수 없습니다.')
        return null
      })

      if (!data) return

      if (!data.success) {
        setError(data.error || '초기 호텔 리스트를 불러올 수 없습니다.');
        return;
      }

      setResults(data.data || []);
      setCount(data.count || 0);
      setHasSearched(true);
    } catch (error) {
      console.error('Initial hotels loading failed:', error);
      setError('초기 호텔 리스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 호텔명 입력 제안 - 호텔 업데이트(영문명)과 동일 UX
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      setOpenSuggest(false);
      abortRef.current?.abort();
      return;
    }
    if (suppressSuggest) {
      // 검색 직후에는 자동완성 표시를 잠시 억제
      setOpenSuggest(false);
      setLoadingSuggest(false);
      return;
    }
    setLoadingSuggest(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const url = `/api/hotel/suggest?field=all&q=${encodeURIComponent(searchTerm)}&limit=8`;
        const res = await fetch(url, { signal: controller.signal });
        
        if (!res.ok) {
          console.error('Suggestions fetch failed:', res.status)
          return
        }

        const json = await res.json().catch(() => {
          console.error('Failed to parse suggestions response')
          return null
        })

        if (json && json.success) {
          setSuggestions(json.data || []);
          setOpenSuggest(true);
        } else {
          setSuggestions([]);
          setOpenSuggest(false);
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggest(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm, suppressSuggest]);

  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const onSelectSuggestion = (value: string) => {
    setSearchTerm(value);
    setOpenSuggest(false);
    setHighlightIndex(-1);
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openSuggest && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpenSuggest(true);
    }
    if (e.key === 'Tab') {
      if (results.length > 0) {
        e.preventDefault();
        firstResultRef.current?.focus();
        return;
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        if (prev === -1) return Math.max(0, suggestions.length - 1);
        const next = prev - 1;
        return next < 0 ? Math.max(0, suggestions.length - 1) : next;
      });
    } else if (e.key === 'Enter') {
      if (openSuggest && suggestions.length > 0 && highlightIndex !== -1) {
        e.preventDefault();
        const chosen = suggestions[highlightIndex];
        setSearchTerm(chosen);
        setOpenSuggest(false);
        setHighlightIndex(-1);
        await performSearch(chosen);
      }
    } else if (e.key === 'Escape') {
      setOpenSuggest(false);
      setHighlightIndex(-1);
    }
  };


  
  // 행 클릭 핸들러 (확장 패널 토글 또는 호텔 편집 페이지 이동)
  const handleRowClick = (hotel: HotelSearchResult) => {
    // onHotelSelect 콜백이 있는 경우 호출
    if (onHotelSelect && hotel.sabre_id) {
      onHotelSelect(hotel.sabre_id);
      return;
    }

    // 호텔 편집 모드가 활성화된 경우 확장 패널을 열지 않음
    if (enableHotelEdit) {
      // Link 컴포넌트가 이미 처리하므로 별도 처리 불필요
      return;
    }

    const hotelId = `${hotel.sabre_id}-${hotel.paragon_id}`;
    
    if (expandedRowId === hotelId) {
      // 이미 열린 패널이면 닫기
      setExpandedRowId(null);
      setExpandedRowState(null);
    } else {
      // 새 패널 열기
      setExpandedRowId(hotelId);
      setExpandedRowState({
        hotelId,
        currencyCode: 'KRW',
        adults: 2,
        startDate: getDateAfterDays(14),
        endDate: getDateAfterDays(15),
        selectedRatePlanCodes: hotel.rate_plan_codes || [],
        originalRatePlanCodes: hotel.rate_plan_codes || [],
        isLoading: false,
        isSaving: false,
        testResult: null,
        error: null,
        saveSuccess: false
      });
    }
  };

  // 확장 패널 입력 업데이트 핸들러
  const updateExpandedRowState = (updates: Partial<ExpandedRowState>) => {
    if (expandedRowState) {
      setExpandedRowState(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Rate Plan Code 체크박스 토글 핸들러
  const toggleRatePlanCode = (code: string) => {
    if (!expandedRowState) return;
    
    const currentCodes = expandedRowState.selectedRatePlanCodes;
    const updatedCodes = currentCodes.includes(code)
      ? currentCodes.filter(c => c !== code)
      : [...currentCodes, code];
    
    updateExpandedRowState({ selectedRatePlanCodes: updatedCodes });
  };

  // 외부 API 호출 핸들러
  const handleTestApi = async () => {
    if (!expandedRowState) return;
    
    const currentHotel = results.find(h => 
      `${h.sabre_id}-${h.paragon_id}` === expandedRowState.hotelId
    );
    
    if (!currentHotel?.sabre_id) {
      updateExpandedRowState({ 
        error: 'Sabre ID가 없어서 테스트할 수 없습니다.' 
      });
      return;
    }

    updateExpandedRowState({ 
      isLoading: true, 
      error: null, 
      testResult: null 
    });

    try {
      const requestBody: HotelDetailsRequest = {
        HotelCode: `${currentHotel.sabre_id}`,
        CurrencyCode: expandedRowState.currencyCode,
        StartDate: expandedRowState.startDate,
        EndDate: expandedRowState.endDate,
        Adults: expandedRowState.adults
      };

      // rate plan codes가 있는 경우에만 RatePlanCode와 ExactMatchOnly 필드 추가
      if (expandedRowState.selectedRatePlanCodes.length > 0) {
        requestBody.RatePlanCode = expandedRowState.selectedRatePlanCodes;
        requestBody.ExactMatchOnly = true;
      }

      const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // 응답을 먼저 텍스트로 받기
      const responseText = await response.text();
      
      try {
        // JSON 파싱 시도
        const result = JSON.parse(responseText);
        updateExpandedRowState({ 
          testResult: result,
          isLoading: false 
        });
      } catch {
        // JSON 파싱 실패시 raw 텍스트를 결과로 표시
        updateExpandedRowState({ 
          testResult: responseText,
          isLoading: false 
        });
      }

    } catch (error) {
      console.error('API test failed:', error);
      updateExpandedRowState({ 
        error: `API 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false 
      });
    }
  };

  // Rate Plan Codes 저장 핸들러
  const handleSaveRatePlanCodes = async () => {
    if (!expandedRowState) return;
    
    const currentHotel = results.find(h => 
      `${h.sabre_id}-${h.paragon_id}` === expandedRowState.hotelId
    );
    
    if (!currentHotel) {
      updateExpandedRowState({ 
        error: '호텔 정보를 찾을 수 없습니다.' 
      });
      return;
    }

    updateExpandedRowState({ 
      isSaving: true, 
      error: null,
      saveSuccess: false
    });

    try {
      const response = await fetch('/api/hotel/update-rate-plan-codes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: currentHotel.sabre_id,
          paragon_id: currentHotel.paragon_id,
          rate_plan_codes: expandedRowState.selectedRatePlanCodes
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        updateExpandedRowState({ 
          error: result.error || 'Rate Plan Codes 저장에 실패했습니다.',
          isSaving: false 
        });
        return;
      }

      // 성공시 results 배열의 해당 호텔 정보도 업데이트
      setResults(prevResults => 
        prevResults.map(hotel => 
          `${hotel.sabre_id}-${hotel.paragon_id}` === expandedRowState.hotelId
            ? { ...hotel, rate_plan_codes: expandedRowState.selectedRatePlanCodes }
            : hotel
        )
      );
      
      updateExpandedRowState({ 
        isSaving: false,
        error: null,
        saveSuccess: true,
        originalRatePlanCodes: expandedRowState.selectedRatePlanCodes
      });

      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        updateExpandedRowState({ saveSuccess: false });
      }, 3000);
      
    } catch (error) {
      console.error('Save rate plan codes failed:', error);
      updateExpandedRowState({ 
        error: 'Rate Plan Codes 저장 중 오류가 발생했습니다.',
        isSaving: false 
      });
    }
  };

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

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {!hideHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-blue-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          </div>
        </div>
      )}

      {/* 검색 폼 - 고정 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-shrink-0">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label 
              htmlFor="hotel-search" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              호텔명 검색
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="hotel-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSuppressSuggest(false); }}
                  placeholder="호텔명을 입력하세요 (한글/영문/Sabre ID)"
                  autoComplete="off"
                  onKeyDown={onKeyDown}
                  disabled={loading}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "disabled:bg-gray-50 disabled:cursor-not-allowed",
                    "text-sm"
                  )}
                  aria-describedby="hotel-search-description"
                />
                {openSuggest && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow">
                    <ul className="divide-y">
                      {suggestions.map((s: string, idx: number) => (
                        <li key={s}>
                          <button
                            type="button"
                            className={cn(
                              'block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50',
                              idx === highlightIndex ? 'bg-gray-100' : ''
                            )}
                            onClick={() => onSelectSuggestion(s)}
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                      {loadingSuggest && suggestions.length === 0 && (
                        <li className="px-3 py-2 text-xs text-gray-500">불러오는 중...</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600",
                  "transition-colors duration-200"
                )}
                aria-label="호텔 검색"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
                aria-label="검색 초기화"
              >
                초기화
              </button>
            </div>
            <p id="hotel-search-description" className="text-xs text-gray-500 mt-1">
              한글명, 영문명, Sabre ID 로 검색할 수 있습니다
            </p>
          </div>
        </form>
      </div>

      {/* 결과 영역 - 스크롤 가능 */}
      <div className="flex-1 overflow-auto space-y-4">
        {/* 에러 메시지 */}
        {error && (
          <div 
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium">오류가 발생했습니다</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 검색 결과 카운트 */}
        {count > 0 && (
          <div 
            className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium">검색 완료</h3>
              <p className="text-sm mt-1">총 <strong>{count.toLocaleString()}</strong>개의 호텔을 찾았습니다.</p>
            </div>
          </div>
        )}

        {/* 검색 결과 테이블 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 테이블 헤더 정보 */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">검색 결과</h3>
            <p className="text-sm text-gray-600 mt-1">
              {count.toLocaleString()}개의 호텔이 검색되었습니다
            </p>
          </div>

          {/* 반응형 테이블 */}
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Sabre ID
                  </th>
                  {showInitialHotels ? (
                    <>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명(한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명(영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        업데이트 날짜
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        체인(한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        브랜드(한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔 연결
                      </th>
                    </>
                  ) : (
                    <>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paragon ID
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명 (한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명 (영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Rate Plan Code
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((hotel, index) => {
                  const hotelId = `${hotel.sabre_id}-${hotel.paragon_id}`;
                  const isExpanded = expandedRowId === hotelId;
                  
                  return (
                    <React.Fragment key={`hotel-${hotel.sabre_id}-${hotel.paragon_id}-${index}`}>
                      <tr 
                        onClick={() => handleRowClick(hotel)}
                        className={cn(
                          "transition-colors duration-150",
                          enableHotelEdit ? "hover:bg-green-50" : "hover:bg-blue-50 cursor-pointer",
                          isExpanded ? "bg-blue-100" : index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        )}
                      >
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
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(hotel.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.chain_name_kr || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.brand_name_kr || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Link
                            href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            연결
                          </Link>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {hotel.paragon_id ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {hotel.paragon_id}
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
                                'font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
                                !hotel.property_name_ko ? 'text-gray-400 italic font-normal' : 'text-blue-600'
                              )}
                            >
                              {hotel.property_name_ko || '한글명 없음'}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              ref={index === 0 ? firstResultRef : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(hotel);
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
                                'font-medium hover:underline',
                                !hotel.property_name_en ? 'text-gray-400 italic' : 'text-blue-600'
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
                          <div className="flex items-center gap-2">
                            {hotel.rate_plan_codes && hotel.rate_plan_codes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {hotel.rate_plan_codes.map((code, idx) => 
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
                            ) : enableHotelEdit ? (
                              <Link
                                href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                className="text-gray-400 italic hover:underline"
                              >
                                N/A
                              </Link>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
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
                          <td colSpan={5} className="px-0 py-0 w-full max-w-full overflow-x-hidden">
                            <div className="bg-gray-50 border-t border-gray-200 w-full max-w-full">
                              <div className="px-6 py-6 w-full max-w-full">
                                {/* 패널 헤더 */}
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

                                {/* 1행: Start Date, End Date, Adults, Currency Code */}
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
                                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                                      Currency Code
                                    </label>
                                    <input
                                      id="currency"
                                      type="text"
                                      value={expandedRowState.currencyCode}
                                      onChange={(e) => updateExpandedRowState({ currencyCode: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="KRW"
                                    />
                                  </div>
                                </div>

                                {/* 2행: Rate Plan Codes */}
                                <div className="mt-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Rate Plan Codes
                                    </label>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          DB
                                        </span>
                                        <span>현재 설정값</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="w-3 h-3 bg-gray-300 rounded"></span>
                                        <span>기타</span>
                                      </div>
                                    </div>
                                  </div>
                                  {ratePlanCodesLoading ? (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Loading rate plan codes...
                                    </div>
                                  ) : allRatePlanCodes.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                                      {allRatePlanCodes.map((code) => {
                                        const isInOriginalDb = expandedRowState.originalRatePlanCodes.includes(code);
                                        const isCurrentlySelected = expandedRowState.selectedRatePlanCodes.includes(code);
                                        
                                        return (
                                          <label key={code} className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              checked={isCurrentlySelected}
                                              onChange={() => toggleRatePlanCode(code)}
                                              className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className={cn(
                                              "text-sm flex items-center gap-1",
                                              isInOriginalDb ? "text-gray-900 font-medium" : "text-gray-500"
                                            )}>
                                              {code}
                                              {isInOriginalDb && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                  DB
                                                </span>
                                              )}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      Rate plan codes를 불러올 수 없습니다.
                                    </div>
                                  )}
                                </div>

                                {/* 버튼 영역 */}
                                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                                  <button
                                    onClick={handleTestApi}
                                    disabled={expandedRowState.isLoading}
                                    className={cn(
                                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                                      "bg-green-600 text-white hover:bg-green-700",
                                      "focus:outline-none focus:ring-2 focus:ring-green-500",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    {expandedRowState.isLoading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Testing...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-2" />
                                        Test API
                                      </>
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={handleSaveRatePlanCodes}
                                    disabled={expandedRowState.isLoading || expandedRowState.isSaving}
                                    className={cn(
                                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                                      expandedRowState.saveSuccess 
                                        ? "bg-green-600 text-white" 
                                        : "bg-blue-600 text-white hover:bg-blue-700",
                                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    {expandedRowState.isSaving ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                      </>
                                    ) : expandedRowState.saveSuccess ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Saved Successfully!
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Save Rate Plan Codes
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* 에러 표시 */}
                                {expandedRowState.error && (
                                  <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex items-start">
                                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                      <div className="ml-2">
                                        <h5 className="text-sm font-medium text-red-800">오류</h5>
                                        <p className="text-sm text-red-700 mt-1">{expandedRowState.error}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* JSON 결과 화면 (맨 아래 고정 영역) */}
                                {!!expandedRowState.testResult && (
                                  <>
                                    <div className="mt-6 h-96 overflow-auto max-w-full">
                                      <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto max-w-full">
                                        {formatJson(expandedRowState.testResult)}
                                      </pre>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                      <BaseButton
                                        aria-label="JSON 복사"
                                        size="xs"
                                        className={cn(
                                          copied ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                                        )}
                                        onClick={() => {
                                          try {
                                            const text = formatJson(expandedRowState.testResult)
                                            navigator.clipboard?.writeText(text)
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 1500)
                                          } catch {}
                                        }}
                                      >
                                        {copied ? '복사 완료' : 'JSON 복사'}
                                      </BaseButton>
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

                                {/* 초기 상태 */}
                                {!expandedRowState.testResult && !expandedRowState.error && !expandedRowState.isLoading && (
                                  <div className="mt-6 text-center py-8 text-gray-500">
                                    <Play className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">Test 버튼을 클릭하여 API를 테스트하세요</p>
                                  </div>
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
        </div>
      )}

        {/* 빈 결과 메시지 */}
        {!loading && hasSearched && count === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600 mb-4">
              &lsquo;<strong>{searchTerm}</strong>&rsquo; 검색어로 일치하는 호텔을 찾을 수 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              다른 키워드로 검색해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
