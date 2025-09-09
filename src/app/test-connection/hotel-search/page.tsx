'use client'

import React, { useState } from 'react'
import { Search, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiEndpoint {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  category: string
  parameters?: string
  example?: string
  response?: string
}

const apiEndpoints: ApiEndpoint[] = [
  // Dashboard APIs
  {
    id: 'dashboard-stats',
    method: 'GET',
    path: '/api/dashboard/stats',
    description: '대시보드 통계 데이터 조회',
    category: 'Dashboard',
    parameters: 'None',
    example: 'GET /api/dashboard/stats',
    response: '{ success: true, data: { totalHotels: 1234, chainCount: 56, ... } }'
  },

  // Hotel APIs
  {
    id: 'hotel-search',
    method: 'POST',
    path: '/api/hotel/search',
    description: '호텔 검색 (한글/영문명, Sabre ID)',
    category: 'Hotel',
    parameters: '{ searching_hotel_name: string }',
    example: 'POST /api/hotel/search\n{ "searching_hotel_name": "힐튼" }',
    response: '{ success: true, data: [...], count: number }'
  },
  {
    id: 'hotel-suggest',
    method: 'POST',
    path: '/api/hotel/suggest',
    description: '호텔 자동완성 제안',
    category: 'Hotel',
    parameters: '{ q: string }',
    example: 'POST /api/hotel/suggest\n{ "q": "힐튼" }',
    response: '{ success: true, data: [...] }'
  },
  {
    id: 'hotel-update',
    method: 'POST',
    path: '/api/hotel/update',
    description: '호텔 정보 업데이트',
    category: 'Hotel',
            parameters: 'FormData (sabre_id, property_name_ko, property_name_en, brand_id, etc.)',
    example: 'POST /api/hotel/update\nFormData with hotel fields',
    response: '{ success: true, data: { updated hotel data } }'
  },
  {
    id: 'hotel-update-rate-plan-codes',
    method: 'POST',
    path: '/api/hotel/update-rate-plan-codes',
    description: '호텔 요금 플랜 코드 업데이트',
    category: 'Hotel',
    parameters: '{ sabre_id: string, rate_plan_code: string[] }',
    example: 'POST /api/hotel/update-rate-plan-codes\n{ "sabre_id": "123", "rate_plan_code": ["CODE1", "CODE2"] }',
    response: '{ success: true, message: "업데이트 완료" }'
  },

  // Rate Plan APIs
  {
    id: 'rate-plan-codes',
    method: 'POST',
    path: '/api/rate-plan-codes',
    description: 'Sabre API 요금 플랜 코드 테스트',
    category: 'Rate Plan',
    parameters: '{ sabre_id: string, check_in: string, check_out: string, rate_plan_code?: string[] }',
    example: 'POST /api/rate-plan-codes\n{ "sabre_id": "123", "check_in": "2024-01-01", "check_out": "2024-01-02" }',
    response: '{ success: true, data: { rate plans... } }'
  },

  // Chain & Brand APIs
  {
    id: 'chain-brand-list',
    method: 'GET',
    path: '/api/chain-brand/list',
    description: '체인 및 브랜드 목록 조회',
    category: 'Chain & Brand',
    parameters: 'None',
    example: 'GET /api/chain-brand/list',
    response: '{ success: true, data: { chains: [...], brands: [...] } }'
  },
  {
    id: 'chain-create',
    method: 'POST',
    path: '/api/chain-brand/chain/create',
    description: '새 호텔 체인 생성',
    category: 'Chain & Brand',
    parameters: '{ name_kr: string, name_en: string }',
    example: 'POST /api/chain-brand/chain/create\n{ "name_kr": "힐튼 체인", "name_en": "Hilton Chain" }',
    response: '{ success: true, data: { new chain } }'
  },
  {
    id: 'chain-save',
    method: 'POST',
    path: '/api/chain-brand/chain/save',
    description: '호텔 체인 정보 수정',
    category: 'Chain & Brand',
    parameters: '{ chain_id: number, name_kr: string, name_en: string }',
    example: 'POST /api/chain-brand/chain/save\n{ "chain_id": 1, "name_kr": "힐튼 체인", "name_en": "Hilton Chain" }',
    response: '{ success: true, data: { updated chain } }'
  },
  {
    id: 'chain-delete',
    method: 'DELETE',
    path: '/api/chain-brand/chain/delete',
    description: '호텔 체인 삭제',
    category: 'Chain & Brand',
    parameters: '{ chain_id: number }',
    example: 'DELETE /api/chain-brand/chain/delete\n{ "chain_id": 1 }',
    response: '{ success: true, message: "삭제 완료" }'
  },
  {
    id: 'brand-create',
    method: 'POST',
    path: '/api/chain-brand/brand/create',
    description: '새 호텔 브랜드 생성',
    category: 'Chain & Brand',
    parameters: '{ name_kr: string, name_en: string, chain_id: number }',
    example: 'POST /api/chain-brand/brand/create\n{ "name_kr": "힐튼 브랜드", "name_en": "Hilton Brand", "chain_id": 1 }',
    response: '{ success: true, data: { new brand } }'
  },
  {
    id: 'brand-save',
    method: 'POST',
    path: '/api/chain-brand/brand/save',
    description: '호텔 브랜드 정보 수정',
    category: 'Chain & Brand',
    parameters: '{ brand_id: number, name_kr: string, name_en: string, chain_id: number }',
    example: 'POST /api/chain-brand/brand/save\n{ "brand_id": 1, "name_kr": "힐튼 브랜드", "name_en": "Hilton Brand", "chain_id": 1 }',
    response: '{ success: true, data: { updated brand } }'
  },
  {
    id: 'brand-delete',
    method: 'DELETE',
    path: '/api/chain-brand/brand/delete',
    description: '호텔 브랜드 삭제',
    category: 'Chain & Brand',
    parameters: '{ brand_id: number }',
    example: 'DELETE /api/chain-brand/brand/delete\n{ "brand_id": 1 }',
    response: '{ success: true, message: "삭제 완료" }'
  },

  // Benefits APIs
  {
    id: 'benefits-list',
    method: 'GET',
    path: '/api/benefits/list',
    description: '호텔 혜택 목록 조회',
    category: 'Benefits',
    parameters: 'None',
    example: 'GET /api/benefits/list',
    response: '{ success: true, data: [...] }'
  },
  {
    id: 'benefits-manage-list',
    method: 'GET',
    path: '/api/benefits/manage/list',
    description: '혜택 관리 목록 조회',
    category: 'Benefits',
    parameters: 'None',
    example: 'GET /api/benefits/manage/list',
    response: '{ success: true, data: [...] }'
  },
  {
    id: 'benefits-manage-save',
    method: 'POST',
    path: '/api/benefits/manage/save',
    description: '혜택 정보 저장',
    category: 'Benefits',
    parameters: '{ benefit_id?: number, name: string, description?: string }',
    example: 'POST /api/benefits/manage/save\n{ "name": "무료 WiFi", "description": "고속 무선 인터넷" }',
    response: '{ success: true, data: { saved benefit } }'
  },
  {
    id: 'benefits-manage-delete',
    method: 'DELETE',
    path: '/api/benefits/manage/delete',
    description: '혜택 삭제',
    category: 'Benefits',
    parameters: '{ benefit_id: number }',
    example: 'DELETE /api/benefits/manage/delete\n{ "benefit_id": 1 }',
    response: '{ success: true, message: "삭제 완료" }'
  }
]

const methodColors = {
  GET: 'bg-green-100 text-green-800 border-green-200',
  POST: 'bg-blue-100 text-blue-800 border-blue-200',
  PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
  PATCH: 'bg-purple-100 text-purple-800 border-purple-200'
}

export default function ApiEndpointTest() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const categories = ['All', ...Array.from(new Set(apiEndpoints.map(api => api.category)))]

  const filteredApis = apiEndpoints.filter(api => {
    const matchesSearch = searchTerm === '' || 
      api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === 'All' || api.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Search className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">API Endpoint Test</h1>
          <p className="text-sm text-gray-600 mt-1">프로젝트에서 사용하는 모든 API 엔드포인트 목록과 테스트 도구</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
              placeholder="API 경로나 설명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* API 목록 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApis.map((api) => {
                const isExpanded = expandedRows.has(api.id)
                return (
                  <React.Fragment key={api.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                          methodColors[api.method]
                        )}>
                          {api.method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            {api.path}
                          </code>
                          <button
                            onClick={() => copyToClipboard(api.path, api.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="경로 복사"
                          >
                            {copiedId === api.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {api.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {api.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleExpanded(api.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            {isExpanded ? '접기' : '상세보기'}
                          </button>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {api.parameters && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Parameters:</h4>
                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                  <code>{api.parameters}</code>
                                </pre>
                              </div>
                            )}
                            {api.example && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Example Request:</h4>
                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                  <code>{api.example}</code>
                                </pre>
                              </div>
                            )}
                            {api.response && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Example Response:</h4>
                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                                  <code>{api.response}</code>
                                </pre>
        </div>
      )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredApis.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              다른 검색어나 카테고리를 시도해보세요.
                  </p>
                </div>
        )}
                </div>

      {/* 통계 정보 */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div>
          총 {apiEndpoints.length}개의 API 엔드포인트 ({filteredApis.length}개 표시)
              </div>
        <div className="flex items-center gap-4">
          {Object.entries(methodColors).map(([method, colorClass]) => (
            <div key={method} className="flex items-center gap-1">
              <span className={cn('w-3 h-3 rounded-full border', colorClass)}></span>
              <span>{method}</span>
            </div>
          ))}
        </div>
        </div>
    </div>
  )
}