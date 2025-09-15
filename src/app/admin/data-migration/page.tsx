'use client'

import { useState, useRef } from 'react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowRightLeft, 
  Upload, 
  Download, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  FileText,
  Settings,
  Network,
  Building,
  Search,
  Save,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MigrationTask {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  error?: string
}

interface HotelData {
  [key: string]: unknown
}

export default function DataMigrationPage() {
  const [sabreId, setSabreId] = useState('')
  const [hotelData, setHotelData] = useState<HotelData | null>(null)
  const [editingData, setEditingData] = useState<HotelData>({})
  const [isLoadingHotel, setIsLoadingHotel] = useState(false)
  const [isSavingHotel, setIsSavingHotel] = useState(false)
  const [isCreatingHotel, setIsCreatingHotel] = useState(false)
  const [hotelError, setHotelError] = useState('')
  const [isNewHotel, setIsNewHotel] = useState(false)
  
  // CSV 업로드 관련 상태
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<{
    headers: string[]
    data: Record<string, string>[]
    totalRows: number
    mappableColumns: string[]
    selectHotelsColumns: string[]
  } | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<Record<string, string> | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [isUploadingCsv, setIsUploadingCsv] = useState(false)
  const [isUpserting, setIsUpserting] = useState(false)
  const [csvError, setCsvError] = useState('')
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('id_old')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // 파일 입력 ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // not null 필드들 (실제 데이터베이스에서 확인된 필드들)
  const notNullFields = new Set([
    'id_old', 'sort_id', 'sabre_id', 'slug', 'paragon_id', 'property_name_ko', 
    'property_name_en', 'city', 'chain_ko', 'property_address', 'destination_sort', 
    'property_details', 'created_at', 'image_1', 'image_2', 'image_3', 'image_4', 
    'image_5', 'badge', 'benefit', 'benefit_1', 'benefit_2', 'benefit_3', 
    'benefit_4', 'benefit_5', 'benefit_6', 'benefit_details', 'benefit_1_details', 
    'benefit_2_details', 'benefit_3_details', 'benefit_4_details', 'benefit_5_details', 
    'benefit_6_details', 'id'
  ])
  
  const [migrationTasks, setMigrationTasks] = useState<MigrationTask[]>([
    {
      id: '1',
      name: '호텔 데이터 마이그레이션',
      description: '기존 호텔 데이터를 새로운 스키마로 마이그레이션',
      status: 'pending',
      progress: 0
    },
    {
      id: '2',
      name: '체인 브랜드 데이터 마이그레이션',
      description: '체인 및 브랜드 데이터를 정규화된 구조로 마이그레이션',
      status: 'pending',
      progress: 0
    },
    {
      id: '3',
      name: '혜택 데이터 마이그레이션',
      description: '호텔 혜택 데이터를 새로운 테이블 구조로 마이그레이션',
      status: 'pending',
      progress: 0
    }
  ])


  const handleSearchHotel = async () => {
    if (!sabreId.trim()) {
      setHotelError('Sabre ID를 입력해주세요')
      return
    }

    setIsLoadingHotel(true)
    setHotelError('')
    setHotelData(null)
    setEditingData({})
    setIsNewHotel(false)

    try {
      const response = await fetch(`/api/hotel/get?sabre_id=${encodeURIComponent(sabreId)}`)
      const result = await response.json()

      if (result.success) {
        setHotelData(result.data)
        setEditingData(result.data)
        setIsNewHotel(false)
      } else {
        if (response.status === 404) {
          // 호텔이 없으면 신규 등록 모드로 전환
          setIsNewHotel(true)
          setEditingData({ sabre_id: sabreId })
          setHotelError('')
        } else {
          setHotelError(result.error || '호텔 데이터를 찾을 수 없습니다')
        }
      }
    } catch {
      setHotelError('호텔 데이터 조회 중 오류가 발생했습니다')
    } finally {
      setIsLoadingHotel(false)
    }
  }

  const handleFieldChange = (field: string, value: unknown) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveHotel = async () => {
    if (!hotelData || !sabreId) return

    setIsSavingHotel(true)

    try {
      const updates: HotelData = {}
      
      // 변경된 필드만 찾아서 업데이트
      Object.keys(editingData).forEach(key => {
        if (editingData[key] !== hotelData[key]) {
          updates[key] = editingData[key]
        }
      })

      if (Object.keys(updates).length === 0) {
        setHotelError('변경된 데이터가 없습니다')
        setIsSavingHotel(false)
        return
      }

      const response = await fetch('/api/hotel/update-single', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: sabreId,
          updates
        })
      })

      const result = await response.json()

      if (result.success) {
        setHotelData(result.data)
        setEditingData(result.data)
        setHotelError('')
        alert('호텔 데이터가 성공적으로 저장되었습니다')
      } else {
        setHotelError(result.error || '저장 중 오류가 발생했습니다')
      }
    } catch {
      setHotelError('저장 중 오류가 발생했습니다')
    } finally {
      setIsSavingHotel(false)
    }
  }

  const handleCreateHotel = async () => {
    if (!sabreId || !editingData) return

    setIsCreatingHotel(true)

    try {
      // sabre_id를 제외한 데이터만 전송
      const { sabre_id: _sabre_id, ...hotelData } = editingData

      const response = await fetch('/api/hotel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: sabreId,
          hotel_data: hotelData
        })
      })

      const result = await response.json()

      if (result.success) {
        setHotelData(result.data)
        setEditingData(result.data)
        setIsNewHotel(false)
        setHotelError('')
        alert('호텔 데이터가 성공적으로 생성되었습니다')
      } else {
        setHotelError(result.error || '생성 중 오류가 발생했습니다')
      }
    } catch {
      setHotelError('생성 중 오류가 발생했습니다')
    } finally {
      setIsCreatingHotel(false)
    }
  }

  // CSV 파일 업로드 처리
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('CSV 파일만 업로드 가능합니다')
      return
    }

          // 기존 데이터 초기화 (같은 이름의 파일이어도 새로 업로드)
      setCsvData(null)
      setSelectedRecord(null)
      setColumnMapping({})
      setCsvError('')
      setCurrentPage(1)
      setSortColumn('id_old')
      setSortDirection('asc')

    setCsvFile(file)
    setIsUploadingCsv(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/data-migration/parse-csv', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setCsvData(result.data)
        setCurrentPage(1) // 새 CSV 업로드 시 첫 페이지로 리셋
        setSelectedRecord(null) // 선택 해제
        // 자동 컬럼 매핑 시도
        const autoMapping: Record<string, string> = {}
        result.data.headers.forEach((header: string) => {
          const lowerHeader = header.toLowerCase()
          if (result.data.selectHotelsColumns.includes(lowerHeader)) {
            autoMapping[header] = lowerHeader
          } else if (result.data.selectHotelsColumns.includes(header)) {
            autoMapping[header] = header
          }
        })
        setColumnMapping(autoMapping)
        
        // 파일 입력 필드 초기화 (같은 파일 재업로드 가능하도록)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setCsvError(result.error || 'CSV 파일 처리 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('CSV 업로드 오류:', error)
      setCsvError('CSV 파일 업로드 중 오류가 발생했습니다')
    } finally {
      setIsUploadingCsv(false)
    }
  }

  // 레코드 선택 처리
  const handleRecordSelect = (record: Record<string, string>) => {
    setSelectedRecord(record)
  }

  // 컬럼 매핑 변경 처리
  const handleColumnMappingChange = (csvColumn: string, selectHotelsColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: selectHotelsColumn
    }))
  }

  // 선택된 레코드를 select_hotels에 upsert
  const handleUpsertRecord = async () => {
    if (!selectedRecord || !csvData) {
      alert('선택된 레코드가 없습니다')
      return
    }

    const mappedColumns = Object.entries(columnMapping).filter(([, target]) => target)
    if (mappedColumns.length === 0) {
      alert('컬럼 매핑을 설정해주세요')
      return
    }

    setIsUpserting(true)

    try {
      const response = await fetch('/api/data-migration/upsert-hotel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: selectedRecord,
          columnMapping
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`호텔이 성공적으로 ${result.action === 'created' ? '생성' : '업데이트'}되었습니다`)
        setSelectedRecord(null)
      } else {
        alert(result.error || '호텔 upsert 중 오류가 발생했습니다')
      }
    } catch (error) {
      console.error('호텔 upsert 오류:', error)
      alert('호텔 upsert 중 오류가 발생했습니다')
    } finally {
      setIsUpserting(false)
    }
  }

  // 정렬 함수
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1) // 정렬 시 첫 페이지로 이동
    setSelectedRecord(null) // 선택 해제
  }

  // 정렬된 데이터 계산
  const getSortedData = () => {
    if (!csvData) return []
    
    return [...csvData.data].sort((a, b) => {
      const aValue = a[sortColumn] || ''
      const bValue = b[sortColumn] || ''
      
      // 숫자 정렬 (id_old 같은 경우)
      if (sortColumn === 'id_old' || sortColumn === 'sabre_id') {
        const aNum = Number(aValue) || 0
        const bNum = Number(bValue) || 0
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
      }
      
      // 문자열 정렬
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // 페이지네이션 관련 함수들
  const sortedData = getSortedData()
  const totalPages = csvData ? Math.ceil(sortedData.length / itemsPerPage) : 0
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = sortedData.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setSelectedRecord(null) // 페이지 변경 시 선택 해제
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
      setSelectedRecord(null)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
      setSelectedRecord(null)
    }
  }

  const handleStartMigration = async (taskId: string) => {
    setMigrationTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'running' as const, progress: 0 }
          : task
      )
    )

    try {
      // 마이그레이션 타입 매핑
      const migrationTypeMap: Record<string, string> = {
        '1': 'hotel_data',
        '2': 'chain_brand_data',
        '3': 'benefits_data'
      }

      const migrationType = migrationTypeMap[taskId]
      
      // 진행률 시뮬레이션
      for (let i = 0; i <= 80; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setMigrationTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, progress: i }
              : task
          )
        )
      }

      // 실제 API 호출
      const response = await fetch('/api/data-migration/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ migrationType })
      })

      const result = await response.json()

      if (result.success) {
        setMigrationTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed' as const, progress: 100 }
              : task
          )
        )
      } else {
        setMigrationTasks(prev => 
          prev.map(task => 
            task.id === taskId 
              ? { ...task, status: 'error' as const, error: result.error }
              : task
          )
        )
      }
    } catch {
      setMigrationTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, status: 'error' as const, error: '마이그레이션 중 오류가 발생했습니다' }
            : task
        )
      )
    }
  }

  const handleExportData = async (table?: string) => {
    try {
      const url = table 
        ? `/api/data-migration/export?table=${table}`
        : '/api/data-migration/export?table=select_hotels'
      
      const response = await fetch(url)
      
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${table || 'all_data'}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        console.error('데이터 내보내기 실패')
      }
    } catch (error) {
      console.error('데이터 내보내기 오류:', error)
    }
  }

  const getStatusIcon = (status: MigrationTask['status']) => {
    switch (status) {
      case 'pending':
        return <Settings className="h-4 w-4 text-gray-400" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = (status: MigrationTask['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700'
      case 'running':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'error':
        return 'bg-red-100 text-red-700'
    }
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">데이터 마이그레이션</h1>
          </div>
          <p className="text-muted-foreground">
            데이터베이스 스키마 변경이나 데이터 구조 개선을 위한 마이그레이션을 관리합니다.
          </p>
        </div>

        <div className="grid gap-8">
          {/* 호텔 데이터 편집 섹션 */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              호텔 데이터 편집
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sabre ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Sabre ID를 입력하세요"
                    value={sabreId}
                    onChange={(e) => setSabreId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchHotel()}
                  />
                </div>
                <Button 
                  onClick={handleSearchHotel}
                  disabled={isLoadingHotel || !sabreId.trim()}
                >
                  {isLoadingHotel ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      조회중...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      조회
                    </>
                  )}
                </Button>
              </div>

              {hotelError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{hotelError}</p>
                </div>
              )}

              {(hotelData || isNewHotel) && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">
                      {isNewHotel ? '신규 호텔 등록' : '호텔 데이터 편집'}
                    </h3>
                    {isNewHotel ? (
                      <Button 
                        onClick={handleCreateHotel}
                        disabled={isCreatingHotel}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCreatingHotel ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            생성중...
                          </>
                        ) : (
                          <>
                            <Edit3 className="h-4 w-4 mr-2" />
                            신규 등록
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSaveHotel}
                        disabled={isSavingHotel}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isSavingHotel ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            저장중...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            저장
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {isNewHotel && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-600">
                        해당 Sabre ID의 호텔이 존재하지 않습니다. 신규 호텔을 등록할 수 있습니다.
                      </p>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            컬럼명
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            값
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {isNewHotel ? (
                          // 신규 등록 모드: 실제 테이블의 모든 컬럼 표시
                          [
                            'sabre_id',
                            'paragon_id',
                            'property_name_ko',
                            'property_name_en',
                            'city',
                            'city_ko',
                            'city_en',
                            'country_ko',
                            'country_en',
                            'continent_ko',
                            'continent_en',
                            'chain_ko',
                            'chain_en',
                            'property_address',
                            'destination_sort',
                            'property_location',
                            'link',
                            'property_details',
                            'image_1',
                            'image_2',
                            'image_3',
                            'image_4',
                            'image_5',
                            'badge',
                            'badge_1',
                            'badge_2',
                            'badge_3',
                            'benefit',
                            'benefit_1',
                            'benefit_2',
                            'benefit_3',
                            'benefit_4',
                            'benefit_5',
                            'benefit_6',
                            'benefit_details',
                            'benefit_1_details',
                            'benefit_2_details',
                            'benefit_3_details',
                            'benefit_4_details',
                            'benefit_5_details',
                            'benefit_6_details',
                            'event_1',
                            'event_1_details_1',
                            'event_1_details_2',
                            'event_1_details_3',
                            'event_1_details_4',
                            'event_1_details_5',
                            'event_2',
                            'event_2_details_1',
                            'event_2_details_2',
                            'event_2_details_3',
                            'event_2_details_4',
                            'blogs',
                            'blogs_s1',
                            'blogs_s2',
                            'blogs_s3',
                            'blogs_s4',
                            'blogs_s5',
                            'blogs_s6',
                            'blogs_s7',
                            'rate_code',
                            'rate_plan_codes',
                            'brand_id'
                          ].map((key) => (
                            <tr key={key}>
                              <td className={cn(
                                "px-4 py-3 text-sm font-medium",
                                notNullFields.has(key) ? "text-red-600" : "text-gray-900"
                              )}>
                                {key}
                                {notNullFields.has(key) && (
                                  <span className="ml-1 text-red-500">*</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {key === 'sabre_id' ? (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className="w-full bg-gray-50"
                                    placeholder="자동 입력됨"
                                    disabled={true}
                                  />
                                ) : key.includes('image_') || key === 'link' ? (
                                  <Input
                                    type="url"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className="w-full"
                                    placeholder={`${key} URL 입력`}
                                  />
                                ) : key.includes('_details') || key === 'property_details' ? (
                                  <textarea
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder={`${key} 상세 내용 입력`}
                                  />
                                ) : key === 'rate_code' || key === 'rate_plan_codes' ? (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className="w-full"
                                    placeholder="콤마로 구분하여 입력 (예: TLC, BAR, CORP)"
                                  />
                                ) : key === 'brand_id' || key === 'destination_sort' ? (
                                  <Input
                                    type="number"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value ? Number(e.target.value) : null)}
                                    className="w-full"
                                    placeholder={`${key} 숫자 입력`}
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className="w-full"
                                    placeholder={`${key} 입력`}
                                  />
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          // 기존 호텔 편집 모드: 모든 필드 표시
                          hotelData && Object.entries(hotelData).map(([key]) => (
                            <tr key={key}>
                              <td className={cn(
                                "px-4 py-3 text-sm font-medium",
                                notNullFields.has(key) ? "text-red-600" : "text-gray-900"
                              )}>
                                {key}
                                {notNullFields.has(key) && (
                                  <span className="ml-1 text-red-500">*</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {key === 'sabre_id' ? (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className={cn(
                                      'w-full bg-gray-50',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    disabled={true}
                                  />
                                ) : key.includes('image_') || key === 'link' ? (
                                  <Input
                                    type="url"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className={cn(
                                      'w-full',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    placeholder={`${key} URL 입력`}
                                  />
                                ) : key.includes('_details') || key === 'property_details' ? (
                                  <textarea
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className={cn(
                                      'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    rows={3}
                                    placeholder={`${key} 상세 내용 입력`}
                                  />
                                ) : key === 'rate_code' || key === 'rate_plan_codes' ? (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className={cn(
                                      'w-full',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    placeholder="콤마로 구분하여 입력 (예: TLC, BAR, CORP)"
                                  />
                                ) : key === 'brand_id' || key === 'destination_sort' ? (
                                  <Input
                                    type="number"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value ? Number(e.target.value) : null)}
                                    className={cn(
                                      'w-full',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    placeholder={`${key} 숫자 입력`}
                                  />
                                ) : (
                                  <Input
                                    type="text"
                                    value={String(editingData[key] ?? '')}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    className={cn(
                                      'w-full',
                                      editingData[key] !== hotelData[key] && 'bg-yellow-50 border-yellow-300'
                                    )}
                                    placeholder={`${key} 입력`}
                                  />
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CSV 파일 업로드 섹션 */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              CSV 파일 업로드 및 데이터 마이그레이션
            </h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">
                  CSV 파일을 업로드하여 select_hotels 테이블에 데이터를 마이그레이션하세요
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="max-w-xs mx-auto"
                  disabled={isUploadingCsv}
                />
                {csvFile && (
                  <p className="text-sm text-green-600 mt-2">
                    선택된 파일: {csvFile.name}
                  </p>
                )}
                {isUploadingCsv && (
                  <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    CSV 파일 처리 중...
                  </p>
                )}
                {csvError && (
                  <p className="text-sm text-red-600 mt-2">{csvError}</p>
                )}
              </div>

              {/* CSV 데이터 테이블 */}
              {csvData && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">
                      CSV 데이터 ({csvData.totalRows}개 레코드, {startIndex + 1}-{Math.min(endIndex, csvData.data.length)} 표시)
                    </h3>
                    {selectedRecord && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-blue-600">
                          선택된 레코드: {selectedRecord.sabre_id || 'N/A'}
                        </span>
                        <Button
                          onClick={handleUpsertRecord}
                          disabled={isUpserting}
                          size="sm"
                        >
                          {isUpserting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              처리중...
                            </>
                          ) : (
                            '선택된 레코드 Upsert'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* CSV 데이터 테이블 - 고정된 컨테이너 */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-96" style={{ width: '100%', maxWidth: '100%' }}>
                      <table className="table-fixed divide-y divide-gray-200" style={{ width: '100%', minWidth: '100%' }}>
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20" style={{ width: '60px' }}>
                              선택
                            </th>
                            {['slug', 'sabre_id', 'id_old', 'property_name_ko', 'property_name_en', 'city', 'chain_ko', 'property_address'].map((header) => (
                              <th 
                                key={header} 
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate cursor-pointer hover:bg-gray-100 select-none" 
                                style={{ width: '11.75%' }}
                                onClick={() => handleSort(header)}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{header}</span>
                                  {sortColumn === header && (
                                    <span className="text-blue-600">
                                      {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentData.map((record, index) => (
                            <tr 
                              key={startIndex + index} 
                              className={cn(
                                "hover:bg-gray-50 cursor-pointer",
                                selectedRecord === record && "bg-blue-50"
                              )}
                              onClick={() => handleRecordSelect(record)}
                            >
                              <td className={cn(
                                "px-4 py-3 text-sm sticky left-0 z-10",
                                selectedRecord === record ? "bg-blue-50" : "bg-white"
                              )} style={{ width: '60px' }}>
                                <input
                                  type="radio"
                                  name="selectedRecord"
                                  checked={selectedRecord === record}
                                  onChange={() => handleRecordSelect(record)}
                                  className="h-4 w-4 text-blue-600"
                                />
                              </td>
                              {['slug', 'sabre_id', 'id_old', 'property_name_ko', 'property_name_en', 'city', 'chain_ko', 'property_address'].map((header) => (
                                <td key={header} className="px-4 py-3 text-sm text-gray-900 truncate" style={{ width: '11.75%' }} title={record[header] || '-'}>
                                  {record[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">
                          {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} 레코드 (페이지 {currentPage}/{totalPages})
                          <br />
                          <span className="text-xs text-gray-500">
                            CSV 원본: {csvData?.data?.length || 0}개, 정렬된 데이터: {sortedData.length}개, 페이지당: {itemsPerPage}개
                          </span>
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          size="sm"
                          variant="outline"
                        >
                          이전
                        </Button>
                        
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* 모든 페이지 표시 (최대 20개) */}
                          {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => {
                            const pageNum = i + 1
                            return (
                              <Button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                size="sm"
                                variant={currentPage === pageNum ? "default" : "outline"}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                          
                          {/* 20개를 초과하는 경우 "..." 표시 */}
                          {totalPages > 20 && (
                            <>
                              <span className="text-gray-500">...</span>
                              <Button
                                onClick={() => handlePageChange(totalPages)}
                                size="sm"
                                variant={currentPage === totalPages ? "default" : "outline"}
                                className="w-8 h-8 p-0"
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </div>
                        
                        <Button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          size="sm"
                          variant="outline"
                        >
                          다음
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 컬럼 매핑 설정 */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">컬럼 매핑 설정 (모든 컬럼)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {csvData.headers.map((header) => (
                        <div key={header} className="flex items-center gap-2">
                          <span className="text-sm font-medium w-32 truncate">{header}</span>
                          <span className="text-sm text-gray-500">→</span>
                          <select
                            value={columnMapping[header] || ''}
                            onChange={(e) => handleColumnMappingChange(header, e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">매핑 안함</option>
                            {csvData.selectHotelsColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      총 {csvData.headers.length}개 컬럼 중 테이블에는 주요 8개 컬럼만 표시됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 마이그레이션 작업 목록 */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              마이그레이션 작업
            </h2>
            <div className="space-y-4">
              {migrationTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <h3 className="font-medium">{task.name}</h3>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getStatusColor(task.status)
                      )}>
                        {task.status === 'pending' && '대기중'}
                        {task.status === 'running' && '실행중'}
                        {task.status === 'completed' && '완료'}
                        {task.status === 'error' && '오류'}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleStartMigration(task.id)}
                      disabled={task.status === 'running' || task.status === 'completed'}
                      size="sm"
                    >
                      {task.status === 'running' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          실행중...
                        </>
                      ) : (
                        '시작'
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  
                  {/* 진행률 바 */}
                  {task.status === 'running' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {task.status === 'completed' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-green-500 h-2 rounded-full w-full" />
                    </div>
                  )}
                  
                  {task.error && (
                    <p className="text-sm text-red-600 mt-2">{task.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 데이터 내보내기 섹션 */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5" />
              데이터 내보내기
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                현재 데이터베이스의 데이터를 백업하거나 다른 시스템으로 내보낼 수 있습니다.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => handleExportData()} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  전체 데이터 내보내기
                </Button>
                <Button onClick={() => handleExportData('select_hotels')} variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  호텔 데이터만 내보내기
                </Button>
                <Button onClick={() => handleExportData('hotel_chains')} variant="outline">
                  <Network className="h-4 w-4 mr-2" />
                  체인 데이터 내보내기
                </Button>
                <Button onClick={() => handleExportData('hotel_brands')} variant="outline">
                  <Building className="h-4 w-4 mr-2" />
                  브랜드 데이터 내보내기
                </Button>
              </div>
            </div>
          </div>

          {/* 주의사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              주의사항
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 마이그레이션 작업은 되돌릴 수 없으므로 신중하게 진행하세요.</li>
              <li>• 작업 전에 반드시 데이터베이스 백업을 수행하세요.</li>
              <li>• 대용량 데이터의 경우 작업 시간이 오래 걸릴 수 있습니다.</li>
              <li>• 작업 중에는 다른 관리 작업을 중단하는 것을 권장합니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
