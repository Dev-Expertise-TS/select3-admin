"use client"

import { useState, useCallback } from 'react'
import { Loader2, Play, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface Hotel {
  sabre_id: string
  name_ko: string | null
  name_en: string | null
  rate_plan_code: string | null
}

interface DailyRateData {
  checkInDate: string
  data: any
  rawResponse: string
}

interface HotelProgress {
  hotel: Hotel
  status: 'pending' | 'processing' | 'completed' | 'error'
  dailyData: DailyRateData[]
  error?: string
}

export function IhgBulkDailyRatesPanel() {
  const [checkInDate, setCheckInDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().split('T')[0]
  })
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 15)
    return date.toISOString().split('T')[0]
  })
  const [adults, setAdults] = useState("2")
  const [children, setChildren] = useState("0")
  const [isLoading, setIsLoading] = useState(false)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [progress, setProgress] = useState<HotelProgress[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set())

  // IHG 호텔 목록 조회
  const handleLoadHotels = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/hotel/ihg-hotels')
      const result = await response.json()

      if (result.success) {
        setHotels(result.data.hotels)
        setProgress(
          result.data.hotels.map((hotel: Hotel) => ({
            hotel,
            status: 'pending' as const,
            dailyData: [],
          }))
        )
        // 모든 호텔 선택 초기화
        setSelectedHotels(new Set())
      } else {
        setError(result.error || 'IHG 호텔 목록을 불러오는데 실패했습니다.')
      }
    } catch (err: any) {
      setError('IHG 호텔 목록을 불러오는 중 오류가 발생했습니다.')
      console.error('Error loading hotels:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 단일 호텔의 일자별 데이터 조회
  const fetchHotelDailyRates = async (hotelIndex: number): Promise<HotelProgress | null> => {
    const hotel = hotels[hotelIndex]
    if (!hotel) return null

    // 진행상황 업데이트: processing
    setProgress((prev) => {
      const updated = [...prev]
      updated[hotelIndex] = {
        ...updated[hotelIndex],
        status: 'processing',
      }
      return updated
    })

    try {
      const hotelRatePlanCodes = hotel.rate_plan_code
        ? hotel.rate_plan_code.split(',').map((c) => c.trim()).filter(Boolean)
        : []

      const response = await fetch('/api/hotel/ihg-bulk-daily-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInDate,
          checkOutDate,
          adults: Number(adults),
          children: Number(children),
          ratePlanCodes: hotelRatePlanCodes.length > 0 ? hotelRatePlanCodes : undefined,
          hotelIndex,
        }),
      })

      const result = await response.json()

      if (result.success && result.data.dailyData) {
        return {
          hotel,
          status: 'completed',
          dailyData: result.data.dailyData,
        }
      } else {
        return {
          hotel,
          status: 'error',
          dailyData: [],
          error: result.error || '데이터 조회에 실패했습니다.',
        }
      }
    } catch (err: any) {
      return {
        hotel,
        status: 'error',
        dailyData: [],
        error: err.message || '호텔 데이터 조회 중 오류가 발생했습니다.',
      }
    }
  }

  // 선택된 호텔만 순차 조회
  const handleProcessAllHotels = async () => {
    if (hotels.length === 0) {
      setError('먼저 IHG 호텔 목록을 불러와주세요.')
      return
    }

    if (selectedHotels.size === 0) {
      setError('처리할 호텔을 선택해주세요.')
      return
    }

    setIsProcessing(true)
    setError(null)

    // 선택된 호텔만 pending 상태로 초기화
    setProgress((prev) =>
      prev.map((p) => {
        if (selectedHotels.has(p.hotel.sabre_id)) {
          return {
            ...p,
            status: 'pending' as const,
            dailyData: [],
          }
        }
        return p
      })
    )

    try {
      // 선택된 호텔만 순차적으로 조회
      const selectedIndices = hotels
        .map((hotel, index) => (selectedHotels.has(hotel.sabre_id) ? index : -1))
        .filter((index) => index !== -1)

      for (let i = 0; i < selectedIndices.length; i++) {
        const hotelIndex = selectedIndices[i]
        const result = await fetchHotelDailyRates(hotelIndex)
        if (result) {
          setProgress((prev) => {
            const updated = [...prev]
            updated[hotelIndex] = result
            return updated
          })
        }

        // API 부하를 줄이기 위해 약간의 딜레이
        if (i < selectedIndices.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    } catch (err: any) {
      setError('호텔 데이터 조회 중 오류가 발생했습니다.')
      console.error('Error processing hotels:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // 호텔 선택 토글
  const toggleHotelSelection = (sabreId: string) => {
    setSelectedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(sabreId)) {
        next.delete(sabreId)
      } else {
        next.add(sabreId)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedHotels.size === hotels.length) {
      setSelectedHotels(new Set())
    } else {
      setSelectedHotels(new Set(hotels.map((h) => h.sabre_id)))
    }
  }

  // 깊은 경로 접근 헬퍼 함수
  const getDeepValue = (obj: unknown, keys: string[]): unknown => {
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

  // 단일 호텔 데이터를 엑셀 파일로 내보내기
  const exportSingleHotelToExcel = (hotelProgress: HotelProgress) => {
    if (hotelProgress.status !== 'completed' || hotelProgress.dailyData.length === 0) {
      setError('내보낼 데이터가 없습니다.')
      return false
    }

    const headers = [
      '날짜',
      'Sabre ID',
      'Hotel Name (KR)',
      'Hotel Name (EN)',
      'Rate Plan Code',
      'Product Code',
      'Rate Key',
      'Room Type',
      'Bed Type Description',
      'Room Description',
      'Amount After Tax',
      'Currency',
    ]

    const excelData: (string | number)[][] = [headers]

    hotelProgress.dailyData.forEach((daily) => {
      try {
        const responseData = typeof daily.data === 'string' ? JSON.parse(daily.data) : daily.data

        // Sabre API 응답 구조: GetHotelDetailsRS -> HotelDetailsInfo -> HotelRateInfo -> Rooms -> Room
        const rooms = getDeepValue(responseData, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo', 'Rooms', 'Room'])
        if (!rooms) {
          console.warn(`[Export] No Rooms data for ${hotelProgress.hotel.sabre_id} on ${daily.checkInDate}`)
          return
        }

        const roomArray: unknown[] = Array.isArray(rooms) ? rooms : [rooms]

        roomArray.forEach((room: any) => {
          // Room에서 RatePlans 추출
          const ratePlans = getDeepValue(room, ['RatePlans', 'RatePlan'])
          if (!ratePlans) return

          const ratePlanArray: unknown[] = Array.isArray(ratePlans) ? ratePlans : [ratePlans]

          ratePlanArray.forEach((ratePlan: any) => {
            const ratePlanCode = (getDeepValue(ratePlan, ['RatePlanCode']) as string) || ''
            const productCode = (getDeepValue(ratePlan, ['ProductCode']) as string) || ''
            const rateKey = (getDeepValue(ratePlan, ['RateKey']) as string) || ''
            const roomType = (getDeepValue(room, ['RoomType']) as string) || ''
            
            // BedTypeDescription 추출
            const bedTypes = getDeepValue(room, ['BedTypeOptions', 'BedTypes'])
            const bedTypesArray = Array.isArray(bedTypes) ? bedTypes : (bedTypes ? [bedTypes] : [])
            const firstBedType = bedTypesArray[0] as Record<string, unknown> | undefined
            const bedType = firstBedType?.BedType
            const bedTypeArray = Array.isArray(bedType) ? bedType : (bedType ? [bedType] : [])
            const bedTypeObj = bedTypeArray[0] as Record<string, unknown> | undefined
            const bedTypeDescription = (bedTypeObj?.Description as string) || ''

            // RoomDescription 추출
            const roomDescription = getDeepValue(room, ['RoomDescription']) as Record<string, unknown> | undefined
            const roomDescText = roomDescription?.Text
            const roomDesc = Array.isArray(roomDescText)
              ? ((roomDescText[0] as string) || '')
              : ((roomDescText as string) || '')

            // ConvertedRateInfo에서 금액 추출
            const convertedRateInfo = getDeepValue(ratePlan, ['ConvertedRateInfo']) as Record<string, unknown> | undefined
            const amountAfterTax = convertedRateInfo?.AmountAfterTax || 0
            const currencyCode = (convertedRateInfo?.CurrencyCode as string) || 'KRW'

            excelData.push([
              daily.checkInDate,
              hotelProgress.hotel.sabre_id,
              hotelProgress.hotel.name_ko || '',
              hotelProgress.hotel.name_en || '',
              ratePlanCode,
              productCode,
              rateKey.substring(0, 50), // RateKey는 너무 길 수 있으므로 잘라냄
              roomType,
              bedTypeDescription,
              roomDesc,
              amountAfterTax,
              currencyCode,
            ])
          })
        })
      } catch (e) {
        // 파싱 오류는 무시하고 계속 진행
        console.warn(`[Export] Failed to parse data for ${hotelProgress.hotel.sabre_id} on ${daily.checkInDate}:`, e)
      }
    })

    // 데이터가 있는 경우만 엑셀 파일 생성
    if (excelData.length > 1) {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      const sheetName = hotelProgress.hotel.name_en
        ? hotelProgress.hotel.name_en.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '_')
        : `Hotel_${hotelProgress.hotel.sabre_id}`

      XLSX.utils.book_append_sheet(wb, ws, sheetName)

      // 파일명 생성 (호텔별로 개별 파일)
      const sanitizeFileName = (name: string): string => {
        return name.replace(/[<>:"/\\|?*]/g, '_').trim()
      }

      const hotelNameForFile = hotelProgress.hotel.name_en
        ? sanitizeFileName(hotelProgress.hotel.name_en)
        : `Hotel_${hotelProgress.hotel.sabre_id}`

      const dateRange = `${checkInDate}_${checkOutDate}`
      const fileName = `${hotelNameForFile}_${hotelProgress.hotel.sabre_id}_${dateRange}.xlsx`

      // Excel 파일 생성 및 다운로드
      try {
        XLSX.writeFile(wb, fileName)
        return true
      } catch (e) {
        console.error('[Export] Failed to write Excel file:', e)
        setError('엑셀 파일 생성 중 오류가 발생했습니다.')
        return false
      }
    }

    setError('내보낼 데이터가 없습니다.')
    return false
  }

  // 모든 호텔 데이터를 하나의 엑셀 파일로 내보내기 (기존 기능 유지)
  const handleExportToExcel = () => {
    if (progress.length === 0 || progress.every((p) => p.status !== 'completed')) {
      setError('내보낼 데이터가 없습니다.')
      return
    }

    const wb = XLSX.utils.book_new()
    let hasData = false

    // 각 호텔별로 시트 생성
    progress.forEach((hotelProgress) => {
      if (hotelProgress.status !== 'completed' || hotelProgress.dailyData.length === 0) {
        return
      }

      const headers = [
        '날짜',
        'Sabre ID',
        'Hotel Name (KR)',
        'Hotel Name (EN)',
        'Rate Plan Code',
        'Product Code',
        'Rate Key',
        'Room Type',
        'Bed Type Description',
        'Room Description',
        'Amount After Tax',
        'Currency',
      ]

      const excelData: (string | number)[][] = [headers]

      hotelProgress.dailyData.forEach((daily) => {
        try {
          const responseData = typeof daily.data === 'string' ? JSON.parse(daily.data) : daily.data

          // Sabre API 응답 구조: GetHotelDetailsRS -> HotelDetailsInfo -> HotelRateInfo -> Rooms -> Room
          const rooms = getDeepValue(responseData, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo', 'Rooms', 'Room'])
          if (!rooms) {
            return
          }

          const roomArray: unknown[] = Array.isArray(rooms) ? rooms : [rooms]

          roomArray.forEach((room: any) => {
            // Room에서 RatePlans 추출
            const ratePlans = getDeepValue(room, ['RatePlans', 'RatePlan'])
            if (!ratePlans) return

            const ratePlanArray: unknown[] = Array.isArray(ratePlans) ? ratePlans : [ratePlans]

            ratePlanArray.forEach((ratePlan: any) => {
              const ratePlanCode = (getDeepValue(ratePlan, ['RatePlanCode']) as string) || ''
              const productCode = (getDeepValue(ratePlan, ['ProductCode']) as string) || ''
              const rateKey = (getDeepValue(ratePlan, ['RateKey']) as string) || ''
              const roomType = (getDeepValue(room, ['RoomType']) as string) || ''
              
              // BedTypeDescription 추출
              const bedTypes = getDeepValue(room, ['BedTypeOptions', 'BedTypes'])
              const bedTypesArray = Array.isArray(bedTypes) ? bedTypes : (bedTypes ? [bedTypes] : [])
              const firstBedType = bedTypesArray[0] as Record<string, unknown> | undefined
              const bedType = firstBedType?.BedType
              const bedTypeArray = Array.isArray(bedType) ? bedType : (bedType ? [bedType] : [])
              const bedTypeObj = bedTypeArray[0] as Record<string, unknown> | undefined
              const bedTypeDescription = (bedTypeObj?.Description as string) || ''

              // RoomDescription 추출
              const roomDescription = getDeepValue(room, ['RoomDescription']) as Record<string, unknown> | undefined
              const roomDescText = roomDescription?.Text
              const roomDesc = Array.isArray(roomDescText)
                ? ((roomDescText[0] as string) || '')
                : ((roomDescText as string) || '')

              // ConvertedRateInfo에서 금액 추출
              const convertedRateInfo = getDeepValue(ratePlan, ['ConvertedRateInfo']) as Record<string, unknown> | undefined
              const amountAfterTax = convertedRateInfo?.AmountAfterTax || 0
              const currencyCode = (convertedRateInfo?.CurrencyCode as string) || 'KRW'

              excelData.push([
                daily.checkInDate,
                hotelProgress.hotel.sabre_id,
                hotelProgress.hotel.name_ko || '',
                hotelProgress.hotel.name_en || '',
                ratePlanCode,
                productCode,
                rateKey.substring(0, 50), // RateKey는 너무 길 수 있으므로 잘라냄
                roomType,
                bedTypeDescription,
                roomDesc,
                amountAfterTax,
                currencyCode,
              ])
            })
          })
        } catch (e) {
          // 파싱 오류는 무시하고 계속 진행
          console.warn(`[Export] Failed to parse data for ${hotelProgress.hotel.sabre_id} on ${daily.checkInDate}:`, e)
        }
      })

      if (excelData.length > 1) {
        // 헤더 제외하고 데이터가 있는 경우만 시트 추가
        const ws = XLSX.utils.aoa_to_sheet(excelData)
        const sheetName = hotelProgress.hotel.name_en
          ? hotelProgress.hotel.name_en.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '_')
          : `Hotel_${hotelProgress.hotel.sabre_id}`
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        hasData = true
      }
    })

    // 데이터가 있는 경우만 파일 생성
    if (!hasData) {
      setError('내보낼 데이터가 없습니다.')
      return
    }

    // 파일명 생성
    const dateRange = `${checkInDate}_${checkOutDate}`
    const fileName = `IHG_Hotels_Daily_Rates_${dateRange}.xlsx`

    // Excel 파일 생성 및 다운로드
    XLSX.writeFile(wb, fileName)
  }

  const completedCount = progress.filter((p) => p.status === 'completed').length
  const errorCount = progress.filter((p) => p.status === 'error').length
  const processingCount = progress.filter((p) => p.status === 'processing').length

  return (
    <div className="space-y-6 border rounded-lg p-6 bg-white">
      <div>
        <h3 className="text-lg font-semibold mb-2">IHG 호텔 일자별 객실 데이터 조회</h3>
        <p className="text-sm text-muted-foreground">
          IHG 체인에 속한 모든 호텔의 일자별 객실 상품 코드 및 요금을 조회하고 엑셀 파일로 내보냅니다.
        </p>
      </div>

      {/* 날짜 및 인원 입력 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">체크인 날짜</label>
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">체크아웃 날짜</label>
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">성인</label>
          <input
            type="number"
            value={adults}
            onChange={(e) => setAdults(e.target.value)}
            min="1"
            className="w-full px-3 py-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">아동</label>
          <input
            type="number"
            value={children}
            onChange={(e) => setChildren(e.target.value)}
            min="0"
            className="w-full px-3 py-2 border rounded-md"
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleLoadHotels}
          disabled={isLoading || isProcessing}
          className={cn(
            "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
            "bg-blue-600 text-white hover:bg-blue-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              호텔 목록 조회 중...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              IHG 호텔 목록 불러오기
            </>
          )}
        </button>

        <button
          onClick={handleProcessAllHotels}
          disabled={hotels.length === 0 || selectedHotels.size === 0 || isProcessing}
          className={cn(
            "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
            "bg-green-600 text-white hover:bg-green-700",
            "focus:outline-none focus:ring-2 focus:ring-green-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              조회 중...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              선택된 호텔 일자별 조회 시작 ({selectedHotels.size}개)
            </>
          )}
        </button>

        <button
          onClick={handleExportToExcel}
          disabled={completedCount === 0}
          className={cn(
            "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
            "bg-purple-600 text-white hover:bg-purple-700",
            "focus:outline-none focus:ring-2 focus:ring-purple-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-200"
          )}
        >
          <Download className="h-4 w-4 mr-2" />
          엑셀 파일로 내보내기
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="ml-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 진행상황 요약 */}
      {hotels.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">진행상황</h4>
            <div className="text-sm text-muted-foreground">
              전체: {hotels.length}개 | 완료: {completedCount}개 | 오류: {errorCount}개 | 처리중: {processingCount}개
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / hotels.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 호텔별 진행상황 리스트 */}
      {progress.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <h4 className="text-sm font-semibold">호텔별 진행상황</h4>
            <button
              onClick={toggleSelectAll}
              className={cn(
                "text-xs px-3 py-1 rounded-md border transition-colors",
                selectedHotels.size === hotels.length
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {selectedHotels.size === hotels.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {progress.map((hotelProgress, index) => {
              const isSelected = selectedHotels.has(hotelProgress.hotel.sabre_id)
              const canDownload = hotelProgress.status === 'completed' && hotelProgress.dailyData.length > 0

              return (
                <div
                  key={hotelProgress.hotel.sabre_id}
                  className={cn(
                    "p-3 border-b last:border-b-0",
                    hotelProgress.status === 'completed' && "bg-green-50",
                    hotelProgress.status === 'error' && "bg-red-50",
                    hotelProgress.status === 'processing' && "bg-blue-50",
                    isSelected && "ring-2 ring-blue-500"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleHotelSelection(hotelProgress.hotel.sabre_id)}
                        disabled={isProcessing}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                      />
                      {hotelProgress.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                      {hotelProgress.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      {hotelProgress.status === 'processing' && (
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                      )}
                      {hotelProgress.status === 'pending' && (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {hotelProgress.hotel.name_ko || hotelProgress.hotel.name_en || hotelProgress.hotel.sabre_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sabre ID: {hotelProgress.hotel.sabre_id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground">
                        {hotelProgress.status === 'completed' && (
                          <span className="text-green-600">
                            {hotelProgress.dailyData.length}일 완료
                          </span>
                        )}
                        {hotelProgress.status === 'error' && (
                          <span className="text-red-600">
                            {hotelProgress.error || '오류 발생'}
                          </span>
                        )}
                        {hotelProgress.status === 'processing' && (
                          <span className="text-blue-600">처리 중...</span>
                        )}
                        {hotelProgress.status === 'pending' && (
                          <span className="text-gray-500">대기 중</span>
                        )}
                      </div>
                      {canDownload && (
                        <button
                          onClick={() => exportSingleHotelToExcel(hotelProgress)}
                          className={cn(
                            "inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-medium",
                            "bg-purple-600 text-white hover:bg-purple-700",
                            "focus:outline-none focus:ring-2 focus:ring-purple-500",
                            "transition-colors duration-200"
                          )}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          엑셀 다운
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
