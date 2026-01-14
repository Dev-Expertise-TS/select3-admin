'use client'

import React, { useState, useEffect } from 'react'
import { X, Trash2, Building2, MapPin, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBrandHotels, getChainHotels, disconnectHotelFromBrand } from '@/features/chain-brand/actions'

interface Hotel {
  sabre_id: string
  property_name_ko: string | null
  property_name_en: string | null
  property_address: string | null
  city_ko: string | null
  country_ko: string | null
  brand_id?: number | null
  brand_position?: 1 | 2 | 3 // 브랜드 위치 정보
}

interface ConnectedHotelsModalProps {
  isOpen: boolean
  onClose: () => void
  itemType: 'brand' | 'chain'
  itemId: number
  itemName: string
  onHotelDisconnected?: () => void
}

export default function ConnectedHotelsModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  onHotelDisconnected
}: ConnectedHotelsModalProps) {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadHotels()
    }
  // loadHotels는 itemId와 itemType에 의존하므로 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemId, itemType])

  const loadHotels = async () => {
    setLoading(true)
    try {
      const result = itemType === 'brand' 
        ? await getBrandHotels(itemId)
        : await getChainHotels(itemId)
      
      if (result.success && result.data) {
        setHotels(result.data.hotels)
      } else {
        alert(result.error || '호텔 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('[ConnectedHotelsModal] loadHotels error:', error)
      alert('호텔 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (hotel: Hotel, brandPosition?: 1 | 2 | 3) => {
    const positionText = brandPosition ? `브랜드${brandPosition} ` : ''
    if (!confirm(`"${hotel.property_name_ko || hotel.property_name_en || hotel.sabre_id}"의 ${positionText}연결을 해제하시겠습니까?`)) {
      return
    }

    setDisconnecting(hotel.sabre_id)
    try {
      const result = await disconnectHotelFromBrand(hotel.sabre_id, brandPosition)
      
      if (result.success) {
        // 브랜드 위치가 지정된 경우, 해당 위치의 브랜드만 제거
        // 위치가 지정되지 않은 경우, 목록에서 제거
        if (brandPosition) {
          setHotels(prev => prev.map(h => {
            if (h.sabre_id === hotel.sabre_id && h.brand_position === brandPosition) {
              // 다른 브랜드 위치가 있는지 확인
              const otherPositions = prev.filter(h2 => h2.sabre_id === hotel.sabre_id && h2.brand_position !== brandPosition)
              if (otherPositions.length > 0) {
                // 다른 브랜드 위치가 있으면 해당 호텔만 제거
                return null
              }
              // 다른 브랜드 위치가 없으면 호텔 자체를 제거
              return null
            }
            return h
          }).filter(Boolean) as Hotel[])
        } else {
          // 목록에서 제거
          setHotels(prev => prev.filter(h => h.sabre_id !== hotel.sabre_id))
        }
        alert('연결이 해제되었습니다.')
        onHotelDisconnected?.()
      } else {
        alert(result.error || '연결 해제에 실패했습니다.')
      }
    } catch (error) {
      console.error('[ConnectedHotelsModal] handleDisconnect error:', error)
      alert('연결 해제에 실패했습니다.')
    } finally {
      setDisconnecting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              연결된 호텔 목록
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {itemType === 'brand' ? '브랜드' : '체인'}: <span className="font-medium">{itemName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">호텔 목록을 불러오는 중...</p>
              </div>
            </div>
          ) : hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">연결된 호텔이 없습니다.</p>
              <p className="text-gray-500 text-sm mt-2">
                호텔 연결 버튼을 사용하여 호텔을 연결할 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 mb-4">
                총 <span className="font-semibold text-gray-900">{hotels.length}</span>개의 호텔이 연결되어 있습니다.
              </div>
              
              {hotels.map((hotel) => (
                <div
                  key={hotel.sabre_id}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">
                      {hotel.property_name_ko || hotel.property_name_en || '(이름 없음)'}
                    </h3>
                    {hotel.property_name_en && hotel.property_name_ko && (
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {hotel.property_name_en}
                      </p>
                    )}
                    {(hotel.city_ko || hotel.country_ko) && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[hotel.city_ko, hotel.country_ko].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      Sabre ID: {hotel.sabre_id}
                    </p>
                    {hotel.brand_position && (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        브랜드 위치: 브랜드{hotel.brand_position}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {hotel.brand_position ? (
                      <Button
                        onClick={() => handleDisconnect(hotel, hotel.brand_position)}
                        size="sm"
                        variant="outline"
                        disabled={disconnecting === hotel.sabre_id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title={`브랜드${hotel.brand_position} 연결 해제`}
                      >
                        {disconnecting === hotel.sabre_id ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                            <span className="text-xs">해제 중...</span>
                          </div>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3" />
                            <span className="ml-1 text-xs">브랜드{hotel.brand_position} 해제</span>
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleDisconnect(hotel)}
                        size="sm"
                        variant="outline"
                        disabled={disconnecting === hotel.sabre_id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        title="연결 해제"
                      >
                        {disconnecting === hotel.sabre_id ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                            <span className="text-xs">해제 중...</span>
                          </div>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3" />
                            <span className="ml-1 text-xs">연결 해제</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}

