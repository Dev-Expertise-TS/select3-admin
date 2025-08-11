'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2 } from 'lucide-react'

interface SabreHotel {
  hotelCode: string
  hotelName: string
  address?: string
  city?: string
  country?: string
}

interface SabreSearchResult {
  success: boolean
  data?: SabreHotel[]
  error?: string
}

export default function SabreIdManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SabreHotel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('호텔 영문명을 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])
    setLoadingMessage('호텔 정보를 검색하고 있습니다...')

    try {
      const response = await fetch('/api/sabre-id/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelName: searchTerm.trim()
        })
      })

      const data: SabreSearchResult = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API 요청이 실패했습니다.')
      }

      if (data.success && data.data) {
        setResults(data.data)
        setLoadingMessage('')
        if (data.data.length === 0) {
          setError('검색 결과가 없습니다. 다른 호텔명으로 검색해보세요.')
        }
      } else {
        setError(data.error || '검색 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error('Search error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('검색 요청이 취소되었습니다.')
      } else {
        setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
      }
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* 검색 섹션 */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">호텔 검색</h2>
          <p className="text-sm text-muted-foreground">
            호텔 영문명을 입력하여 Sabre API에서 호텔을 검색합니다.
          </p>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="호텔 영문명을 입력하세요 (예: Hilton, Marriott)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                검색중...
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
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        {isLoading && loadingMessage && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-200 flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingMessage}
          </div>
        )}
      </div>

      {/* 검색 결과 섹션 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">검색 결과</h2>
            <p className="text-sm text-muted-foreground">
              총 {results.length}개의 호텔이 검색되었습니다.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium">Sabre Hotel Code</th>
                  <th className="text-left p-4 font-medium">호텔명</th>
                  <th className="text-left p-4 font-medium">Address</th>
                  <th className="text-left p-4 font-medium">City</th>
                  <th className="text-left p-4 font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {results.map((hotel, index) => (
                  <tr key={hotel.hotelCode || index} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <span className="font-mono font-medium text-blue-600">
                        {hotel.hotelCode}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{hotel.hotelName}</td>
                    <td className="p-4 text-muted-foreground max-w-sm">
                      <div className="truncate" title={hotel.address}>
                        {hotel.address || '-'}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {hotel.city || '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {hotel.country || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
