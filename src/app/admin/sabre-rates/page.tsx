'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// import { cn } from '@/lib/utils'

export default function SabreRatesPage() {
  const [hotelId, setHotelId] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [adults, setAdults] = useState('2')
  const [children, setChildren] = useState('0')
  const [currency, setCurrency] = useState('USD')
  const [ratePlanCodes, setRatePlanCodes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rates, setRates] = useState<{
    hotelId: string
    checkInDate: string
    checkOutDate: string
    rooms: Array<{
      roomType: {
        code: string
        name: string
        description: string
      }
      ratePlans: Array<{
        code: string
        name: string
        description: string
        rateType: string
        cancellationPolicy: {
          description: string
          penalty: string
        }
        pricing: {
          currency: string
          baseRate: number
          totalRate: number
          taxes: number
          fees: number
        }
        amenities: string[]
        availability: string
      }>
    }>
  } | null>(null)
  const [error, setError] = useState('')

  const handleGetRates = async () => {
    if (!hotelId || !checkInDate || !checkOutDate) {
      setError('호텔 ID, 체크인 날짜, 체크아웃 날짜는 필수입니다')
      return
    }

    setIsLoading(true)
    setError('')
    setRates(null)

    try {
      const params = new URLSearchParams({
        hotelId,
        checkInDate,
        checkOutDate,
        adults,
        children,
        currency
      })

      if (ratePlanCodes.trim()) {
        params.append('ratePlanCodes', ratePlanCodes)
      }

      const response = await fetch(`/api/sabre/hotel-rates?${params}`)
      const result = await response.json()

      if (result.success) {
        setRates(result.data)
      } else {
        setError(result.error || '요금 정보를 가져오는데 실패했습니다')
      }
    } catch (err) {
      setError('요금 정보를 가져오는 중 오류가 발생했습니다')
      console.error('Error fetching rates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePostRates = async () => {
    if (!hotelId || !checkInDate || !checkOutDate) {
      setError('호텔 ID, 체크인 날짜, 체크아웃 날짜는 필수입니다')
      return
    }

    setIsLoading(true)
    setError('')
    setRates(null)

    try {
      const requestData = {
        hotelId,
        checkInDate,
        checkOutDate,
        adults: parseInt(adults),
        children: parseInt(children),
        currency,
        ...(ratePlanCodes.trim() && { ratePlanCodes: ratePlanCodes.split(',').map(code => code.trim()) })
      }

      const response = await fetch('/api/sabre/hotel-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setRates(result.data)
      } else {
        setError(result.error || '요금 정보를 가져오는데 실패했습니다')
      }
    } catch (err) {
      setError('요금 정보를 가져오는 중 오류가 발생했습니다')
      console.error('Error fetching rates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Sabre API 호텔 요금 조회</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">요청 파라미터</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">호텔 ID (Sabre ID) *</label>
            <Input
              value={hotelId}
              onChange={(e) => setHotelId(e.target.value)}
              placeholder="예: 607094"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">통화</label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">체크인 날짜 *</label>
            <Input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">체크아웃 날짜 *</label>
            <Input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">성인 수</label>
            <Input
              type="number"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
              min="1"
              max="10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">어린이 수</label>
            <Input
              type="number"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
              min="0"
              max="10"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">요금제 코드 (쉼표로 구분)</label>
          <Input
            value={ratePlanCodes}
            onChange={(e) => setRatePlanCodes(e.target.value)}
            placeholder="예: BAR,CORP,AAA"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleGetRates}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '조회 중...' : 'GET 요청으로 조회'}
          </Button>
          
          <Button
            onClick={handlePostRates}
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? '조회 중...' : 'POST 요청으로 조회'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {rates && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">요금 정보 결과</h2>
          
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p><strong>호텔 ID:</strong> {rates.hotelId}</p>
            <p><strong>체크인:</strong> {rates.checkInDate}</p>
            <p><strong>체크아웃:</strong> {rates.checkOutDate}</p>
          </div>

          {rates.rooms && rates.rooms.length > 0 ? (
            <div className="space-y-6">
              {rates.rooms.map((room, roomIndex: number) => (
                <div key={roomIndex} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {room.roomType?.name || '룸 타입 정보 없음'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {room.roomType?.description || '설명 없음'}
                  </p>
                  
                  {room.ratePlans && room.ratePlans.length > 0 ? (
                    <div className="grid gap-4">
                      {room.ratePlans.map((ratePlan, planIndex: number) => (
                        <div key={planIndex} className="border-l-4 border-blue-500 pl-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{ratePlan.name}</h4>
                              <p className="text-sm text-gray-600">{ratePlan.description}</p>
                              <p className="text-xs text-gray-500">코드: {ratePlan.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {ratePlan.pricing?.currency} {ratePlan.pricing?.totalRate?.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                기본 요금: {ratePlan.pricing?.currency} {ratePlan.pricing?.baseRate?.toFixed(2)}
                              </p>
                              {ratePlan.pricing?.taxes > 0 && (
                                <p className="text-sm text-gray-500">
                                  세금: {ratePlan.pricing?.currency} {ratePlan.pricing?.taxes?.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            <p><strong>요금 타입:</strong> {ratePlan.rateType}</p>
                            <p><strong>가용성:</strong> {ratePlan.availability}</p>
                            
                            {ratePlan.cancellationPolicy && (
                              <div className="mt-2">
                                <p><strong>취소 정책:</strong></p>
                                <p className="text-xs">{ratePlan.cancellationPolicy.description}</p>
                              </div>
                            )}
                            
                            {ratePlan.amenities && ratePlan.amenities.length > 0 && (
                              <div className="mt-2">
                                <p><strong>편의시설:</strong> {ratePlan.amenities.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">사용 가능한 요금제가 없습니다.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">사용 가능한 객실이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  )
}
