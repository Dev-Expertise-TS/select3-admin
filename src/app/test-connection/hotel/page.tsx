'use client'

import React, { useState } from 'react'
import { Database, Table, Key, Type, Link as LinkIcon, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TableColumn {
  name: string
  type: string
  nullable: boolean
  primaryKey?: boolean
  foreignKey?: string
  description?: string
}

interface DatabaseTable {
  name: string
  description: string
  category: string
  columns: TableColumn[]
}

const databaseTables: DatabaseTable[] = [
  {
    name: 'select_hotels',
    description: '호텔 기본 정보를 저장하는 메인 테이블',
    category: 'Core',
    columns: [
      { name: 'sabre_id', type: 'VARCHAR', nullable: true, primaryKey: true, description: 'Sabre 시스템 호텔 ID (기본키)' },
      { name: 'paragon_id', type: 'VARCHAR', nullable: true, description: 'Paragon 시스템 호텔 ID (레거시)' },
      { name: 'property_name_ko', type: 'VARCHAR', nullable: true, description: '호텔명 (한글)' },
      { name: 'property_name_en', type: 'VARCHAR', nullable: true, description: '호텔명 (영문)' },
      { name: 'brand_id', type: 'INTEGER', nullable: true, foreignKey: 'hotel_brands.brand_id', description: '브랜드 ID (외래키)' },
      { name: 'destination_sort', type: 'INTEGER', nullable: true, description: '목적지 정렬 순서' },
      { name: 'intro_article', type: 'TEXT', nullable: true, description: '호텔 소개 아티클' },
      { name: 'blog_article', type: 'TEXT', nullable: true, description: '호텔 블로그 아티클' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: '생성 시간' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: '수정 시간' }
    ]
  },
  {
    name: 'hotel_chains',
    description: '호텔 체인 정보 테이블',
    category: 'Master',
    columns: [
      { name: 'chain_id', type: 'SERIAL', nullable: false, primaryKey: true, description: '체인 ID (기본키, 자동증가)' },
      { name: 'name_kr', type: 'VARCHAR', nullable: true, description: '체인명 (한글)' },
      { name: 'name_en', type: 'VARCHAR', nullable: true, description: '체인명 (영문)' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: '생성 시간' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: '수정 시간' }
    ]
  },
  {
    name: 'hotel_brands',
    description: '호텔 브랜드 정보 테이블',
    category: 'Master',
    columns: [
      { name: 'brand_id', type: 'SERIAL', nullable: false, primaryKey: true, description: '브랜드 ID (기본키, 자동증가)' },
      { name: 'name_kr', type: 'VARCHAR', nullable: true, description: '브랜드명 (한글)' },
      { name: 'name_en', type: 'VARCHAR', nullable: true, description: '브랜드명 (영문)' },
      { name: 'chain_id', type: 'INTEGER', nullable: true, foreignKey: 'hotel_chains.chain_id', description: '체인 ID (외래키)' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: '생성 시간' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: '수정 시간' }
    ]
  },
  {
    name: 'select_hotel_benefits',
    description: '호텔 혜택 마스터 정보 테이블',
    category: 'Benefits',
    columns: [
      { name: 'benefit_id', type: 'SERIAL', nullable: false, primaryKey: true, description: '혜택 ID (기본키, 자동증가)' },
      { name: 'benefit', type: 'VARCHAR', nullable: true, description: '혜택명' },
      { name: 'benefit_description', type: 'TEXT', nullable: true, description: '혜택 설명' },
      { name: 'start_date', type: 'DATE', nullable: true, description: '혜택 시작일' },
      { name: 'end_date', type: 'DATE', nullable: true, description: '혜택 종료일' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: '생성 시간' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: false, description: '수정 시간' }
    ]
  },
  {
    name: 'select_hotel_benefits_map',
    description: '호텔과 혜택 간의 매핑 테이블',
    category: 'Benefits',
    columns: [
      { name: 'sabre_id', type: 'VARCHAR', nullable: false, primaryKey: true, foreignKey: 'select_hotels.sabre_id', description: 'Sabre 호텔 ID (복합키)' },
      { name: 'benefit_id', type: 'INTEGER', nullable: false, primaryKey: true, foreignKey: 'select_hotel_benefits.benefit_id', description: '혜택 ID (복합키)' },
      { name: 'sort', type: 'INTEGER', nullable: true, description: '혜택 표시 순서' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: '생성 시간' }
    ]
  }
]

const typeColors = {
  'VARCHAR': 'bg-blue-100 text-blue-800 border-blue-200',
  'TEXT': 'bg-green-100 text-green-800 border-green-200',
  'INTEGER': 'bg-purple-100 text-purple-800 border-purple-200',
  'SERIAL': 'bg-orange-100 text-orange-800 border-orange-200',
  'TIMESTAMP': 'bg-pink-100 text-pink-800 border-pink-200',
  'DATE': 'bg-yellow-100 text-yellow-800 border-yellow-200'
}

const categoryColors = {
  'Core': 'bg-red-100 text-red-800 border-red-200',
  'Master': 'bg-blue-100 text-blue-800 border-blue-200',
  'Benefits': 'bg-green-100 text-green-800 border-green-200'
}

export default function SelectHotelDB() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const categories = ['All', ...Array.from(new Set(databaseTables.map(table => table.category)))]

  const filteredTables = databaseTables.filter(table => {
    const matchesSearch = searchTerm === '' || 
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.columns.some(col => 
        col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (col.description && col.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    
    const matchesCategory = selectedCategory === 'All' || table.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const toggleExpanded = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Database className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Select Hotel DB</h1>
          <p className="text-sm text-gray-600 mt-1">프로젝트에서 사용하는 데이터베이스 테이블 스키마 정보</p>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="테이블명, 컬럼명 또는 설명으로 검색..."
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

      {/* 테이블 목록 */}
      <div className="space-y-6">
        {filteredTables.map((table) => {
          const isExpanded = expandedTables.has(table.name)
          return (
            <div key={table.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* 테이블 헤더 */}
              <div 
                className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpanded(table.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Table className="h-5 w-5 text-gray-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 font-mono">{table.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{table.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      categoryColors[table.category as keyof typeof categoryColors]
                    )}>
                      {table.category}
                    </span>
                    <span className="text-sm font-medium text-blue-600">
                      {isExpanded ? '접기' : '펼치기'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 컬럼 정보 */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Column Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Constraints
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.columns.map((column, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono font-semibold text-gray-900">
                                {column.name}
                              </code>
                              {column.primaryKey && (
                                <Key className="h-4 w-4 text-yellow-500" />
                              )}
                              {column.foreignKey && (
                                <LinkIcon className="h-4 w-4 text-blue-500" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={cn(
                              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                              typeColors[column.type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                            )}>
                              <Type className="h-3 w-3 mr-1" />
                              {column.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center gap-1">
                              {column.primaryKey && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  PK
                                </span>
                              )}
                              {column.foreignKey && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  FK
                                </span>
                              )}
                              {!column.nullable && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                  NOT NULL
                                </span>
                              )}
                              {column.nullable && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                  NULL
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="max-w-xs">
                              {column.description}
                              {column.foreignKey && (
                                <div className="text-xs text-blue-600 mt-1">
                                  → {column.foreignKey}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            다른 검색어나 카테고리를 시도해보세요.
          </p>
        </div>
      )}

      {/* 통계 정보 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{databaseTables.length}</div>
            <div className="text-sm text-gray-600">총 테이블 수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {databaseTables.reduce((sum, table) => sum + table.columns.length, 0)}
            </div>
            <div className="text-sm text-gray-600">총 컬럼 수</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {databaseTables.filter(table => 
                table.columns.some(col => col.foreignKey)
              ).length}
            </div>
            <div className="text-sm text-gray-600">외래키 관계</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">데이터 타입 범례</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeColors).map(([type, colorClass]) => (
              <div key={type} className="flex items-center gap-1">
                <span className={cn('w-3 h-3 rounded border', colorClass)}></span>
                <span className="text-xs text-gray-600">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}