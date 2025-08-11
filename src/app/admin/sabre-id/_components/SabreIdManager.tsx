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
    <div className="space-y-8">
      {/* 검색 섹션 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">호텔 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="호텔 영문명을 입력하세요 (예: Four Seasons, InterContinental)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="h-10"
              />
              <Button 
                onClick={handleSearch}
                disabled={isLoading || !searchTerm.trim()}
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
                <div className="text-red-500">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>{error}</div>
              </div>
            )}

            {isLoading && loadingMessage && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <div>{loadingMessage}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 검색 결과 섹션 */}
      {results.length > 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">검색 결과</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  총 {results.length}개의 호텔이 검색되었습니다.
                </p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Sabre Hotel Code</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">호텔명</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Address</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">City</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Country</th>
                </tr>
              </thead>
              <tbody>
                {results.map((hotel, index) => (
                  <tr key={hotel.hotelCode || index} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-blue-600">
                        {hotel.hotelCode}
                      </code>
                    </td>
                    <td className="p-4 align-middle font-medium">{hotel.hotelName}</td>
                    <td className="p-4 align-middle text-muted-foreground max-w-sm">
                      <div className="truncate" title={hotel.address}>
                        {hotel.address || '-'}
                      </div>
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {hotel.city || '-'}
                    </td>
                    <td className="p-4 align-middle text-muted-foreground">
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
