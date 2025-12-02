import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Link2, Loader2, MapPin, X, RefreshCw, AlertCircle, Check, Users, Play, CheckCircle, Maximize2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { RatePlanCodeSelector } from "./rate-plan-code-selector";
import { HotelSearchResult } from "./hotel-search-widget";
import DateInput from "@/components/shared/date-input";
import { Modal } from "@/components/shared/modal";

// 기존 RoomUrlManager의 헬퍼 함수들을 가져옴
function getDefaultDate(daysToAdd: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

// 안전한 깊은 접근 헬퍼 (배열 경로 지원) - hotel-list-table.tsx와 동일한 방식
function getDeepValue(obj: unknown, keys: string[]): unknown {
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

// JSON 응답에서 Room 데이터를 테이블 행으로 추출
function extractRoomTableRows(rawResponse: string | null): RoomTableRow[] {
  if (!rawResponse) return [];
  
  // HTML 응답 감지 (에러 페이지 등)
  if (typeof rawResponse === 'string' && rawResponse.trim().startsWith('<!DOCTYPE')) {
    console.warn('[extractRoomTableRows] HTML 응답 감지됨 (JSON이 아님)');
    return [];
  }
  
  let parsed: unknown;
  try {
    parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
  } catch (e) {
    console.error('[extractRoomTableRows] JSON 파싱 실패:', e);
    // HTML 응답인지 추가 확인
    if (typeof rawResponse === 'string' && (rawResponse.includes('<!DOCTYPE') || rawResponse.includes('<html'))) {
      console.warn('[extractRoomTableRows] HTML 응답으로 확인됨');
    }
    return [];
  }

  const rows: RoomTableRow[] = [];
  
  // hotel-list-table.tsx와 동일한 방식으로 직접 경로 접근
  const root = getDeepValue(parsed, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo', 'Rooms', 'Room']);
  if (!root) {
    console.log('[extractRoomTableRows] Room 데이터 없음');
    return rows;
  }
  
  const roomArray: unknown[] = Array.isArray(root) ? root : [root];

  roomArray.forEach((room) => {
    const r = room as Record<string, unknown>;
    
    // 각 Room에 대해 첫 번째 RatePlan 사용
    const plansNode = getDeepValue(r, ['RatePlans', 'RatePlan']);
    if (!plansNode) return;
    
    const plans: unknown[] = Array.isArray(plansNode) ? plansNode : [plansNode];
    const firstPlan = plans[0] as Record<string, unknown> || {};

    // 필드 추출
    const roomViewDescription = (r.RoomViewDescription as string) || '';
    
    // BedTypeDescription: BedTypeOptions.BedTypes[0].BedType[0].Description
    const bedTypes = getDeepValue(r, ['BedTypeOptions', 'BedTypes']);
    const bedTypesArray = Array.isArray(bedTypes) ? bedTypes : (bedTypes ? [bedTypes] : []);
    const firstBedType = bedTypesArray[0] as Record<string, unknown> | undefined;
    const bedType = firstBedType?.BedType;
    const bedTypeArray = Array.isArray(bedType) ? bedType : (bedType ? [bedType] : []);
    const bedTypeObj = bedTypeArray[0] as Record<string, unknown> | undefined;
    const bedTypeDescription = (bedTypeObj?.Description as string) || '';
    
    const ratePlanName = (firstPlan.RatePlanName as string) || '';
    const ratePlanCode = (firstPlan.RatePlanCode as string) || '';
    const rateKey = (firstPlan.RateKey as string) || '';
    const productCode = (firstPlan.ProductCode as string) || '';
    const convertedRateInfo = firstPlan.ConvertedRateInfo as Record<string, unknown> || {};
    const amountAfterTax = convertedRateInfo.AmountAfterTax || '';
    const averageNightlyRate = convertedRateInfo.AverageNightlyRate || '';
    const currencyCode = (convertedRateInfo.CurrencyCode as string) || '';
    
    const roomDescription = r.RoomDescription as Record<string, unknown> || {};
    const roomName = (roomDescription.Name as string) || '';
    const descSrc = roomDescription.Text;
    const roomText = Array.isArray(descSrc) 
      ? ((descSrc[0] as string) || '')
      : ((descSrc as string) || '');

    rows.push({
      roomViewDescription,
      bedTypeDescription,
      ratePlanName,
      ratePlanCode,
      rateKey,
      productCode,
      amountAfterTax,
      averageNightlyRate,
      currencyCode,
      roomName,
      roomText,
    });
  });

  console.log('[extractRoomTableRows] 추출된 Room 행 수:', rows.length);
  return rows;
}

interface RatePlanRow {
  id: string
  ratePlanCode: string
  ratePlanName: string | null
  rateKey: string
  roomType: string
  roomName: string
  description: string
  currency: string
  amountAfterTax: number | ""
  amountBeforeTax: number | ""
}

interface RoomTableRow {
  roomViewDescription: string
  bedTypeDescription: string
  ratePlanName: string
  ratePlanCode: string
  rateKey: string
  productCode: string
  amountAfterTax: string | number
  averageNightlyRate: string | number
  currencyCode: string
  roomName: string
  roomText: string
}

// RoomText에서 방 개수를 추출하는 함수
function extractRoomType(roomText: string): string {
  if (!roomText) return '-';
  
  // "BDR" 또는 "BEDROOMS"가 포함된 패턴 찾기
  // 예: "2 BDR", "3 BEDROOMS", "2BDR", "3BEDROOMS" 등
  const patterns = [
    /(\d+)\s*BDR/i,        // "2 BDR" 또는 "2BDR"
    /(\d+)\s*BEDROOMS/i,   // "2 BEDROOMS" 또는 "2BEDROOMS"
    /(\d+)\s*BED\s*ROOMS/i, // "2 BED ROOMS"
  ];

  for (const pattern of patterns) {
    const match = roomText.match(pattern);
    if (match && match[1]) {
      const roomCount = parseInt(match[1], 10);
      if (!isNaN(roomCount) && roomCount > 0) {
        return `${roomCount}룸`;
      }
    }
  }

  return '-';
}

const DEFAULT_BASE_URL = "https://select3-admin.example.com/api/rooms/url"

interface UrlGeneratorPanelProps {
  hotel: HotelSearchResult;
  hotelId: string;
  onClose: () => void;
  // 부모 컴포넌트(HotelSearchWidget)에서 이미 파싱된 코드를 전달받음
  initialSelectedCodes?: string[];
  dbCodes?: string[];
}

export function UrlGeneratorPanel({ 
  hotel, 
  hotelId, 
  onClose,
  initialSelectedCodes = [],
  dbCodes = []
}: UrlGeneratorPanelProps) {
  const [checkInDate, setCheckInDate] = useState(getDefaultDate(14));
  const [checkOutDate, setCheckOutDate] = useState(getDefaultDate(15));
  const [adults, setAdults] = useState("2");
  const [children, setChildren] = useState("0");
  const [ratePlans, setRatePlans] = useState<RatePlanRow[]>([]);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [activeRatePlanId, setActiveRatePlanId] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  
  // Rate Plan Codes 관리
  // 부모로부터 받은 초기값으로 상태 설정
  const [selectedRatePlanCodes, setSelectedRatePlanCodes] = useState<string[]>(initialSelectedCodes);
  const [availableRatePlanCodes, setAvailableRatePlanCodes] = useState<string[]>([]);
  const [hotelRatePlanCodes, setHotelRatePlanCodes] = useState<string[]>(dbCodes);

  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [roomCode, setRoomCode] = useState("");
  const [ratePlanCode, setRatePlanCode] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isTablePopupOpen, setIsTablePopupOpen] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  // 부모에서 전달받은 props가 변경되면 상태 업데이트 (예: 다른 호텔 선택 시)
  useEffect(() => {
    setHotelRatePlanCodes(dbCodes);
    setSelectedRatePlanCodes(initialSelectedCodes);
  }, [dbCodes, initialSelectedCodes, hotelId]); // hotelId가 바뀌면 확실히 리셋

  // Rate Plan Codes 로드 완료 시 핸들러
  const handleCodesLoaded = (codes: string[]) => {
    setAvailableRatePlanCodes(codes);
  };

  const selectedPlan = useMemo(
    () => ratePlans.find((plan) => plan.id === activeRatePlanId) ?? null,
    [ratePlans, activeRatePlanId]
  );

  // JSON 응답에서 Room 테이블 데이터 추출
  const roomTableRows = useMemo(() => {
    const rows = extractRoomTableRows(rawResponse);
    console.log('[UrlGeneratorPanel] roomTableRows 추출:', {
      rawResponseExists: !!rawResponse,
      rawResponseType: typeof rawResponse,
      rowsCount: rows.length,
      firstRow: rows[0]
    });
    return rows;
  }, [rawResponse]);

  // 테이블 렌더링 함수
  const renderRoomTable = (isInPopup: boolean = false) => {
    return (
      <div className={isInPopup ? "w-full" : "overflow-x-auto"}>
        <table className={`w-full border-collapse border border-gray-200 ${isInPopup ? 'text-base' : 'text-sm'}`}>
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="border border-gray-200 p-2 text-center text-xs font-medium text-gray-700" style={{ width: '100px' }}>경로</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">RoomName</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">RatePlanName</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">RoomType</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">BedTypeDescription</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">RoomViewDescription</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">RoomText</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700" style={!isInPopup ? { width: 'auto', maxWidth: '80px' } : undefined}>RatePlanCode</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700" style={isInPopup ? { width: '30px' } : undefined}>RateKey</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">ProductCode</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">AmountAfterTax</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700">AverageNightlyRate</th>
              <th className="border border-gray-200 p-2 text-left text-xs font-medium text-gray-700" style={!isInPopup ? { width: 'auto', maxWidth: '80px' } : undefined}>CurrencyCode</th>
            </tr>
          </thead>
          <tbody>
            {roomTableRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-200 p-2 text-center">
                  {hotel.slug && row.productCode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyProductLink(String(row.productCode), index);
                      }}
                      className={cn(
                        "text-xs h-7 px-2",
                        copiedLinkIndex === index 
                          ? "bg-green-50 border-green-300 text-green-700" 
                          : "hover:bg-blue-50"
                      )}
                    >
                      {copiedLinkIndex === index ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          복사됨
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3 w-3 mr-1" />
                          링크생성
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="border border-gray-200 p-2 text-gray-900">{row.roomName || '-'}</td>
                <td className="border border-gray-200 p-2 text-gray-900 font-medium">{row.ratePlanName || '-'}</td>
                <td className="border border-gray-200 p-2 text-gray-900 text-center font-medium">
                  {extractRoomType(row.roomText)}
                </td>
                <td className="border border-gray-200 p-2 text-gray-900">{row.bedTypeDescription || '-'}</td>
                <td className="border border-gray-200 p-2 text-gray-900">{row.roomViewDescription || '-'}</td>
                <td className={`border border-gray-200 p-2 text-gray-900 ${isInPopup ? 'text-sm' : 'text-xs'}`} style={!isInPopup ? { maxWidth: '300px' } : undefined}>{row.roomText || '-'}</td>
                <td className={`border border-gray-200 p-2 text-gray-900 font-mono ${isInPopup ? 'text-sm' : 'text-xs'}`} style={!isInPopup ? { width: 'auto', maxWidth: '80px' } : undefined}>{row.ratePlanCode || '-'}</td>
                <td 
                  className={`border border-gray-200 p-2 text-gray-900 font-mono ${isInPopup ? 'text-sm' : 'text-xs'}`}
                  style={isInPopup ? { width: '30px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}
                >
                  {row.rateKey ? (
                    <span 
                      className="cursor-help relative inline-block group"
                      title={row.rateKey}
                    >
                      {!isInPopup && row.rateKey.length > 20 ? (
                        <>
                          <span className="truncate block max-w-[150px]">
                            {row.rateKey.substring(0, 20)}...
                          </span>
                          <span className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none z-50 shadow-xl transition-all duration-200 max-w-[400px] break-all whitespace-normal">
                            {row.rateKey}
                          </span>
                        </>
                      ) : isInPopup ? (
                        <>
                          <span className="truncate block">
                            {row.rateKey.substring(0, 3)}...
                          </span>
                          <span className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none z-50 shadow-xl transition-all duration-200 max-w-[400px] break-all whitespace-normal">
                            {row.rateKey}
                          </span>
                        </>
                      ) : (
                        <span className="truncate block max-w-[150px]">
                          {row.rateKey}
                        </span>
                      )}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className={`border border-gray-200 p-2 text-gray-900 font-mono ${isInPopup ? 'text-sm' : 'text-xs'}`}>{row.productCode || '-'}</td>
                <td className="border border-gray-200 p-2 text-gray-900 text-right">{row.amountAfterTax ? formatCurrency(row.amountAfterTax, row.currencyCode) : '-'}</td>
                <td className="border border-gray-200 p-2 text-gray-900 text-right">{row.averageNightlyRate ? formatCurrency(row.averageNightlyRate, row.currencyCode) : '-'}</td>
                <td className={`border border-gray-200 p-2 text-gray-900 font-mono ${isInPopup ? 'text-sm' : 'text-xs'}`} style={!isInPopup ? { width: 'auto', maxWidth: '80px' } : undefined}>{row.currencyCode || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  useEffect(() => {
    if (!selectedPlan) return;
    setRatePlanCode(selectedPlan.ratePlanCode || selectedPlan.rateKey || "");
    setRoomCode(selectedPlan.roomName || selectedPlan.roomType || "");
  }, [selectedPlan]);

  const handleFetchRatePlans = async () => {
    if (!hotelId) return;
    if (!checkInDate || !checkOutDate) {
      setRateError("체크인/체크아웃 날짜를 선택해주세요.");
      return;
    }

    setRateLoading(true);
    setRateError(null);
    setRatePlans([]);
    setActiveRatePlanId(null);
    setRawResponse(null);

    try {
      // 선택된 Rate Plan Code가 없으면 호텔의 기본 설정값 사용, 그것도 없으면 전체 사용
      // UI 체크박스에서 선택된 값(selectedRatePlanCodes)이 있으면 그것을 최우선으로 사용
      // 체크된 게 없으면 -> 호텔 DB 설정값(hotelRatePlanCodes) 사용 -> 그것도 없으면 전체(availableRatePlanCodes) 사용
      const codesToUse = selectedRatePlanCodes.length > 0 
        ? selectedRatePlanCodes 
        : (hotelRatePlanCodes.length > 0 ? hotelRatePlanCodes : availableRatePlanCodes);

      const payload = {
        sabreId: hotelId,
        checkInDate,
        checkOutDate,
        adults: Number(adults),
        children: Number(children),
        ratePlanCode: codesToUse.join(",") 
      };

      console.log('[handleFetchRatePlans] 요청 payload:', payload);

      const res = await fetch("/api/hotel/room-url-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log('[handleFetchRatePlans] 응답 상태:', res.status, res.statusText);

      // 응답이 JSON인지 확인
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[handleFetchRatePlans] JSON이 아닌 응답:', contentType, text.substring(0, 200));
        setRateError('서버에서 예상치 못한 응답 형식을 받았습니다.');
        return;
      }

      const data = await res.json();
      console.log('[handleFetchRatePlans] 파싱된 데이터:', {
        success: data.success,
        hasData: !!data.data,
        dataLength: data.data?.length,
        hasRawResponse: !!data.rawResponse,
        error: data.error
      });

      if (data.rawResponse) {
        // rawResponse를 원본 객체로 저장 (JSON 표시용으로는 문자열 변환)
        // 하지만 테이블 추출용으로는 객체를 직접 사용
        setRawResponse(
          typeof data.rawResponse === 'string'
            ? data.rawResponse
            : JSON.stringify(data.rawResponse, null, 2)
        );
      }

      if (!data.success) {
        setRateError(data.error || "요금 조회 실패");
        return;
      }

      if (data.data && Array.isArray(data.data)) {
        setRatePlans(data.data);
      } else {
        setRatePlans([]);
      }
    } catch (err: any) {
      console.error('[handleFetchRatePlans] 에러 발생:', err);
      console.error('[handleFetchRatePlans] 에러 스택:', err.stack);
      
      let errorMessage = "알 수 없는 오류가 발생했습니다.";
      
      if (err.message === 'Failed to fetch') {
        errorMessage = "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
      } else if (err.name === 'AbortError') {
        errorMessage = "요청이 취소되었습니다.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setRateError(errorMessage);
    } finally {
      setRateLoading(false);
    }
  };

  const handleGenerateUrl = () => {
    if (!hotelId) return;
    if (!ratePlanCode) return;
    if (!checkInDate || !checkOutDate) return;

    const params = new URLSearchParams();
    params.set("sabreId", hotelId);
    if (roomCode) params.set("roomCode", roomCode);
    params.set("ratePlanCode", ratePlanCode);
    params.set("checkIn", checkInDate);
    params.set("checkOut", checkOutDate);
    params.set("adults", adults);
    params.set("children", children);

    const delimiter = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${delimiter}${params.toString()}`;
    setGeneratedUrl(url);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyField = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => {
        setCopiedField((current) => (current === key ? null : current));
      }, 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyJson = async () => {
    if (!rawResponse) return;
    try {
      await navigator.clipboard.writeText(rawResponse);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyProductLink = async (productCode: string, rowIndex: number) => {
    if (!hotel.slug || !productCode) return;
    
    const url = `https://luxury-select.co.kr/hotel/${hotel.slug}?checkIn=${checkInDate}&checkOut=${checkOutDate}&productCode=${productCode}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkIndex(rowIndex);
      setTimeout(() => setCopiedLinkIndex(null), 2000);
    } catch (error) {
      console.error('링크 복사 실패:', error);
    }
  };

  return (
    <>
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-medium text-gray-900">
          URL 생성 및 조회
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="패널 닫기"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* 1행: Start Date, End Date, Adults, Children (추가됨) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="checkInDate" className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <DateInput
            name="checkInDate"
            value={checkInDate}
            onChange={(e) => {
              const v = e.currentTarget.value
              if (!v) {
                setCheckInDate(v)
                return
              }
              const parts = v.split('-').map((n) => Number(n))
              if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
                const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
                dt.setUTCDate(dt.getUTCDate() + 1)
                const next = dt.toISOString().slice(0, 10)
                setCheckInDate(v);
                setCheckOutDate(next);
              } else {
                setCheckInDate(v)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="checkOutDate" className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <DateInput
            name="checkOutDate"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.currentTarget.value)}
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
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="children" className="block text-sm font-medium text-gray-700 mb-2">
            Children
          </label>
          <input
            id="children"
            type="number"
            min="0"
            step="1"
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 2행: Rate Plan Codes */}
      <div className="mt-6">
        <RatePlanCodeSelector
          selectedCodes={selectedRatePlanCodes}
          dbCodes={hotelRatePlanCodes}
          onChange={setSelectedRatePlanCodes}
          description="DB 허용 Rate Plan Codes에서 선택됩니다. 미선택 시 전체 코드로 조회합니다."
          onCodesLoaded={handleCodesLoaded}
        />
      </div>

      {/* 버튼 영역 */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          onClick={handleFetchRatePlans}
          disabled={rateLoading}
          className={cn(
            "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
            "bg-green-600 text-white hover:bg-green-700",
            "focus:outline-none focus:ring-2 focus:ring-green-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {rateLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              요금 조회 중...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              객실 요금 조회
            </>
          )}
        </button>
      </div>

      {/* Raw Response (버튼 하단으로 이동) */}
      <div className="mt-6">
        <div className="border border-gray-200 border-b-0 rounded-t-lg px-4 py-3 flex items-center justify-between bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Sabre API Raw Response
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-gray-500 hover:text-gray-900"
            onClick={handleCopyJson}
            disabled={!rawResponse}
          >
            {copiedJson ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
            {copiedJson ? "Copied" : "Copy JSON"}
          </Button>
        </div>
        <div className="bg-slate-900 p-4 overflow-auto rounded-b-lg border border-gray-200 max-h-[300px]">
            {rawResponse ? (
            <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
              {rawResponse}
            </pre>
          ) : (
            <div className="flex items-center justify-center text-gray-500 text-xs font-mono py-8">
              API 응답이 여기에 표시됩니다.
            </div>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {rateError && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="ml-2">
              <h5 className="text-sm font-medium text-red-800">오류</h5>
              <p className="text-sm text-red-700 mt-1">{rateError}</p>
            </div>
          </div>
        </div>
      )}

      {/* 객실 리스트 */}
      <div className="mt-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col h-[600px]">
           <div className="border-b px-5 py-4 flex items-center justify-between flex-shrink-0 bg-gray-50">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {rawResponse && roomTableRows.length > 0 
                  ? "Room 데이터 테이블" 
                  : "객실 리스트"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {rawResponse && roomTableRows.length > 0
                  ? `${roomTableRows.length}개의 Room을 찾았습니다.`
                  : ratePlans.length > 0 
                    ? `${ratePlans.length}개의 요금제를 찾았습니다.` 
                    : "조회 결과가 여기에 표시됩니다."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {checkInDate && checkOutDate && (
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {checkInDate} → {checkOutDate}
                </span>
              )}
              {rawResponse && roomTableRows.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTablePopupOpen(true)}
                  className="text-xs"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  팝업으로 넓게 보기
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 bg-white">
             {rateLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                요금을 불러오는 중입니다...
              </div>
            ) : rawResponse && roomTableRows.length > 0 ? (
              renderRoomTable(false)
            ) : ratePlans.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-sm text-gray-500">
                <MapPin className="h-8 w-8 text-gray-300 mb-3" />
                조건을 입력하고 &ldquo;객실 요금 조회&rdquo; 버튼을 눌러주세요.
              </div>
            ) : (
              <div className="space-y-3">
                {ratePlans.map((plan) => {
                  const isActive = plan.id === activeRatePlanId
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setActiveRatePlanId(plan.id)}
                      className={cn(
                        "w-full rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                        isActive ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="text-xs uppercase tracking-wider text-gray-500">Rate Plan Code</p>
                              <p className="font-mono text-sm text-orange-600 break-all">
                                {plan.ratePlanCode || "N/A"}
                              </p>
                            </div>
                            {plan.ratePlanCode && (
                              <span className="inline-flex">
                                <button
                                  type="button"
                                  aria-label="Rate Plan Code 복사"
                                  className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-800 bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyField(plan.ratePlanCode, `code-${plan.id}`)
                                  }}
                                >
                                  {copiedField === `code-${plan.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </span>
                            )}
                          </div>
                          {plan.ratePlanName && (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                              <span className="font-semibold text-gray-700">Rate Plan Name:</span>
                              <span className="flex-1 font-medium text-gray-900">{plan.ratePlanName}</span>
                              <span className="inline-flex">
                                <button
                                  type="button"
                                  aria-label="Rate Plan Name 복사"
                                  className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-800 bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyField(plan.ratePlanName ?? "", `name-${plan.id}`)
                                  }}
                                >
                                  {copiedField === `name-${plan.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">금액 (1박 기준)</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(plan.amountAfterTax, plan.currency)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                        <span className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {plan.roomType || "RoomType 미상"}
                          {plan.roomType && (
                            <span className="inline-flex">
                              <button
                                type="button"
                                aria-label="객실 유형 복사"
                                className="rounded border border-gray-300 p-0.5 text-gray-500 hover:text-gray-900 bg-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyField(plan.roomType, `roomType-${plan.id}`)
                                }}
                              >
                                {copiedField === `roomType-${plan.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </span>
                          )}
                        </span>
                        {plan.roomName && (
                          <button
                            type="button"
                            className="text-sm font-medium underline-offset-2 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopyField(plan.roomName, `roomName-${plan.id}`)
                            }}
                          >
                            {plan.roomName}
                          </button>
                        )}
                      </div>
                      {plan.description && (
                        <div className="mt-2 flex items-start gap-2 text-xs text-gray-600">
                          <p className="line-clamp-2 flex-1">{plan.description}</p>
                          <span className="inline-flex">
                            <button
                              type="button"
                              aria-label="객실 설명 복사"
                              className="rounded-md border border-gray-200 p-1 text-gray-500 hover:text-gray-800 bg-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyField(plan.description, `desc-${plan.id}`)
                              }}
                            >
                              {copiedField === `desc-${plan.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </span>
                        </div>
                      )}
                      {isActive && (
                        <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-orange-600">
                          <span className="flex-1">
                            선택됨 · RateKey:{" "}
                            <span className="font-mono break-all">{plan.rateKey || "N/A"}</span>
                          </span>
                          {plan.rateKey && (
                            <span className="inline-flex">
                              <button
                                type="button"
                                aria-label="RateKey 복사"
                                className="rounded-md border border-orange-200 bg-white p-1 text-orange-600 hover:text-orange-800"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopyField(plan.rateKey, `rateKey-${plan.id}`)
                                }}
                              >
                                {copiedField === `rateKey-${plan.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* URL 생성 설정 영역 (기존 패널 UI 통합) */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">URL 파라미터 설정</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
             <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Base URL</label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Rate Plan Code</label>
              <Input
                value={ratePlanCode}
                onChange={(e) => setRatePlanCode(e.target.value)}
                placeholder="조회 결과에서 선택하거나 직접 입력"
                className="text-sm font-mono bg-gray-50"
                readOnly
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Room Code (Optional)</label>
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="조회 결과에서 자동 입력됨"
                className="text-sm font-mono bg-gray-50"
              />
            </div>
            <Button 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              onClick={handleGenerateUrl}
              disabled={!ratePlanCode}
            >
              URL 생성
            </Button>
          </div>

          <div className="lg:col-span-2">
             {/* 생성된 URL 표시 */}
             {generatedUrl ? (
              <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 p-5 animate-in fade-in slide-in-from-top-2 h-full">
                <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  생성된 링크
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="rounded-md border border-orange-200 bg-white p-3 text-sm font-mono text-gray-800 break-all">
                    {generatedUrl}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 border-orange-200 hover:bg-orange-100 hover:text-orange-800" onClick={handleCopy}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "복사됨!" : "복사하기"}
                    </Button>
                    <Button variant="ghost" onClick={() => setGeneratedUrl("")} className="hover:bg-orange-100 hover:text-orange-800">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-sm p-8">
                URL 생성 버튼을 누르면 여기에 링크가 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Room 데이터 테이블 팝업 */}
      <Modal
        isOpen={isTablePopupOpen}
        onClose={() => setIsTablePopupOpen(false)}
        title="Room 데이터 테이블"
        size="full"
        className="max-w-[95vw] max-h-[90vh]"
      >
        <div className="overflow-auto max-h-[calc(90vh-120px)]">
          {renderRoomTable(true)}
        </div>
      </Modal>
    </>
  );
}