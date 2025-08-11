'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, Bot, CheckCircle, AlertCircle, XCircle, HelpCircle } from 'lucide-react'

interface OpenAIHotelSearchResult {
  sabreHotelCode: string
  hotelName: string
  confidence: number
  reasoning: string
  verificationStatus: 'verified' | 'partial_match' | 'no_match'
  verificationDetails: {
    inputHotelName: string
    verifiedHotelName: string
    matchScore: number
    address?: string
    city?: string
    country?: string
  }
}

interface OpenAIHotelSearchResponse {
  success: boolean
  data?: OpenAIHotelSearchResult
  error?: string
}

export default function SabreIdManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<OpenAIHotelSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('호텔명을 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSearchResult(null)
    setLoadingMessage('OpenAI AI가 호텔명을 분석하여 Sabre Hotel Code를 찾고 있습니다...')

    try {
      const response = await fetch('/api/sabre-id/openai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelName: searchTerm.trim() })
      })

      const data: OpenAIHotelSearchResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API 요청이 실패했습니다.')
      }

      if (data.success && data.data) {
        setSearchResult(data.data)
        setLoadingMessage('')
      } else {
        throw new Error(data.error || '검색 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.')
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

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return '높음'
    if (confidence >= 0.6) return '보통'
    return '낮음'
  }

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600'
      case 'partial_match': return 'text-yellow-600'
      case 'no_match': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'verified': return '검증 완료'
      case 'partial_match': return '부분 일치'
      case 'no_match': return '일치하지 않음'
      default: return '알 수 없음'
    }
  }

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'partial_match': return <HelpCircle className="h-5 w-5 text-yellow-600" />
      case 'no_match': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <HelpCircle className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="space-y-6 p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">AI 기반 호텔 검색</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Input
                type="text"
                placeholder="호텔명을 입력하세요"
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
                    AI 검색중
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    AI 검색
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

            {isLoading && loadingMessage && (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <div>{loadingMessage}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchResult && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getVerificationStatusIcon(searchResult.verificationStatus)}
                <h3 className="text-lg font-semibold">AI 검색 결과</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">AI 신뢰도:</span>
                  <span className={`text-sm font-medium ${getConfidenceColor(searchResult.confidence)}`}>
                    {getConfidenceText(searchResult.confidence)} ({(searchResult.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">검증 상태:</span>
                  <span className={`text-sm font-medium ${getVerificationStatusColor(searchResult.verificationStatus)}`}>
                    {getVerificationStatusText(searchResult.verificationStatus)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">Sabre Hotel Code</h4>
                <div className="text-2xl font-bold text-blue-600 font-mono">
                  {searchResult.sabreHotelCode || '-'}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">검증된 호텔명</h4>
                <div className="text-lg font-semibold text-gray-900">
                  {searchResult.hotelName || '검증 실패'}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500">호텔명 매칭 검증</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-xs text-gray-500">입력된 호텔명:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      &ldquo;{searchResult.verificationDetails.inputHotelName}&rdquo;
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">검증된 호텔명:</span>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      &ldquo;{searchResult.verificationDetails.verifiedHotelName || '검증 실패'}&rdquo;
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">매칭 점수:</span>
                  <span className={`text-sm font-medium ${getVerificationStatusColor(searchResult.verificationStatus)}`}>
                    {(searchResult.verificationDetails.matchScore * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500">AI 분석 결과</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {searchResult.reasoning || '설명 없음'}
                </p>
              </div>
            </div>

            {(searchResult.verificationDetails.address || searchResult.verificationDetails.city || searchResult.verificationDetails.country) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500">호텔 상세 정보</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  {searchResult.verificationDetails.address && (
                    <div>
                      <span className="text-xs text-gray-500">주소</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {searchResult.verificationDetails.address}
                      </div>
                    </div>
                  )}
                  {searchResult.verificationDetails.city && (
                    <div>
                      <span className="text-xs text-gray-500">도시</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {searchResult.verificationDetails.city}
                      </div>
                    </div>
                  )}
                  {searchResult.verificationDetails.country && (
                    <div>
                      <span className="text-xs text-gray-500">국가</span>
                      <div className="text-sm text-gray-900 mt-1">
                        {searchResult.verificationDetails.country}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500">검증 상태 상세</h4>
              <div className="flex items-center gap-2">
                {getVerificationStatusIcon(searchResult.verificationStatus)}
                <span className={`text-sm font-medium ${getVerificationStatusColor(searchResult.verificationStatus)}`}>
                  {getVerificationStatusText(searchResult.verificationStatus)}
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-7">
                매칭 점수 {(searchResult.verificationDetails.matchScore * 100).toFixed(1)}% 기준으로 판단됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-900">AI 기반 검색 시스템</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>1단계:</strong> OpenAI AI가 호텔명을 분석하여 적합한 Sabre Hotel Code를 찾습니다</p>
              <p>• <strong>2단계:</strong> 찾은 코드를 Sabre API로 검증하여 실제 호텔 정보를 가져옵니다</p>
              <p>• <strong>3단계:</strong> 입력된 호텔명과 검증된 호텔명을 비교하여 매칭 점수를 계산합니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
