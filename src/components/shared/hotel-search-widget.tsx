'use client'

import React, { useState, FormEvent, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { 
  HotelSearchResult, 
  HotelSearchApiResponse, 
  ExpandedRowState, 
  HotelDetailsRequest 
} from '@/types/hotel'
import { getDateAfterDays, parseRatePlanCode, cn } from '@/lib/utils'
import { HotelSearchFilters } from './hotel-search/search-filters'
import { HotelListTable } from './hotel-search/hotel-list-table'
import { ImageInfo, StorageFolderInfo, StorageImage } from './hotel-search/image-management-panel'

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

  /** URL 생성 모드 활성화 */
  enableUrlGeneration?: boolean
  /** SEO 관리 모드 활성화 */
  enableSeoManagement?: boolean
  /** SEO 데이터 업데이트 핸들러 */
  onSeoUpdate?: (sabreId: string, seoData: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    canonicalUrl: string;
  }) => Promise<void>;
  /** SEO 데이터 생성 핸들러 */
  onSeoGenerate?: (sabreId: string) => Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }>;
  /** SEO 데이터 조회 핸들러 */
  onSeoFetch?: (sabreId: string) => Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }>;
  /** 일괄 SEO 생성 핸들러 */
  onBulkSeoGenerate?: (sabreIds: string[]) => Promise<void>;
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
  onConnectSuccess,
  enableUrlGeneration = false,
  enableSeoManagement = false,
  onSeoUpdate,
  onSeoGenerate,
  onSeoFetch,
  onBulkSeoGenerate,
}: HotelSearchWidgetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State 관리
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number>(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);
  // 입력 제안 상태
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suppressSuggest, setSuppressSuggest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const firstResultRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // URL 파라미터가 있을 때 자동 검색
  useEffect(() => {
    const q = searchParams.get('q')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))

    // 검색어가 있는 경우: q + page 기반으로 조회
    if (q) {
      if (q !== searchTerm || page !== currentPage) {
        setSearchTerm(q)
        setCurrentPage(page)
        performSearch(q, page)
      }
      return
    }

    // 검색어가 없는 경우: page만으로도 페이지네이션이 동작해야 함
    // (기존 로직은 q가 없으면 항상 1페이지로 리셋되어 2/3페이지가 안 보였음)
    if (searchTerm.trim() === '' && (page !== currentPage || !hasSearched)) {
      setCurrentPage(page)
      performSearch('', page)
    }
  }, [searchParams])

  // 초기 호텔 목록 로드
  useEffect(() => {
    if (showInitialHotels && !hasSearched) {
      loadInitialHotels();
    }
  }, [showInitialHotels, hasSearched]);
  
  // 확장 패널 관련 state
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandedRowState, setExpandedRowState] = useState<ExpandedRowState | null>(null);

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
    
    // 먼저 Storage 폴더 상태 확인
    await checkStorageFolder(hotelId, sabreId)

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
        // Supabase Storage 이미지 데이터 설정
        setImageManagementState(prev => {
          const currentState = prev[hotelId]
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
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
              // storageFolder는 checkStorageFolder에서 이미 설정되었으므로 유지
              storageFolder: currentState?.storageFolder || null,
              storageImages: data.data.images || [],
              savingImages: {}
            }
          }
        })
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
            error: null,
            originalsExists: false,
            originalsPath: '',
            originalsFileCount: 0
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
          
          const newStorageFolder = {
            exists: data.data.exists || false,
            slug: data.data.slug || '',
            folderPath: data.data.folderPath || '',
            path: data.data.path || '',
            fileCount: data.data.fileCount,
            loading: false,
            error: null,
            // Originals 폴더 정보
            originalsExists: data.data.originalsExists || false,
            originalsPath: data.data.originalsPath || '',
            originalsFileCount: data.data.originalsFileCount || 0
          }
          
          return {
            ...prev,
            [hotelId]: {
              ...currentState,
              storageFolder: newStorageFolder
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
                error: data.error || 'Storage 폴더 상태 확인에 실패했습니다.',
                originalsExists: false,
                originalsPath: '',
                originalsFileCount: 0
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
              error: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
              originalsExists: false,
              originalsPath: '',
              originalsFileCount: 0
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
                error: null,
                originalsExists: true, // Originals 폴더도 함께 생성됨
                originalsPath: data.data.originalsPath || '',
                originalsFileCount: 0
              },
              success: data.data.message
            }
          }
        })
        
        // 폴더 생성 후 상태 재확인
        setTimeout(() => {
          checkStorageFolder(hotelId, sabreId)
        }, 500)
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
  const performSearch = async (term: string, page: number = 1) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setHasSearched(true);
    setOpenSuggest(false);
    setSuppressSuggest(true);
    setCurrentPage(page);

    const offset = (page - 1) * limit;

    try {
      const response = await fetch('/api/hotel/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          searching_string: term,
          limit,
          offset,
        }),
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
      // 검색 완료 후 자동완성 다시 활성화
      setSuppressSuggest(false);
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setOpenSuggest(false);
    setSuggestions([]);
    setCurrentPage(1);
    
    // URL 업데이트
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim())
    } else {
      params.delete('q')
    }
    params.delete('page')
    router.push(`?${params.toString()}`, { scroll: false })
    
    await performSearch(searchTerm, 1);
  };

  // 검색 결과 초기화
  const handleReset = () => {
    setSearchTerm('');
    setResults([]);
    setError(null);
    setCount(0);
    setHasSearched(false);
    setCurrentPage(1);
    setExpandedRowId(null);
    setExpandedRowState(null);
    setSuggestions([]);
    setOpenSuggest(false);
    setSuppressSuggest(false);
    
    // URL에서 검색 파라미터 제거
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('page')
    router.push(`?${params.toString()}`, { scroll: false })
  };

  // 페이지 변경 핸들러
  const handlePageChange = async (page: number) => {
    // URL 업데이트
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim())
    }
    params.set('page', String(page))
    router.push(`?${params.toString()}`, { scroll: false })
    
    // performSearch 내부에서 setCurrentPage를 호출하므로 여기서는 호출하지 않음
    await performSearch(searchTerm, page);
  };

  // 초기 호텔 리스트 로딩
  useEffect(() => {
    if (showInitialHotels) {
      loadInitialHotels();
    }
  }, [showInitialHotels]);

  // 호텔명 입력 제안
  useEffect(() => {
    if (!searchTerm) {
      setSuggestions([]);
      setOpenSuggest(false);
      abortRef.current?.abort();
      return;
    }
    if (suppressSuggest) {
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
  
  const onSelectSuggestion = (value: string) => {
    setSearchTerm(value);
    setOpenSuggest(false);
    
    // 검색 실행
    performSearch(value);
  };

  // SEO 데이터 조회 핸들러
  const fetchSeoData = async (sabreId: string, currentExpandedRowId: string) => {
    if (!onSeoFetch) return null;
    try {
      const seoData = await onSeoFetch(sabreId);
      // 현재 확장된 행이 여전히 같은 행인지 확인 (비동기 작업 완료 후에도 유효한지 체크)
      setExpandedRowState((prev) => {
        if (prev && prev.hotelId === currentExpandedRowId && seoData) {
          return { ...prev, seoData };
        }
        return prev;
      });
      return seoData;
    } catch (error) {
      console.error('SEO 데이터 조회 실패:', error);
      return null;
    }
  };

  // 행 클릭 핸들러
  const handleRowClick = (hotel: HotelSearchResult) => {
    if (enableSeoManagement) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        const hotelId = String(hotel.sabre_id);
        
        if (expandedRowId === hotelId) {
          setExpandedRowId(null);
          setExpandedRowState(null);
        } else {
          setExpandedRowId(hotelId);
          setExpandedRowState({
            type: 'seo-management',
            hotelId: hotelId,
            hotel: hotel,
            seoData: undefined,
          });
          
          // SEO 데이터 조회
          fetchSeoData(hotel.sabre_id, hotelId);
        }
        return;
      }
      return;
    }
    
    if (enableImageManagement) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        const hotelId = String(hotel.sabre_id);
        
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
          
          fetchHotelImages(hotel.sabre_id);
        }
        return;
      }
      return;
    }
    
    if (enableUrlGeneration) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        const hotelId = String(hotel.sabre_id);
        
        if (expandedRowId === hotelId) {
          setExpandedRowId(null);
          setExpandedRowState(null);
        } else {
          setExpandedRowId(hotelId);
          setExpandedRowState({
            type: 'url-generation',
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
        return;
      }
      return;
    }
    
    if (onHotelSelect) {
      if (hotel.sabre_id !== null && hotel.sabre_id !== undefined) {
        const sabreIdString = String(hotel.sabre_id);
        const hotelInfo = {
          sabre_id: sabreIdString,
          property_name_ko: hotel.property_name_ko,
          property_name_en: hotel.property_name_en
        };
        onHotelSelect(sabreIdString, hotelInfo);
        return;
      } else {
        onHotelSelect(null);
        return;
      }
    }

    if (enableHotelEdit) {
      return;
    }

    const hotelId = String(hotel.sabre_id);
    
    if (expandedRowId === hotelId) {
      setExpandedRowId(null);
      setExpandedRowState(null);
    } else {
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

  // 외부 API 호출 핸들러
  const handleTestApi = async () => {
    if (!expandedRowState) return;
    
    const currentHotel = results.find(h => 
      `${h.sabre_id}-${h.paragon_id}` === expandedRowState.hotelId
    );
    
    let sabreId = currentHotel?.sabre_id
    
    if (!sabreId && expandedRowState.hotelId) {
      const parts = expandedRowState.hotelId.split('-')
      if (parts[0] && parts[0] !== 'null' && parts[0] !== 'undefined') {
        sabreId = parts[0]
      }
    }
    
    if (!sabreId) {
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
        HotelCode: `${sabreId}`,
        CurrencyCode: expandedRowState.currencyCode,
        StartDate: expandedRowState.startDate,
        EndDate: expandedRowState.endDate,
        Adults: expandedRowState.adults
      };

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

      const responseText = await response.text();
      
      try {
        const result = JSON.parse(responseText);
        updateExpandedRowState({ 
          testResult: result,
          isLoading: false 
        });
      } catch {
        updateExpandedRowState({ 
          testResult: responseText,
          isLoading: false 
        });
      }

    } catch (error) {
      updateExpandedRowState({ 
        error: `API 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
        isLoading: false 
      });
    }
  };

  // Rate Plan Codes 저장 핸들러
  const handleSaveRatePlanCodes = async () => {
    if (!expandedRowState) return;
    
    let currentHotel = expandedRowState.hotel
    
    if (!currentHotel) {
      currentHotel = results.find(h => {
        const hotelId = expandedRowState.hotelId
        return (
          `${h.sabre_id}-${h.paragon_id}` === hotelId ||
          String(h.sabre_id) === hotelId ||
          `${h.sabre_id}` === hotelId
        )
      })
    }
    
    if (!currentHotel || !currentHotel.sabre_id) {
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

      setTimeout(() => {
        updateExpandedRowState({ saveSuccess: false });
      }, 3000);
      
    } catch (error) {
      updateExpandedRowState({ 
        error: 'Rate Plan Codes 저장 중 오류가 발생했습니다.',
        isSaving: false 
      });
    }
  };

  const [copiedJson, setCopiedJson] = useState(false);
  const handleCopyJson = () => {
    if (!expandedRowState?.testResult) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(expandedRowState.testResult, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {!hideHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-blue-600 p-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
              <path d="M10 14h4" />
              <path d="M10 18h4" />
            </svg>
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

      {/* 검색 폼 */}
      <div className="mb-6">
        <HotelSearchFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleSearch}
          onReset={handleReset}
          loading={loading}
          suggestions={suggestions}
          openSuggest={openSuggest}
          setOpenSuggest={setOpenSuggest}
          onSuggestionClick={onSelectSuggestion}
          inputRef={inputRef}
        />
                  </div>

      {/* 결과 영역 */}
      <div className="flex-1 overflow-auto space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
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
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">연결 실패</h3>
                  <p className="text-sm mt-1">{connectError}</p>
                </div>
              </div>
            )}
            {connectSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium">연결 성공</h3>
                  <p className="text-sm mt-1">{connectSuccess}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* 검색 결과 테이블 */}
        <HotelListTable 
          results={results}
          count={count}
          showInitialHotels={showInitialHotels}
          enableHotelEdit={enableHotelEdit}
          enableChainBrandConnect={enableChainBrandConnect}
          
          expandedRowId={expandedRowId}
          expandedRowState={expandedRowState}
          
          onRowClick={handleRowClick}
          setExpandedRowId={setExpandedRowId}
          setExpandedRowState={setExpandedRowState}
          
          connectingHotelId={connectingHotelId}
          connectChainId={connectChainId}
          connectBrandId={connectBrandId}
          connectHotelToChainBrand={connectHotelToChainBrand}
          
          imageManagementState={imageManagementState}
          toggleImageEditMode={toggleImageEditMode}
          saveImageUrls={saveImageUrls}
          createStorageFolder={createStorageFolder}
          checkStorageFolder={checkStorageFolder}
          loadStorageImages={loadStorageImages}
          
          updateExpandedRowState={updateExpandedRowState}
          handleTestHotelDetails={handleTestApi}
          handleCopyJson={handleCopyJson}
          copiedJson={copiedJson}
          
          enableSeoManagement={enableSeoManagement}
          onSeoUpdate={onSeoUpdate}
          onSeoGenerate={onSeoGenerate}
          
          currentPage={currentPage}
          limit={limit}
          onPageChange={handlePageChange}
          
          onBulkSeoGenerate={onBulkSeoGenerate}
        />

        {/* 빈 결과 메시지 */}
        {!loading && hasSearched && count === 0 && !error && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Building2를 여기서 사용하는데 import 없으므로 SVG로 대체하거나 import 추가 필요. */}
            {/* 하지만 이미 상단 헤더에서 SVG로 대체했으므로 여기서도 SVG로 대체하거나 import 추가하면 됨. */}
            {/* import 추가했으므로 그냥 쓰면 되는데 Building2 import는 안 함. */}
            {/* AlertCircle, CheckCircle만 추가함. Building2는? */}
            {/* 상단 헤더에서는 SVG 직접 씀. 여기서는? */}
            {/* Building2를 쓰려면 import 해야 함. import 추가하자. */}
            {/* 상단 import 수정: import { AlertCircle, CheckCircle, Building2 } from 'lucide-react' */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
            >
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
              <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              <path d="M10 6h4" />
              <path d="M10 10h4" />
              <path d="M10 14h4" />
              <path d="M10 18h4" />
            </svg>
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
