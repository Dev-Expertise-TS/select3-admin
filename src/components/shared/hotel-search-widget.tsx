'use client'

import React, { useState, FormEvent, useEffect, useRef } from 'react'
import { 
  Search, 
  Loader2, 
  Building2, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Play,
  Save,
  Edit3,
  EyeOff,
  FolderPlus,
  FolderCheck,
  FolderX,
  Database,
  ImageIcon,
  Plus,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import NextImage from 'next/image'
import { Button } from '@/components/ui/button'

import { cn, getDateAfterDays, formatJson } from '@/lib/utils'
import { BaseButton } from '@/components/shared/form-actions'
import DateInput from '@/components/shared/date-input'
import { 
  HotelSearchResult, 
  HotelSearchApiResponse, 
  RatePlanCodesApiResponse, 
  ExpandedRowState, 
  HotelDetailsRequest 
} from '@/types/hotel'

interface ImageInfo {
  width: number
  height: number
  size: number // bytes
  format: string
  loading: boolean
  error: string | null
}

interface StorageFolderInfo {
  exists: boolean
  slug: string
  folderPath: string
  path: string
  fileCount?: number
  loading: boolean
  error: string | null
}

interface StorageImage {
  name: string
  url: string
  size?: number
  lastModified?: string
  contentType?: string
  role?: string
  seq: number
  isPublic?: boolean
  storagePath?: string
}

interface ImageManagementPanelProps {
  hotel: HotelSearchResult
  hotelId: string
  state: {
    loading: boolean
    saving: boolean
    error: string | null
    success: string | null
    editingImages: boolean
    imageUrls: {
      image_1: string
      image_2: string
      image_3: string
      image_4: string
      image_5: string
    }
    imageInfos: {
      image_1: ImageInfo | null
      image_2: ImageInfo | null
      image_3: ImageInfo | null
      image_4: ImageInfo | null
      image_5: ImageInfo | null
    }
    storageFolder: StorageFolderInfo | null
    storageImages: StorageImage[] | null
    savingImages: {
      [key: string]: boolean
    }
  } | undefined
  onToggleEditMode: (hotelId: string) => void
  onSaveImageUrls: (hotelId: string, sabreId: string) => void
  onCreateStorageFolder: (hotelId: string, sabreId: string) => void
  onCheckStorageFolder: (hotelId: string, sabreId: string) => void
  onLoadStorageImages: (hotelId: string, sabreId: string) => void
}

const ImageManagementPanel: React.FC<ImageManagementPanelProps> = ({
  hotel,
  hotelId,
  state,
  onToggleEditMode,
  onSaveImageUrls,
  onCreateStorageFolder,
  onCheckStorageFolder,
  onLoadStorageImages
}) => {
  if (!state) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">이미지 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 호텔 정보 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            {hotel.property_name_ko || hotel.property_name_en || '호텔 정보'}
          </h4>
          <p className="text-sm text-gray-600 mt-1">Sabre ID: {hotel.sabre_id}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onToggleEditMode(hotelId)}
            variant={state.editingImages ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            {state.editingImages ? <EyeOff className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {state.editingImages ? '편집 취소' : '편집하기'}
          </Button>
          {state.editingImages && (
            <Button
              onClick={() => onSaveImageUrls(hotelId, String(hotel.sabre_id))}
              disabled={state.saving}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              {state.saving ? '저장 중...' : '저장하기'}
            </Button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {state.error}
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {state.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {state.success}
          </div>
        </div>
      )}

      {/* Storage 폴더 관리 섹션 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-md font-medium text-gray-900">Storage 폴더 관리</h5>
          <Button
            onClick={() => onCheckStorageFolder(hotelId, String(hotel.sabre_id))}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            상태 확인
          </Button>
        </div>
        
        {state.storageFolder?.loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            Storage 폴더 상태를 확인하는 중...
          </div>
        ) : state.storageFolder?.error ? (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {state.storageFolder.error}
          </div>
        ) : state.storageFolder ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {state.storageFolder.exists ? (
                <>
                  <FolderCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">폴더가 존재합니다</span>
                </>
              ) : (
                <>
                  <FolderX className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">폴더가 존재하지 않습니다</span>
                </>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              <div><strong>Slug:</strong> {state.storageFolder.slug}</div>
              <div><strong>경로:</strong> select-media/{state.storageFolder.folderPath}</div>
              {state.storageFolder.fileCount !== undefined && (
                <div><strong>파일 수:</strong> {state.storageFolder.fileCount}개</div>
              )}
            </div>
            
            {!state.storageFolder.exists && (
              <Button
                onClick={() => onCreateStorageFolder(hotelId, String(hotel.sabre_id))}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <FolderPlus className="h-4 w-4" />
                폴더 생성
              </Button>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            Storage 폴더 상태를 확인하려면 &quot;상태 확인&quot; 버튼을 클릭하세요.
          </div>
        )}
      </div>

      {/* 로딩 상태 */}
      {state.loading && (
        <div className="rounded-lg border bg-white p-4 text-gray-700">이미지 정보를 불러오는 중...</div>
      )}

      {/* 이미지 편집 폼 */}
      {!state.loading && (
        <div className="space-y-6">
          {/* Supabase Storage 이미지 그리드 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold text-gray-900">
                호텔 이미지 목록
              </h5>
              <div className="flex gap-2">
                <Button
                  onClick={() => onLoadStorageImages(hotelId, String(hotel.sabre_id))}
                  disabled={state.loading}
                  size="sm"
                  variant="outline"
                >
                  새로고침
                </Button>
                <div className="text-sm text-gray-500">
                  Supabase Storage에서 조회
                </div>
              </div>
            </div>
            
            {/* Storage 폴더 상태 */}
            {state.storageFolder && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Storage 폴더:</span>
                  <span className="text-sm text-blue-700 font-mono">
                    {state.storageFolder.path}
                  </span>
                  {state.storageFolder.exists ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      존재함
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      없음
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* 업로드 버튼 */}
            <div className="flex justify-end mb-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !hotel.sabre_id) return;

                    const formData = new FormData();
                    formData.append('sabreId', String(hotel.sabre_id));
                    formData.append('file', file);

                    try {
                      const res = await fetch('/api/hotel-images/upload', {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert('이미지가 업로드되었습니다.');
                        onLoadStorageImages(hotelId, String(hotel.sabre_id));
                      } else {
                        alert(`업로드 실패: ${data.error}`);
                      }
                    } catch (err) {
                      alert('업로드 중 오류가 발생했습니다.');
                    }
                    e.target.value = '';
                  }}
                />
                <Button type="button" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  이미지 업로드
                </Button>
              </label>
            </div>

            {/* 이미지 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.storageImages?.map((image, _index) => (
                <div key={`${hotelId}-${image.name ?? 'noname'}-${String(image.seq ?? _index)}`} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* 헤더 */}
                  <div className="p-3 bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">
                            {String(image.seq).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {image.name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {image.role && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            {image.role}
                          </span>
                        )}
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                          Public
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 이미지 미리보기 */}
                  <div className="aspect-video bg-gray-100">
                    <NextImage
                      unoptimized
                      src={image.url}
                      alt={`${image.name} 미리보기`}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-sm">이미지 로드 실패</span></div>'
                        }
                      }}
                    />
                  </div>

                  {/* 파일 정보 */}
                  <div className="p-3">
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>크기:</span>
                        <span className="font-mono">
                          {image.size ? `${(image.size / 1024).toFixed(1)} KB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>타입:</span>
                        <span className="font-mono">
                          {image.contentType?.split('/')[1]?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>수정일:</span>
                        <span>
                          {image.lastModified ? new Date(image.lastModified).toLocaleDateString('ko-KR') : 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Storage 경로 */}
                    {image.storagePath && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <div className="text-gray-500 mb-1">Storage 경로:</div>
                        <div className="font-mono text-gray-700 break-all">
                          {image.storagePath}
                        </div>
                      </div>
                    )}

                    {/* 삭제 버튼 */}
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          if (!confirm(`정말로 ${image.name}을(를) 삭제하시겠습니까?`)) return;
                          
                          const pathToDelete = (image as any).path || image.storagePath;
                          if (!pathToDelete) {
                            alert('파일 경로를 찾을 수 없습니다.');
                            return;
                          }

                          try {
                            const res = await fetch(`/api/hotel-images/delete?filePath=${encodeURIComponent(pathToDelete)}`, {
                              method: 'DELETE',
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert('이미지가 삭제되었습니다.');
                              onLoadStorageImages(hotelId, String(hotel.sabre_id));
                            } else {
                              alert(`삭제 실패: ${data.error}`);
                            }
                          } catch (err) {
                            alert('삭제 중 오류가 발생했습니다.');
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </div>
              )) || []}
            </div>
            
            {/* 이미지가 없는 경우 */}
            {(!state.storageImages || state.storageImages.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Supabase Storage에 이미지가 없습니다.</p>
                <p className="text-sm">호텔 이미지 마이그레이션을 통해 이미지를 업로드하세요.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

interface HotelSearchWidgetProps {
  /** 위젯의 타이틀 */
  title?: string
  /** 위젯의 설명 */
  description?: string
  /** 컨테이너 클래스명 */
  className?: string
  /** 헤더를 숨길지 여부 */
  hideHeader?: boolean
  /** 호텔 편집 모드 (호텔명 클릭시 상세 편집 페이지로 이동) */
  enableHotelEdit?: boolean
  /** 초기 로딩 시 최신 호텔 리스트 표시 */
  showInitialHotels?: boolean
  /** 이미지 관리 모드 활성화 */
  enableImageManagement?: boolean
  /** 호텔 선택 시 콜백 함수 */
  onHotelSelect?: (sabreId: string | null, hotelInfo?: {
    sabre_id: string
    property_name_ko: string | null
    property_name_en: string | null
  }) => void
  /** 체인 브랜드 연결 모드 활성화 */
  enableChainBrandConnect?: boolean
  /** 연결할 체인 ID */
  connectChainId?: number | null
  /** 연결할 브랜드 ID */
  connectBrandId?: number | null
  /** 연결 성공 시 콜백 함수 */
  onConnectSuccess?: (sabreId: string) => void
}

export default function HotelSearchWidget({ 
  title = "호텔 검색", 
  description = "호텔 데이터베이스에서 호텔을 검색하고 관리하세요",
  className = "",
  hideHeader = false,
  enableHotelEdit = false,
  showInitialHotels = false,
  enableImageManagement = false,
  onHotelSelect,
  enableChainBrandConnect = false,
  connectChainId = null,
  connectBrandId = null,
  onConnectSuccess
}: HotelSearchWidgetProps) {
  // State 관리
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState(false);
  // 입력 제안 상태
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suppressSuggest, setSuppressSuggest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const firstResultRef = useRef<HTMLButtonElement | null>(null);

  // 초기 호텔 목록 로드
  useEffect(() => {
    if (showInitialHotels && !hasSearched) {
      loadInitialHotels();
    }
  }, [showInitialHotels, hasSearched]);
  
  // 확장 패널 관련 state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedRowState, setExpandedRowState] = useState<ExpandedRowState | null>(null);
  const [allRatePlanCodes, setAllRatePlanCodes] = useState<string[]>([]);
  const [ratePlanCodesLoading, setRatePlanCodesLoading] = useState(false);

  // 체인 브랜드 연결 관련 state
  const [connectingHotelId, setConnectingHotelId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

  // 이미지 관리 관련 state
  const [imageManagementState, setImageManagementState] = useState<{
    [hotelId: string]: {
      loading: boolean
      saving: boolean
      error: string | null
      success: string | null
      editingImages: boolean
      imageUrls: {
        image_1: string
        image_2: string
        image_3: string
        image_4: string
        image_5: string
      }
      imageInfos: {
        image_1: ImageInfo | null
        image_2: ImageInfo | null
        image_3: ImageInfo | null
        image_4: ImageInfo | null
        image_5: ImageInfo | null
      }
      storageFolder: StorageFolderInfo | null
      storageImages: StorageImage[] | null
      savingImages: {
        [key: string]: boolean
      }
    }
  }>({});

  // 날짜 포맷팅 함수 (YYYY-MM-DD)
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '-';
    }
  };

  // 파일 크기를 사람이 읽기 쉬운 형태로 변환 (현재 사용하지 않음)
  const _formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 이미지 정보를 가져오는 함수 (현재 사용하지 않음)
  const _fetchImageInfo = async (url: string): Promise<ImageInfo> => {
    return new Promise((resolve) => {
      const img = new Image()
      
      img.onload = () => {
        // 이미지 크기 정보
        const width = img.naturalWidth
        const height = img.naturalHeight
        
        // 파일 크기를 가져오기 위해 fetch 사용
        fetch(url, { method: 'HEAD' })
          .then(response => {
            const contentLength = response.headers.get('content-length')
            const contentType = response.headers.get('content-type') || 'unknown'
            
            const size = contentLength ? parseInt(contentLength, 10) : 0
            const format = contentType.split('/')[1] || 'unknown'
            
            resolve({
              width,
              height,
              size,
              format,
              loading: false,
              error: null
            })
          })
          .catch(() => {
            resolve({
              width,
              height,
              size: 0,
              format: 'unknown',
              loading: false,
              error: '크기 정보를 가져올 수 없습니다'
            })
          })
      }
      
      img.onerror = () => {
        resolve({
          width: 0,
          height: 0,
          size: 0,
          format: 'unknown',
          loading: false,
          error: '이미지를 불러올 수 없습니다'
        })
      }
      
      img.src = url
    })
  }

  // 호텔 이미지 데이터를 가져오는 함수
  const fetchHotelImages = async (sabreId: string) => {
    const hotelId = String(sabreId)
    
    // 초기 상태 설정 (기존 상태가 없으면 새로 생성)
    setImageManagementState(prev => ({
      ...prev,
      [hotelId]: {
        loading: true,
        saving: false,
        error: null,
        success: null,
        editingImages: false,
        imageUrls: {
          image_1: '',
          image_2: '',
          image_3: '',
          image_4: '',
          image_5: ''
        },
        imageInfos: {
          image_1: null,
          image_2: null,
          image_3: null,
          image_4: null,
          image_5: null
        },
        storageFolder: null,
        storageImages: null,
        savingImages: {}
      }
    }))

    try {
      // Supabase Storage에서 이미지 목록 가져오기
      const response = await fetch(`/api/hotel-images/list?sabreId=${sabreId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        console.log(`클라이언트 - 호텔 ${sabreId} 이미지 데이터:`, {
          totalImages: data.data.totalImages,
          images: data.data.images?.length || 0,
          imageNames: data.data.images?.map((img: { name: string }) => img.name) || []
        });
        
        // Supabase Storage 이미지 데이터 설정
        setImageManagementState(prev => ({
          ...prev,
          [hotelId]: {
            loading: false,
            saving: false,
            error: null,
            success: `${data.data.totalImages}개의 이미지를 불러왔습니다.`,
            editingImages: false,
            imageUrls: {
              image_1: '',
              image_2: '',
              image_3: '',
              image_4: '',
              image_5: ''
            },
            imageInfos: {
              image_1: null,
              image_2: null,
              image_3: null,
              image_4: null,
              image_5: null
            },
            storageFolder: {
              exists: true,
              slug: data.data.hotel?.normalizedSlug || '',
              folderPath: data.data.storagePath || '',
              path: data.data.storagePath || '',
              loading: false,
              error: null
            },
            storageImages: data.data.images || [],
            savingImages: {}
          }
        }))
      } else {
        setImageManagementState(prev => ({
          ...prev,
          [hotelId]: {
            loading: false,
            saving: false,
            error: data.error || '호텔 이미지 정보를 찾을 수 없습니다.',
            success: null,
            editingImages: false,
            imageUrls: {
              image_1: '',
              image_2: '',
              image_3: '',
              image_4: '',
              image_5: ''
            },
            imageInfos: {
              image_1: null,
              image_2: null,
              image_3: null,
              image_4: null,
              image_5: null
            },
            storageFolder: null,
            storageImages: null,
            savingImages: {}
          }
        }))
      }
    } catch (err) {
      setImageManagementState(prev => ({
        ...prev,
        [hotelId]: {
          loading: false,
          saving: false,
          error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
          success: null,
          editingImages: false,
          imageUrls: {
            image_1: '',
            image_2: '',
            image_3: '',
            image_4: '',
            image_5: ''
          },
          imageInfos: {
            image_1: null,
            image_2: null,
            image_3: null,
            image_4: null,
            image_5: null
          },
          storageFolder: null,
          storageImages: null,
          savingImages: {}
        }
      }))
    }
  }

  // ============================================================================
  // 이미지 관리 관련 핸들러 함수들
  // ============================================================================

  // 이미지 URL 변경 핸들러 (현재 사용하지 않음)
  const _handleImageUrlChange = (hotelId: string, field: string, value: string) => {
    console.log('handleImageUrlChange called but not implemented', { hotelId, field, value })
  }

  // 이미지 편집 모드 토글
  const toggleImageEditMode = (hotelId: string) => {
    setImageManagementState(prev => {
      const currentState = prev[hotelId]
      if (!currentState) return prev
      
      const newEditingState = !currentState.editingImages
      
      // 편집 모드가 아닐 때 (즉, 이미지 관리 모드로 전환할 때) Storage 이미지 로드
      if (!newEditingState && !currentState.storageImages) {
        // 비동기로 Storage 이미지 로드
        setTimeout(() => {
          const hotel = results.find(h => String(h.sabre_id) === hotelId)
          if (hotel) {
            loadStorageImages(hotelId, String(hotel.sabre_id))
          }
        }, 100)
      }
      
      return {
        ...prev,
        [hotelId]: {
          ...currentState,
          editingImages: newEditingState
        }
      }
    })
  }

  // 이미지 저장 핸들러
  const saveImageUrls = async (hotelId: string, sabreId: string) => {
    const state = imageManagementState[hotelId]
    if (!state) return

    setImageManagementState(prev => {
      const currentState = prev[hotelId]
      if (!currentState) return prev
      
      return {
        ...prev,
        [hotelId]: {
          ...currentState,
          saving: true,
          error: null,
          success: null
        }
      }
    })

    try {
      const response = await fetch('/api/hotel/update-images', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: sabreId,
          image_1: state.imageUrls.image_1 || null,
          image_2: state.imageUrls.image_2 || null,
          image_3: state.imageUrls.image_3 || null,
          image_4: state.imageUrls.image_4 || null,
          image_5: state.imageUrls.image_5 || null,
        })
      })

      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              saving: false,
              success: '이미지 URL이 성공적으로 저장되었습니다.',
              editingImages: false
            }
          }
        })
      } else {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              saving: false,
              error: data.error || '이미지 URL 저장에 실패했습니다.'
            }
          }
        })
      }
    } catch (err) {
      setImageManagementState(prev => {
        const currentState = prev[hotelId]
        if (!currentState) return prev
        
        return {
          ...prev,
          [hotelId]: {
            ...currentState,
            saving: false,
            error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
          }
        }
      })
    }
  }

  // Supabase Storage 이미지 로드 핸들러
  const loadStorageImages = async (hotelId: string, sabreId: string) => {
    setImageManagementState(prev => {
      const currentState = prev[hotelId]
      if (!currentState) return prev
      
      return {
        ...prev,
        [hotelId]: {
          ...currentState,
          loading: true,
          error: null,
          success: null
        }
      }
    })

    try {
      const response = await fetch(`/api/hotel-images/list?sabreId=${sabreId}`)
      
      if (!response.ok) {
        throw new Error(`이미지 목록 조회 실패: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              loading: false,
              storageImages: data.data.images || [],
              success: `${data.data.totalImages}개의 이미지를 불러왔습니다.`
            }
          }
        })
      } else {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              loading: false,
              error: data.error || '이미지 목록을 불러올 수 없습니다.'
            }
          }
        })
      }
    } catch (err) {
      setImageManagementState(prev => {
        const currentState = prev[hotelId]
        if (!currentState) return prev
        
        return {
          ...prev,
          [hotelId]: {
            ...currentState,
            loading: false,
            error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
          }
        }
      })
    }
  }

  // Storage 폴더 상태 확인 핸들러
  // 호텔을 체인 브랜드에 연결하는 함수
  const connectHotelToChainBrand = async (sabreId: string) => {
    if (!connectChainId || !connectBrandId) {
      setConnectError('체인과 브랜드 정보가 필요합니다.')
      return
    }

    setConnectingHotelId(sabreId)
    setConnectError(null)
    setConnectSuccess(null)

    try {
      const response = await fetch('/api/hotel/connect-chain-brand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: sabreId,
          chain_id: connectChainId,
          brand_id: connectBrandId,
        }),
      })

      const data = await response.json()

          if (data.success) {
            setConnectSuccess(`호텔이 성공적으로 연결되었습니다.`)
            onConnectSuccess?.(sabreId)

            // 연결 성공 후 데이터 새로고침
            if (searchTerm.trim()) {
              // 검색어가 있는 경우 검색 실행
              await performSearch(searchTerm)
            } else {
              // 검색어가 없는 경우 초기 데이터 로드
              loadInitialHotels()
            }

            // 3초 후 성공 메시지 자동 제거
            setTimeout(() => {
              setConnectSuccess(null)
            }, 3000)
          } else {
            setConnectError(data.error || '연결 중 오류가 발생했습니다.')
          }
    } catch (error) {
      console.error('[hotel-connect] error:', error)
      setConnectError('네트워크 오류가 발생했습니다.')
    } finally {
      setConnectingHotelId(null)
    }
  }

  const checkStorageFolder = async (hotelId: string, sabreId: string) => {
    setImageManagementState(prev => {
      const currentState = prev[hotelId]
      if (!currentState) return prev
      
      return {
        ...prev,
        [hotelId]: {
          ...currentState,
          storageFolder: {
            exists: false,
            slug: '',
            folderPath: '',
            path: '',
            loading: true,
            error: null
          }
        }
      }
    })

    try {
      const response = await fetch(`/api/hotel/storage?sabre_id=${sabreId}`)
      
      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              storageFolder: {
                exists: data.data.exists || false,
                slug: data.data.slug || '',
                folderPath: data.data.folderPath || '',
                path: data.data.path || '',
                fileCount: data.data.fileCount,
                loading: false,
                error: null
              }
            }
          }
        })
      } else {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              storageFolder: {
                exists: false,
                slug: '',
                folderPath: '',
                path: '',
                loading: false,
                error: data.error || 'Storage 폴더 상태 확인에 실패했습니다.'
              }
            }
          }
        })
      }
    } catch (err) {
      setImageManagementState(prev => {
        const currentState = prev[hotelId]
        if (!currentState) return prev
        
        return {
          ...prev,
          [hotelId]: {
            ...currentState,
            storageFolder: {
              exists: false,
              slug: '',
              folderPath: '',
              path: '',
              loading: false,
              error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
            }
          }
        }
      })
    }
  }

  // Storage 폴더 생성 핸들러
  const createStorageFolder = async (hotelId: string, sabreId: string) => {
    setImageManagementState(prev => {
      const currentState = prev[hotelId]
      if (!currentState) return prev
      
      return {
        ...prev,
        [hotelId]: {
          ...currentState,
          storageFolder: {
            ...currentState.storageFolder!,
            loading: true,
            error: null
          }
        }
      }
    })

    try {
      const response = await fetch('/api/hotel/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabreId: sabreId
        })
      })
      
      if (!response.ok) {
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              storageFolder: {
                exists: true,
                slug: data.data.slug,
                folderPath: data.data.folderPath,
                path: data.data.folderPath,
                loading: false,
                error: null
              },
              success: data.data.message
            }
          }
        })
      } else {
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          if (!currentState) return prev
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              storageFolder: {
                ...currentState.storageFolder!,
                loading: false,
                error: data.error || 'Storage 폴더 생성에 실패했습니다.'
              }
            }
          }
        })
      }
    } catch (err) {
      setImageManagementState(prev => {
        const currentState = prev[hotelId]
        if (!currentState) return prev
        
        return {
          ...prev,
          [hotelId]: {
            ...currentState,
            storageFolder: {
              ...currentState.storageFolder!,
              loading: false,
              error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
            }
          }
        }
      })
    }
  }

  // 이미지를 Storage에 저장하는 핸들러 - 현재 사용하지 않음
  const _saveImageToStorage = async (hotelId: string, sabreId: string, imageUrl: string, imageIndex: number) => {
    // 구현 생략 - 현재 사용하지 않음
    console.log('saveImageToStorage called but not implemented', { hotelId, sabreId, imageUrl, imageIndex })
  }

  // rate_plan_code를 배열로 변환하는 유틸리티 함수
  const parseRatePlanCode = (ratePlanCode: string[] | string | null): string[] => {
    if (Array.isArray(ratePlanCode)) {
      return ratePlanCode;
    }
    if (typeof ratePlanCode === 'string' && ratePlanCode.trim()) {
      return ratePlanCode.split(',').map(code => code.trim()).filter(code => code.length > 0);
    }
    return [];
  };

  // 초기 호텔 목록 로드
  const loadInitialHotels = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searching_string: '' }),
      });

      if (!response.ok) {
        const errorText = await response.text()
        setError(`서버 오류 (${response.status}): ${errorText}`)
        return
      }

      const data: HotelSearchApiResponse = await response.json().catch(() => {
        setError('서버 응답을 파싱할 수 없습니다.')
        return null
      })

      if (!data) return

      if (!data.success) {
        setError(data.error || '초기 호텔 목록을 불러올 수 없습니다.');
        return;
      }

      setResults(data.data || []);
      setCount(data.meta?.count || 0);
    } catch (err) {
      console.error('Initial hotels load error:', err);
      setError('초기 호텔 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 검색 핸들러 + 외부 호출 함수로 분리 (자동완성 Enter 선택 시 재사용)
  const performSearch = async (term: string) => {
    if (!term.trim()) {
      setError('호텔명을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);
    setOpenSuggest(false);
    setSuppressSuggest(true);

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searching_string: term }),
      });

      if (!response.ok) {
        const errorText = await response.text()
        setError(`서버 오류 (${response.status}): ${errorText}`)
        return
      }

      const data: HotelSearchApiResponse = await response.json().catch(() => {
        setError('서버 응답을 파싱할 수 없습니다.')
        return null
      })

      if (!data) return

      if (!data.success) {
        setError(data.error || '검색에 실패했습니다.');
        return;
      }

      setResults(data.data || []);
      setCount(data.meta?.count || 0);
    } catch (err) {
      console.error('Search error:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setOpenSuggest(false);
    setSuggestions([]);
    await performSearch(searchTerm);
  };

  // 검색 결과 초기화
  const handleReset = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
    setCount(0);
    setHasSearched(false);
    setExpandedRowId(null);
    setExpandedRowState(null);
    setSuggestions([]);
    setOpenSuggest(false);
  };

  // Rate Plan Codes 가져오기
  useEffect(() => {
    const fetchRatePlanCodes = async () => {
      setRatePlanCodesLoading(true);
      try {
        const response = await fetch('/api/rate-plan-codes', {
          cache: 'no-store'
        });

        if (!response.ok) {
          console.error('Rate plan codes fetch failed:', response.status, await response.text())
          return
        }

        const data: RatePlanCodesApiResponse = await response.json().catch(() => {
          console.error('Failed to parse rate plan codes response')
          return null
        })

        if (!data) return
        
        if (data.success && data.data) {
          setAllRatePlanCodes(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch rate plan codes:', error);
      } finally {
        setRatePlanCodesLoading(false);
      }
    };

    fetchRatePlanCodes();
  }, []);

  // 초기 호텔 리스트 로딩
  useEffect(() => {
    if (showInitialHotels) {
      loadInitialHotels();
    }
  }, [showInitialHotels]);

  // 호텔명 입력 제안 - 호텔 업데이트(영문명)과 동일 UX
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      setOpenSuggest(false);
      abortRef.current?.abort();
      return;
    }
    if (suppressSuggest) {
      // 검색 직후에는 자동완성 표시를 잠시 억제
      setOpenSuggest(false);
      setLoadingSuggest(false);
      return;
    }
    setLoadingSuggest(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const url = `/api/hotel/suggest?field=all&q=${encodeURIComponent(searchTerm)}&limit=8`;
        const res = await fetch(url, { signal: controller.signal });
        
        if (!res.ok) {
          console.error('Suggestions fetch failed:', res.status)
          return
        }

        const json = await res.json().catch(() => {
          console.error('Failed to parse suggestions response')
          return null
        })

        if (json && json.success) {
          setSuggestions(json.data || []);
          setOpenSuggest(true);
        } else {
          setSuggestions([]);
          setOpenSuggest(false);
        }
      } catch {
        // ignore
      } finally {
        setLoadingSuggest(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [searchTerm, suppressSuggest]);

  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);
  
  const onSelectSuggestion = (value: string) => {
    setSearchTerm(value);
    setOpenSuggest(false);
    setHighlightIndex(-1);
  };

  // 하이라이트된 항목이 보이도록 스크롤 조정
  const scrollToHighlightedItem = (index: number) => {
    if (!suggestionsContainerRef.current || index < 0) return;
    
    const container = suggestionsContainerRef.current;
    const items = container.querySelectorAll('li');
    const highlightedItem = items[index];
    
    if (highlightedItem) {
      highlightedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  };

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!openSuggest && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpenSuggest(true);
    }
    if (e.key === 'Tab') {
      if (results.length > 0) {
        e.preventDefault();
        firstResultRef.current?.focus();
        return;
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev + 1;
        const newIndex = next >= suggestions.length ? 0 : next;
        // 다음 tick에서 스크롤 조정
        setTimeout(() => scrollToHighlightedItem(newIndex), 0);
        return newIndex;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        if (prev === -1) {
          const newIndex = Math.max(0, suggestions.length - 1);
          setTimeout(() => scrollToHighlightedItem(newIndex), 0);
          return newIndex;
        }
        const next = prev - 1;
        const newIndex = next < 0 ? Math.max(0, suggestions.length - 1) : next;
        setTimeout(() => scrollToHighlightedItem(newIndex), 0);
        return newIndex;
      });
    } else if (e.key === 'Enter') {
      if (openSuggest && suggestions.length > 0 && highlightIndex !== -1) {
        e.preventDefault();
        const chosen = suggestions[highlightIndex];
        setSearchTerm(chosen);
        setOpenSuggest(false);
        setHighlightIndex(-1);
        await performSearch(chosen);
      }
    } else if (e.key === 'Escape') {
      setOpenSuggest(false);
      setHighlightIndex(-1);
    }
  };

  // 행 클릭 핸들러 (확장 패널 토글 또는 호텔 편집 페이지 이동)
  const handleRowClick = (hotel: HotelSearchResult) => {
    // 이미지 관리 모드가 활성화된 경우
    if (enableImageManagement) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        const hotelId = String(hotel.sabre_id);
        
        // 확장 패널 토글
        if (expandedRowId === hotelId) {
          setExpandedRowId(null);
          setExpandedRowState(null);
        } else {
          setExpandedRowId(hotelId);
          setExpandedRowState({
            type: 'image-management',
            hotelId: hotelId,
            hotel: hotel,
            currencyCode: 'KRW',
            adults: 2,
            startDate: getDateAfterDays(14),
            endDate: getDateAfterDays(15),
            selectedRatePlanCodes: [],
            originalRatePlanCodes: [],
            isLoading: false,
            isSaving: false,
            testResult: null,
            error: null,
            saveSuccess: false
          });
          
          // 이미지 데이터 로드
          fetchHotelImages(hotel.sabre_id);
        }
        return;
      }
      return;
    }
    
    // onHotelSelect 콜백이 있는 경우 호출
    if (onHotelSelect) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        // sabre_id를 문자열로 변환
        const sabreIdString = String(hotel.sabre_id);
        const hotelInfo = {
          sabre_id: sabreIdString,
          property_name_ko: hotel.property_name_ko,
          property_name_en: hotel.property_name_en
        };
        onHotelSelect(sabreIdString, hotelInfo);
        return;
      } else {
        // sabre_id가 없는 호텔의 경우 null을 전달하여 에러 메시지 표시
        onHotelSelect(null);
        return;
      }
    }

    // 호텔 편집 모드가 활성화된 경우 확장 패널을 열지 않음
    if (enableHotelEdit) {
      // Link 컴포넌트가 이미 처리하므로 별도 처리 불필요
      return;
    }

    const hotelId = String(hotel.sabre_id);
    
    if (expandedRowId === hotelId) {
      // 이미 열린 패널이면 닫기
      setExpandedRowId(null);
      setExpandedRowState(null);
    } else {
      // 새 패널 열기
      setExpandedRowId(hotelId);
      setExpandedRowState({
        type: 'hotel-details',
        hotelId,
        hotel: hotel,
        currencyCode: 'KRW',
        adults: 2,
        startDate: getDateAfterDays(14),
        endDate: getDateAfterDays(15),
        selectedRatePlanCodes: parseRatePlanCode(hotel.rate_plan_code),
        originalRatePlanCodes: parseRatePlanCode(hotel.rate_plan_code),
        isLoading: false,
        isSaving: false,
        testResult: null,
        error: null,
        saveSuccess: false
      });
    }
  };

  // 확장 패널 입력 업데이트 핸들러
  const updateExpandedRowState = (updates: Partial<ExpandedRowState>) => {
    if (expandedRowState) {
      setExpandedRowState(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  // Rate Plan Code 체크박스 토글 핸들러
  const toggleRatePlanCode = (code: string) => {
    if (!expandedRowState) return;
    
    const currentCodes = expandedRowState.selectedRatePlanCodes;
    // currentCodes가 배열이 아닌 경우 빈 배열로 초기화
    const safeCodes = Array.isArray(currentCodes) ? currentCodes : [];
    
    const updatedCodes = safeCodes.includes(code)
      ? safeCodes.filter(c => c !== code)
      : [...safeCodes, code];
    
    updateExpandedRowState({ selectedRatePlanCodes: updatedCodes });
  };

  // 외부 API 호출 핸들러
  const handleTestApi = async () => {
    if (!expandedRowState) return;
    
    const currentHotel = results.find(h => 
      `${h.sabre_id}-${h.paragon_id}` === expandedRowState.hotelId
    );
    
    if (!currentHotel?.sabre_id) {
      updateExpandedRowState({ 
        error: 'Sabre ID가 없어서 테스트할 수 없습니다.' 
      });
      return;
    }

    updateExpandedRowState({ 
      isLoading: true, 
      error: null, 
      testResult: null 
    });

    try {
      const requestBody: HotelDetailsRequest = {
        HotelCode: `${currentHotel.sabre_id}`,
        CurrencyCode: expandedRowState.currencyCode,
        StartDate: expandedRowState.startDate,
        EndDate: expandedRowState.endDate,
        Adults: expandedRowState.adults
      };

      // rate plan codes가 있는 경우에만 RatePlanCode와 ExactMatchOnly 필드 추가
      if (Array.isArray(expandedRowState.selectedRatePlanCodes) && expandedRowState.selectedRatePlanCodes.length > 0) {
        requestBody.RatePlanCode = expandedRowState.selectedRatePlanCodes;
        requestBody.ExactMatchOnly = true;
      }

      const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      // 응답을 먼저 텍스트로 받기
      const responseText = await response.text();
      
      try {
        // JSON 파싱 시도
        const result = JSON.parse(responseText);
        updateExpandedRowState({ 
          testResult: result,
          isLoading: false 
        });
      } catch {
        // JSON 파싱 실패시 raw 텍스트를 결과로 표시
        updateExpandedRowState({ 
          testResult: responseText,
          isLoading: false 
        });
      }

    } catch (error) {
      console.error('API test failed:', error);
      updateExpandedRowState({ 
        error: `API 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false 
      });
    }
  };

  // Rate Plan Codes 저장 핸들러
  const handleSaveRatePlanCodes = async () => {
    if (!expandedRowState) return;
    
    const currentHotel = results.find(h => 
      `${h.sabre_id}-${h.paragon_id}` === expandedRowState.hotelId
    );
    
    if (!currentHotel) {
      updateExpandedRowState({ 
        error: '호텔 정보를 찾을 수 없습니다.' 
      });
      return;
    }

    updateExpandedRowState({ 
      isSaving: true, 
      error: null,
      saveSuccess: false
    });

    try {
      const response = await fetch('/api/hotel/update-rate-plan-codes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sabre_id: currentHotel.sabre_id,
          paragon_id: currentHotel.paragon_id,
          rate_plan_code: expandedRowState.selectedRatePlanCodes
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        updateExpandedRowState({ 
          error: result.error || 'Rate Plan Codes 저장에 실패했습니다.',
          isSaving: false 
        });
        return;
      }

      // 성공시 results 배열의 해당 호텔 정보도 업데이트
      setResults(prevResults => 
        prevResults.map(hotel => 
          `${hotel.sabre_id}-${hotel.paragon_id}` === expandedRowState.hotelId
            ? { ...hotel, rate_plan_code: expandedRowState.selectedRatePlanCodes }
            : hotel
        )
      );
      
      updateExpandedRowState({ 
        isSaving: false,
        error: null,
        saveSuccess: true,
        originalRatePlanCodes: expandedRowState.selectedRatePlanCodes
      });

      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        updateExpandedRowState({ saveSuccess: false });
      }, 3000);
      
    } catch (error) {
      console.error('Save rate plan codes failed:', error);
      updateExpandedRowState({ 
        error: 'Rate Plan Codes 저장 중 오류가 발생했습니다.',
        isSaving: false 
      });
    }
  };

  // 지정 경로 순회해서 RatePlan 행 추출 (AmountAfterTax 정렬은 호출부에서)
  function extractRatePlanTableRows(data: unknown): Array<{
    rateKey: string
    roomType: string
    roomName: string
    description: string
    currency: string
    amountAfterTax: number | ''
    amountBeforeTax: number | ''
    taxes: number | ''
    fees: number | ''
    refundable: string
    cancelOffset: string
  }> {
    const rows: Array<{
      rateKey: string
      roomType: string
      roomName: string
      description: string
      currency: string
      amountAfterTax: number | ''
      amountBeforeTax: number | ''
      taxes: number | ''
      fees: number | ''
      refundable: string
      cancelOffset: string
    }> = []

    const deepGet = (obj: unknown, keys: string[]): unknown => {
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
    const root = deepGet(data, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo', 'Rooms', 'Room'])
    if (!root) return rows
    const roomArray: unknown[] = Array.isArray(root) ? root : [root]

    const toNumber = (v: unknown): number | '' => {
      if (v === null || v === undefined || v === '') return ''
      const n = Number(v)
      return Number.isFinite(n) ? n : ''
    }

    for (const room of roomArray) {
      const r = room as Record<string, unknown>
      const rt = deepGet(r, ['RoomType'])
      const rdName = deepGet(r, ['RoomDescription', 'Name'])
      const descSrc = deepGet(r, ['RoomDescription', 'Text'])
      const roomType: string = typeof rt === 'string' ? rt : (typeof rdName === 'string' ? rdName : '')
      const roomName: string = typeof rdName === 'string' ? rdName : ''
      const description: string = Array.isArray(descSrc) ? (typeof (descSrc as unknown[])[0] === 'string' ? (descSrc as unknown[])[0] as string : '') : (typeof descSrc === 'string' ? descSrc as string : '')

      const plansNode = deepGet(r, ['RatePlans', 'RatePlan'])
      if (!plansNode) continue
      const plans: unknown[] = Array.isArray(plansNode) ? plansNode : [plansNode]

      for (const plan of plans) {
        const p = plan as Record<string, unknown>
        const currency: string = (() => {
          const v = deepGet(p, ['ConvertedRateInfo', 'CurrencyCode'])
          return typeof v === 'string' ? v : ''
        })()
        const amountAfterTax = toNumber(deepGet(p, ['ConvertedRateInfo', 'AmountAfterTax']))
        const amountBeforeTax = toNumber(deepGet(p, ['ConvertedRateInfo', 'AmountBeforeTax']))
        const taxes = toNumber(deepGet(p, ['ConvertedRateInfo', 'Taxes', 'Amount']))
        const fees = toNumber(deepGet(p, ['ConvertedRateInfo', 'Fees', 'Amount']))
        const cpNode = deepGet(p, ['ConvertedRateInfo', 'CancelPenalties', 'CancelPenalty'])
        const cp0 = Array.isArray(cpNode) ? (cpNode[0] as Record<string, unknown> | undefined) : (cpNode as Record<string, unknown> | undefined)
        const refundableVal = cp0 ? deepGet(cp0, ['Refundable']) : undefined
        const refundable = typeof refundableVal === 'boolean' ? String(refundableVal) : (typeof refundableVal === 'string' ? refundableVal : '')
        const offsetUnitMultiplier = cp0 ? deepGet(cp0, ['OffsetUnitMultiplier']) : undefined
        const offsetTimeUnit = cp0 ? deepGet(cp0, ['OffsetTimeUnit']) : undefined
        const offsetDropTime = cp0 ? deepGet(cp0, ['OffsetDropTime']) : undefined
        const cancelOffset = [offsetUnitMultiplier, offsetTimeUnit, offsetDropTime]
          .filter((x: unknown) => x !== undefined && x !== null && x !== '')
          .join(' ')
        const rateKeyVal = deepGet(p, ['RateKey'])
        const rateKey: string = typeof rateKeyVal === 'string' ? rateKeyVal : ''

        rows.push({
          rateKey,
          roomType,
          roomName,
          description,
          currency,
          amountAfterTax,
          amountBeforeTax,
          taxes,
          fees,
          refundable,
          cancelOffset,
        })
      }
    }
    return rows
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {!hideHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-blue-600 p-2">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          </div>
        </div>
      )}

      {/* 검색 폼 - 고정 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-shrink-0 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label 
              htmlFor="hotel-search" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              호텔명 검색
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="hotel-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setSuppressSuggest(false); }}
                  placeholder="호텔명을 입력하세요 (한글/영문/Sabre ID)"
                  autoComplete="off"
                  onKeyDown={onKeyDown}
                  disabled={loading}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    "disabled:bg-gray-50 disabled:cursor-not-allowed",
                    "text-sm"
                  )}
                  aria-describedby="hotel-search-description"
                />
                {openSuggest && suggestions.length > 0 && (
                  <div 
                    ref={suggestionsContainerRef}
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow"
                  >
                    <ul className="divide-y">
                      {suggestions.map((s: string, idx: number) => (
                        <li key={s}>
                          <button
                            type="button"
                            className={cn(
                              'block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-50',
                              idx === highlightIndex ? 'bg-gray-100' : ''
                            )}
                            onClick={() => onSelectSuggestion(s)}
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                      {loadingSuggest && suggestions.length === 0 && (
                        <li className="px-3 py-2 text-xs text-gray-500">불러오는 중...</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-medium",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600",
                  "transition-colors duration-200"
                )}
                aria-label="호텔 검색"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className={cn(
                  "inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
                aria-label="검색 초기화"
              >
                초기화
              </button>
            </div>
            <p id="hotel-search-description" className="text-xs text-gray-500 mt-1">
              한글명, 영문명, Sabre ID 로 검색할 수 있습니다
            </p>
          </div>
        </form>
      </div>

      {/* 결과 영역 - 스크롤 가능 */}
      <div className="flex-1 overflow-auto space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div 
            className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium">오류가 발생했습니다</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* 체인 브랜드 연결 상태 메시지 */}
        {enableChainBrandConnect && (
          <>
            {connectError && (
              <div 
                className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">연결 실패</h3>
                  <p className="text-sm mt-1">{connectError}</p>
                </div>
              </div>
            )}
            {connectSuccess && (
              <div 
                className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3"
                role="alert"
                aria-live="polite"
              >
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">연결 성공</h3>
                  <p className="text-sm mt-1">{connectSuccess}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* 검색 결과 카운트 */}
        {count > 0 && (
          <div 
            className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium">검색 완료</h3>
              <p className="text-sm mt-1">총 <strong>{count.toLocaleString()}</strong>개의 호텔을 찾았습니다.</p>
            </div>
          </div>
        )}

        {/* 검색 결과 테이블 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 테이블 헤더 정보 */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">검색 결과</h3>
            <p className="text-sm text-gray-600 mt-1">
              {count.toLocaleString()}개의 호텔이 검색되었습니다
            </p>
          </div>

          {/* 반응형 테이블 */}
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Sabre ID
                  </th>
                  {showInitialHotels ? (
                    <>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명(한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명(영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        체인(영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        브랜드(영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        업데이트 날짜
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔 연결
                      </th>
                    </>
                  ) : (
                    <>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Paragon ID
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명 (한글)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        호텔명 (영문)
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Rate Plan Code
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((hotel, index) => {
                  const hotelId = String(hotel.sabre_id);
                  const isExpanded = expandedRowId === hotelId;
                  
                  return (
                    <React.Fragment key={`hotel-${hotel.sabre_id}-${hotel.paragon_id}-${index}`}>
                      <tr 
                        onClick={() => handleRowClick(hotel)}
                        className={cn(
                          "transition-colors duration-150",
                          enableHotelEdit ? "hover:bg-green-50" : "hover:bg-blue-50 cursor-pointer",
                          isExpanded ? "bg-blue-100" : index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        )}
                      >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {hotel.sabre_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {hotel.sabre_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    {showInitialHotels ? (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.property_name_ko || '한글명 없음'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.property_name_en || '영문명 없음'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.hotel_brands?.hotel_chains?.chain_name_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hotel.hotel_brands?.brand_name_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(hotel.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {enableChainBrandConnect ? (
                            <Button
                              size="sm"
                              variant="default"
                              disabled={connectingHotelId === hotel.sabre_id || !connectChainId || !connectBrandId}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (hotel.sabre_id) {
                                  connectHotelToChainBrand(hotel.sabre_id)
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {connectingHotelId === hotel.sabre_id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  연결 중...
                                </>
                              ) : (
                                '체인브랜드연결'
                              )}
                            </Button>
                          ) : (
                            <Link
                              href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              연결
                            </Link>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {hotel.paragon_id ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {hotel.paragon_id}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {enableHotelEdit ? (
                            <div className="flex gap-2">
                              <Link
                                href={`/admin/hotel-details/${hotel.sabre_id ?? 'null'}`}
                                className={cn(
                                  'font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded text-blue-600'
                                )}
                              >
                                {hotel.property_name_ko || '한글명 없음'}
                              </Link>
                              <Link
                                href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                편집
                              </Link>
                            </div>
                          ) : (
                            <button
                              type="button"
                              ref={index === 0 ? firstResultRef : undefined}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(hotel);
                              }}
                              className={cn(
                                'font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded',
                                !hotel.property_name_ko ? 'text-gray-400 italic font-normal focus:ring-0' : ''
                              )}
                              aria-label="호텔명 선택"
                            >
                              {hotel.property_name_ko || '한글명 없음'}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {enableHotelEdit ? (
                            <Link
                              href={`/admin/hotel-details/${hotel.sabre_id ?? 'null'}`}
                              className={cn(
                                'font-medium hover:underline text-blue-600',
                                !hotel.property_name_en ? 'text-gray-400 italic' : ''
                              )}
                            >
                              {hotel.property_name_en || '영문명 없음'}
                            </Link>
                          ) : (
                            hotel.property_name_en ? (
                              <div className="font-medium">{hotel.property_name_en}</div>
                            ) : (
                              <span className="text-gray-400 italic">영문명 없음</span>
                            )
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            {(() => {
                              // rate_plan_code를 배열로 변환
                              const ratePlanCodes = parseRatePlanCode(hotel.rate_plan_code);
                              
                              if (ratePlanCodes.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {ratePlanCodes.map((code, idx) => 
                                      enableHotelEdit ? (
                                        <Link 
                                          href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 hover:underline"
                                        >
                                          {code}
                                        </Link>
                                      ) : (
                                        <span 
                                          key={idx}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                                        >
                                          {code}
                                        </span>
                                      )
                                    )}
                                  </div>
                                );
                              } else {
                                return enableHotelEdit ? (
                                  <Link
                                    href={`/admin/hotel-update/${hotel.sabre_id ?? 'null'}`}
                                    className="text-gray-400 italic hover:underline"
                                  >
                                    N/A
                                  </Link>
                                ) : (
                                  <span className="text-gray-400 italic">N/A</span>
                                );
                              }
                            })()}
                            <div className="ml-auto">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </td>
                      </>
                    )}
                      </tr>
                      
                      {/* 확장 패널 */}
                      {isExpanded && expandedRowState && (
                        <tr>
                          <td colSpan={5} className="px-0 py-0 w-full max-w-full overflow-x-hidden">
                            <div className="bg-gray-50 border-t border-gray-200 w-full max-w-full">
                              <div className="px-6 py-6 w-full max-w-full">
                                {/* 이미지 관리 모드 */}
                                {expandedRowState.type === 'image-management' && expandedRowState.hotel && (
                                  <ImageManagementPanel 
                                    hotel={expandedRowState.hotel}
                                    hotelId={hotelId}
                                    state={imageManagementState[hotelId]}
                                    onToggleEditMode={toggleImageEditMode}
                                    onSaveImageUrls={saveImageUrls}
                                    onCreateStorageFolder={createStorageFolder}
                                    onCheckStorageFolder={checkStorageFolder}
                                    onLoadStorageImages={loadStorageImages}
                                  />
                                )}
                                
                                {/* 기존 패널 헤더 (이미지 관리 모드가 아닐 때만) */}
                                {expandedRowState.type !== 'image-management' && (
                                  <>
                                    {/* 패널 헤더 */}
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-lg font-medium text-gray-900">
                                    호텔 상세 정보 테스트
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedRowId(null);
                                      setExpandedRowState(null);
                                    }}
                                    className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                                    aria-label="패널 닫기"
                                  >
                                    <X className="h-5 w-5 text-gray-500" />
                                  </button>
                                </div>

                                {/* 1행: Start Date, End Date, Adults, Currency Code */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                      Start Date
                                    </label>
                                    <DateInput
                                      name="startDate"
                                      value={expandedRowState.startDate}
                                      onChange={(e) => {
                                        const v = e.currentTarget.value
                                        if (!v) {
                                          updateExpandedRowState({ startDate: v })
                                          return
                                        }
                                        const parts = v.split('-').map((n) => Number(n))
                                        if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
                                          const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
                                          dt.setUTCDate(dt.getUTCDate() + 1)
                                          const next = dt.toISOString().slice(0, 10)
                                          updateExpandedRowState({ startDate: v, endDate: next })
                                        } else {
                                          updateExpandedRowState({ startDate: v })
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                      End Date
                                    </label>
                                    <DateInput
                                      name="endDate"
                                      value={expandedRowState.endDate}
                                      onChange={(e) => updateExpandedRowState({ endDate: e.currentTarget.value })}
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
                                      value={expandedRowState.adults}
                                      onChange={(e) => updateExpandedRowState({ adults: parseInt(e.target.value) || 1 })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                                      Currency Code
                                    </label>
                                    <input
                                      id="currency"
                                      type="text"
                                      value={expandedRowState.currencyCode}
                                      onChange={(e) => updateExpandedRowState({ currencyCode: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="KRW"
                                    />
                                  </div>
                                </div>

                                {/* 2행: Rate Plan Codes */}
                                <div className="mt-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Rate Plan Codes
                                    </label>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                          DB
                                        </span>
                                        <span>현재 설정값</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="w-3 h-3 bg-gray-300 rounded"></span>
                                        <span>기타</span>
                                      </div>
                                    </div>
                                  </div>
                                  {ratePlanCodesLoading ? (
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Loading rate plan codes...
                                    </div>
                                  ) : allRatePlanCodes.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto border border-gray-200 rounded p-3">
                                      {allRatePlanCodes.map((code) => {
                                        const isInOriginalDb = Array.isArray(expandedRowState.originalRatePlanCodes) && expandedRowState.originalRatePlanCodes.includes(code);
                                        const isCurrentlySelected = Array.isArray(expandedRowState.selectedRatePlanCodes) && expandedRowState.selectedRatePlanCodes.includes(code);
                                        
                                        return (
                                          <label key={code} className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              checked={isCurrentlySelected}
                                              onChange={() => toggleRatePlanCode(code)}
                                              className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className={cn(
                                              "text-sm flex items-center gap-1",
                                              isInOriginalDb ? "text-gray-900 font-medium" : "text-gray-500"
                                            )}>
                                              {code}
                                              {isInOriginalDb && (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                  DB
                                                </span>
                                              )}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      Rate plan codes를 불러올 수 없습니다.
                                    </div>
                                  )}
                                </div>

                                {/* 버튼 영역 */}
                                <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                                  <button
                                    onClick={handleTestApi}
                                    disabled={expandedRowState.isLoading}
                                    className={cn(
                                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                                      "bg-green-600 text-white hover:bg-green-700",
                                      "focus:outline-none focus:ring-2 focus:ring-green-500",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    {expandedRowState.isLoading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Testing...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 mr-2" />
                                        Test API
                                      </>
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={handleSaveRatePlanCodes}
                                    disabled={expandedRowState.isLoading || expandedRowState.isSaving}
                                    className={cn(
                                      "inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium",
                                      expandedRowState.saveSuccess 
                                        ? "bg-green-600 text-white" 
                                        : "bg-blue-600 text-white hover:bg-blue-700",
                                      "focus:outline-none focus:ring-2 focus:ring-blue-500",
                                      "disabled:opacity-50 disabled:cursor-not-allowed",
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    {expandedRowState.isSaving ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                      </>
                                    ) : expandedRowState.saveSuccess ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Saved Successfully!
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Save Rate Plan Codes
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* 에러 표시 */}
                                {expandedRowState.error && (
                                  <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <div className="flex items-start">
                                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                      <div className="ml-2">
                                        <h5 className="text-sm font-medium text-red-800">오류</h5>
                                        <p className="text-sm text-red-700 mt-1">{expandedRowState.error}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* JSON 결과 화면 (맨 아래 고정 영역) */}
                                {!!expandedRowState.testResult && (
                                  <>
                                    <div className="mt-6 h-96 overflow-auto max-w-full">
                                      <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto max-w-full">
                                        {formatJson(expandedRowState.testResult)}
                                      </pre>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                      <BaseButton
                                        aria-label="JSON 복사"
                                        size="xs"
                                        className={cn(
                                          copied ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                                        )}
                                        onClick={() => {
                                          try {
                                            const text = formatJson(expandedRowState.testResult)
                                            navigator.clipboard?.writeText(text)
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 1500)
                                          } catch {}
                                        }}
                                      >
                                        {copied ? '복사 완료' : 'JSON 복사'}
                                      </BaseButton>
                                    </div>

                                    {/* 지정 경로 테이블 (AmountAfterTax 오름차순, 마크다운 스타일) */}
                                    {(() => {
                                      const rows = extractRatePlanTableRows(expandedRowState.testResult)
                                      if (rows.length === 0) {
                                        return (
                                          <div className="mt-6 rounded-lg border bg-white">
                                            <div className="px-4 py-2 border-b text-sm font-medium">RatePlan Table (sorted by AmountAfterTax)</div>
                                            <div className="p-4 text-sm text-gray-600">선택한 일자와 조건에 요금이 없습니다.</div>
                                          </div>
                                        )
                                      }
                                      const sorted = [...rows].sort((a, b) => {
                                        const ax = a.amountAfterTax === '' ? Number.POSITIVE_INFINITY : (a.amountAfterTax as number)
                                        const bx = b.amountAfterTax === '' ? Number.POSITIVE_INFINITY : (b.amountAfterTax as number)
                                        return ax - bx
                                      })
                                      return (
                                        <div className="mt-6 rounded-lg border bg-white">
                                          <div className="px-4 py-2 border-b text-sm font-medium">RatePlan Table (sorted by AmountAfterTax)</div>
                                          <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                              <thead className="bg-gray-50">
                                                <tr>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RateKey</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RoomType</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">RoomName</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Description</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Currency</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">AmountAfterTax</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">AmountBeforeTax</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Taxes</th>
                                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Fees</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Refundable</th>
                                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">CancelOffset</th>
                                                </tr>
                                              </thead>
                                              <tbody className="bg-white divide-y divide-gray-100">
                                                {sorted.map((r, i) => (
                                                  <tr key={`table-${i}`} className="hover:bg-blue-100 transition-colors duration-75">
                                                    <td className="px-4 py-2 align-top text-xs font-mono text-gray-800">{r.rateKey ? (r.rateKey.length > 10 ? `${r.rateKey.slice(0,10)}...` : r.rateKey) : ''}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.roomType}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.roomName}</td>
                                                    <td className="px-4 py-2 align-top text-xs text-gray-700 break-words">{r.description}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.currency}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.amountAfterTax === '' ? '' : (r.amountAfterTax as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.amountBeforeTax === '' ? '' : (r.amountBeforeTax as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.taxes === '' ? '' : (r.taxes as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-right text-sm text-gray-900">{r.fees === '' ? '' : (r.fees as number).toLocaleString()}</td>
                                                    <td className="px-4 py-2 align-top text-sm text-gray-900">{r.refundable}</td>
                                                    <td className="px-4 py-2 align-top text-xs text-gray-900">{r.cancelOffset}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </>
                                )}

                                {/* 초기 상태 */}
                                {!expandedRowState.testResult && !expandedRowState.error && !expandedRowState.isLoading && (
                                  <div className="mt-6 text-center py-8 text-gray-500">
                                    <Play className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                    <p className="text-sm">Test 버튼을 클릭하여 API를 테스트하세요</p>
                                  </div>
                                )}
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {/* 빈 결과 메시지 */}
        {!loading && hasSearched && count === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600 mb-4">
              &lsquo;<strong>{searchTerm}</strong>&rsquo; 검색어로 일치하는 호텔을 찾을 수 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              다른 키워드로 검색해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
