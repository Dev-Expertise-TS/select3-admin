import React, { useState, useRef, useEffect } from 'react'
import NextImage from 'next/image'
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  FolderPlus,
  FolderCheck,
  FolderX,
  Database,
  ImageIcon,
  Plus,
  Trash2,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HotelSearchResult } from '@/types/hotel'
import { uploadHotelImagesFromUrls } from '@/features/hotel-images/actions'

export interface ImageInfo {
  width: number
  height: number
  size: number // bytes
  format: string
  loading: boolean
  error: string | null
}

export interface StorageFolderInfo {
  exists: boolean
  slug: string
  folderPath: string
  path: string
  fileCount?: number
  loading: boolean
  error: string | null
  // Originals 폴더 정보
  originalsExists?: boolean
  originalsPath?: string
  originalsFileCount?: number
}

export interface StorageImage {
  name: string
  url: string
  size?: number
  lastModified?: string
  contentType?: string
  role?: string
  seq: number
  isPublic?: boolean
  storagePath?: string
  folder?: string
  path?: string
}

const SortableImageCard: React.FC<{
  image: StorageImage
  hotelId: string
  hotel: HotelSearchResult
  onDelete: () => Promise<void> | void
  onRenameSuccess: (params: { oldPath: string; newPath: string; newName: string }) => void
  hotelVersion: number
}> = ({ image, hotelId, hotel, onDelete, onRenameSuccess, hotelVersion }) => {
  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-row items-center min-h-[110px] bg-white pr-3">
      {/* 미리보기 */}
      <div className="min-w-[100px] max-w-[110px] min-h-[90px] max-h-[90px] bg-gray-100 flex items-center justify-center">
        {(() => {
          const v = image.lastModified ? new Date(image.lastModified).getTime() : Date.now()
          const addParam = (url: string, key: string, value: string | number) => url.includes('?') ? `${url}&${key}=${value}` : `${url}?${key}=${value}`
          let cacheSafeUrl = image.url || ''
          if (cacheSafeUrl) {
            cacheSafeUrl = addParam(cacheSafeUrl, 'hv', hotelVersion)
            cacheSafeUrl = addParam(cacheSafeUrl, 'v', v)
          }
          return (
            <NextImage
          unoptimized
          src={cacheSafeUrl as string}
          alt={`${image.name} 미리보기`}
          width={90}
          height={90}
          className="w-[90px] h-auto object-contain rounded"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = '<div class=\'w-full h-full flex items-center justify-center text-gray-400\'><span class=\'text-sm\'>이미지 로드 실패</span></div>'
            }
          }}
        />
          )
        })()}
      </div>
      {/* 오른쪽: 정보 및 관리 */}
      <div className="flex-1 flex flex-row items-center justify-between pl-5 py-2 gap-4">
        {/* 이미지 정보 묶음 */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">{String(image.seq).padStart(2, '0')}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate" title={image.name}>{image.name}</span>
          </div>
          <div className="flex flex-row flex-wrap gap-3 text-xs text-gray-600">
            <span>크기: <span className="font-mono">{image.size ? `${(image.size / 1024).toFixed(1)} KB` : 'N/A'}</span></span>
            <span>타입: <span className="font-mono">{image.contentType?.split('/')[1]?.toUpperCase() || 'N/A'}</span></span>
            <span>수정: <span className="font-mono">{image.lastModified ? new Date(image.lastModified).toLocaleDateString('ko-KR') : 'N/A'}</span></span>
            <span>경로: <span className="font-mono">{image.storagePath}</span></span>
          </div>
          {image.url && (
            <a href={image.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-700 underline font-mono break-all mt-1">{image.url}</a>
          )}
        </div>
                    {/* 액션 버튼 (이름 변경, 삭제) */}
                    <div className="flex flex-col items-end gap-2 mr-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-20 text-gray-700 hover:text-gray-900"
                        onClick={async () => {
                          const currentPath = (image as any).storagePath || (image as any).path
                          if (!currentPath) {
                            alert('파일 경로를 찾을 수 없습니다.')
                            return
                          }
                          const idx = currentPath.lastIndexOf('/')
                          const curName = idx >= 0 ? currentPath.slice(idx + 1) : currentPath
                          let next = curName
                          while (true) {
                            const toFilename = prompt('새 파일명을 입력하세요 (확장자 포함)', next)
                            if (!toFilename) return
                            const trimmed = toFilename.trim()
                            if (!trimmed) return
                            const dir = idx >= 0 ? currentPath.slice(0, idx) : ''
                            const newPath = dir ? `${dir}/${trimmed}` : trimmed
                            try {
                              const res = await fetch('/api/hotel-images/rename', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fromPath: currentPath, toFilename: trimmed })
                              })
                              if (!res.ok) {
                                let errorData: any = {}
                                let errorMessage = '파일명 변경 요청이 실패했습니다.'
                                
                                try {
                                  const text = await res.text()
                                  if (text) {
                                    errorData = JSON.parse(text)
                                    errorMessage = errorData.error || errorMessage
                                  }
                                } catch (parseError) {
                                  console.warn('[파일명 변경] 응답 파싱 실패:', parseError)
                                }
                                
                                if (res.status === 409) {
                                  alert(`${errorMessage}\n\n다른 파일명을 입력하세요.`)
                                  next = trimmed
                                  continue
                                }
                                
                                console.error('[파일명 변경] 오류:', { 
                                  status: res.status, 
                                  statusText: res.statusText,
                                  error: errorMessage, 
                                  hasData: Object.keys(errorData).length > 0,
                                  errorData: Object.keys(errorData).length > 0 ? errorData : undefined
                                })
                                alert(`파일명 변경 실패:\n${errorMessage}\n\n상태: ${res.status} ${res.statusText}`)
                                return
                              }
                              const data = await res.json()
                              if (!data.success) {
                                if (data.code === 'DUPLICATE') {
                                  const errorMessage = data.error || '동일한 파일명이 이미 존재합니다.'
                                  alert(`${errorMessage}\n\n다른 파일명을 입력하세요.`)
                                  next = trimmed
                                  continue
                                }
                                alert(data.error || '파일명 변경에 실패했습니다.')
                                return
                              }
                              alert('파일명이 변경되었습니다.')
                              onRenameSuccess({ oldPath: currentPath, newPath, newName: trimmed })
                              return
                            } catch (e) {
                              console.warn('[image-rename] request error', e)
                              alert('요청 중 오류가 발생했습니다.')
                              return
                            }
                          }
                        }}
                      >
                        이름 변경
                      </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-16 text-red-600 hover:text-red-700 hover:bg-red-50 mr-1"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />삭제
          </Button>
        </div>
      </div>
    </div>
  )
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
  onToggleEditMode?: (hotelId: string) => void
  onSaveImageUrls?: (hotelId: string, sabreId: string) => void
  onCreateStorageFolder: (hotelId: string, sabreId: string) => void
  onCheckStorageFolder: (hotelId: string, sabreId: string) => void
  onLoadStorageImages: (hotelId: string, sabreId: string) => void
}

export const ImageManagementPanel: React.FC<ImageManagementPanelProps> = ({
  hotel,
  hotelId,
  state,
  onCreateStorageFolder,
  onCheckStorageFolder,
  onLoadStorageImages
}) => {
  const [urlModalOpen, setUrlModalOpen] = useState(false)
  const [urlInputs, setUrlInputs] = useState<string[]>(Array.from({ length: 10 }, () => ''))

  const [uploading, setUploading] = useState(false)
  
  const [fileUploading, setFileUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importing, setImporting] = useState(false)
  
  const [syncing, setSyncing] = useState(false)
  const [hotelVersion, setHotelVersion] = useState<number>(1)

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const qs = `sabreId=${encodeURIComponent(String(hotel.sabre_id))}`
        const res = await fetch(`/api/hotel-images/version?${qs}`, { cache: 'no-store' })
        const json = await res.json()
        if (json?.success) setHotelVersion(json.data?.version ?? 1)
      } catch {}
    }
    fetchVersion()
  }, [hotel.sabre_id])

  const [localImages, setLocalImages] = useState<StorageImage[]>(state?.storageImages || [])
  useEffect(() => {
    setLocalImages(state?.storageImages || [])
  }, [state?.storageImages])

  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
  const [activeFolder, setActiveFolder] = useState<'public' | 'originals'>('public')

  const uploadFromUrls = async () => {
    const sabreId = String(hotel.sabre_id || '')
    
    if (!sabreId) {
      alert('Sabre ID가 없습니다.')
      return
    }
    
    const urls = urlInputs.map((u) => u.trim()).filter((u) => u.length > 0)
    
    if (urls.length === 0) {
      alert('하나 이상의 이미지 URL을 입력해주세요.')
      return
    }
    
    setUploading(true)
    
    try {
      const data = await uploadHotelImagesFromUrls({ sabreId, urls })
      
      if (data?.success) {
        const errorResults = data.data.results.filter(r => r.error)
        if (errorResults.length > 0) {
          alert(`업로드 완료: ${data.data.uploaded}/${data.data.total}\n\n오류:\n${errorResults.map(r => `- ${r.url}: ${r.error}`).join('\n')}`)
        } else {
          alert(`업로드 완료: ${data.data.uploaded}/${data.data.total}`)
        }
        setUrlModalOpen(false)
        setUrlInputs(Array.from({ length: 10 }, () => ''))
        onLoadStorageImages(hotelId, sabreId)
      } else {
        alert(`업로드 실패: ${data?.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      alert(`업로드 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setUploading(false)
    }
  }

  const importFromDetails = async () => {
    const sabreId = String(hotel.sabre_id || '')

    if (!sabreId) {
      alert('Sabre ID가 없습니다.')
      return
    }

    if (!confirm('호텔 상세 페이지(property_details)에서 이미지를 가져옵니다.\n\n이미지가 많을 경우 시간이 걸릴 수 있습니다.\n계속하시겠습니까?')) {
      return
    }

    setImporting(true)

    try {
      const res = await fetch('/api/hotel-images/import-from-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabreId })
      })

      const data = await res.json()

      if (data?.success) {
        const errorResults = data.data.results.filter((r: any) => !r.success)
        if (errorResults.length > 0) {
          alert(`가져오기 완료: ${data.data.uploaded}/${data.data.total}\n\n오류:\n${errorResults.slice(0, 5).map((r: any) => `- ${r.url}: ${r.error}`).join('\n')}${errorResults.length > 5 ? `\n... 외 ${errorResults.length - 5}개` : ''}`)
        } else {
          alert(`가져오기 완료: ${data.data.uploaded}/${data.data.total}개의 이미지를 저장했습니다.`)
        }
        onLoadStorageImages(hotelId, sabreId)
      } else {
        alert(`가져오기 실패: ${data?.error || '알 수 없는 오류'}`)
      }
    } catch (err) {
      console.error('[importFromDetails] 오류:', err)
      alert(`가져오기 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setImporting(false)
    }
  }

  const uploadLocalFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const sabreId = String(hotel.sabre_id || '')
    
    if (!sabreId) {
      alert('Sabre ID가 없습니다.')
      return
    }
    
    setFileUploading(true)
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('sabreId', sabreId)
        formData.append('file', file)
        
        const response = await fetch('/api/hotel-images/upload', {
          method: 'POST',
          body: formData,
        })
        
        const contentType = response.headers.get('content-type') || ''

        // JSON 응답이 아닌 경우 (예: 413 Request Entity Too Large HTML 응답 등)
        if (!contentType.includes('application/json')) {
          const text = await response.text().catch(() => '')
          const snippet = text.slice(0, 100)

          if (response.status === 413 || snippet.includes('Request Entity Too Large')) {
            return {
              success: false,
              error: '파일이 너무 큽니다. 업로드 가능한 최대 용량을 초과했습니다.',
            }
          }

          return {
            success: false,
            error: `서버에서 예상치 못한 응답 형식을 반환했습니다. (status: ${response.status})`,
          }
        }

        try {
          return await response.json()
        } catch (e) {
          return {
            success: false,
            error: '서버 응답을 JSON으로 파싱하는 중 오류가 발생했습니다.',
          }
        }
      })
      
      const results = await Promise.all(uploadPromises)
      
      const successCount = results.filter(r => r.success).length
      const failCount = results.length - successCount
      
      if (failCount > 0) {
        const errors = results.filter(r => !r.success).map(r => r.error).join('\n')
        alert(`업로드 완료: ${successCount}/${results.length}\n\n오류:\n${errors}`)
      } else {
        alert(`업로드 완료: ${successCount}/${results.length}`)
      }
      
      onLoadStorageImages(hotelId, sabreId)
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      alert(`업로드 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setFileUploading(false)
    }
  }

  const handleFileSelectClick = () => {
    fileInputRef.current?.click()
  }

  const syncStorageToDb = async () => {
    const sabreId = String(hotel.sabre_id || '')
    
    if (!sabreId) {
      alert('Sabre ID가 없습니다.')
      return
    }
    
    if (!confirm('Storage의 모든 이미지를 DB에 동기화합니다.\n기존 DB 레코드는 삭제되고 새로 생성됩니다.\n계속하시겠습니까?')) {
      return
    }
    
    setSyncing(true)
    
    try {
      const response = await fetch('/api/hotel-images/sync-to-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sabreId }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        const seqInfo = data.data.seqExtracted !== undefined && data.data.seqFailed !== undefined
          ? `\n\nimage_seq 추출: ${data.data.seqExtracted}/${data.data.created}개 성공${data.data.seqFailed > 0 ? `, ${data.data.seqFailed}개 실패` : ''}`
          : ''
        
        alert(`동기화 완료: ${data.data.created}개의 레코드가 생성되었습니다.${seqInfo}`)
        onLoadStorageImages(hotelId, sabreId)
      } else {
        alert(`동기화 실패: ${data.error}`)
      }
    } catch (err) {
      alert(`동기화 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setSyncing(false)
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            {hotel.property_name_ko || hotel.property_name_en || '호텔 정보'}
          </h4>
          <p className="text-sm text-gray-600 mt-1">Sabre ID: {hotel.sabre_id}</p>
        </div>
        <div />
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {state.error}
          </div>
        </div>
      )}

      {state.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {state.success}
          </div>
        </div>
      )}

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
              {(state.storageFolder.exists || state.storageFolder.originalsExists) ? (
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
            
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Slug:</strong> {state.storageFolder.slug}</div>
              <div>
                <strong>Public 폴더:</strong> {state.storageFolder.path || 'N/A'}
                {state.storageFolder.fileCount !== undefined && (
                  <span className="ml-2 text-gray-500">({state.storageFolder.fileCount}개)</span>
                )}
              </div>
              <div>
                <strong>Originals 폴더:</strong> {state.storageFolder.originalsPath || 'N/A'}
                {state.storageFolder.originalsFileCount !== undefined && (
                  <span className="ml-2 text-gray-500">({state.storageFolder.originalsFileCount}개)</span>
                )}
              </div>
            </div>
            
            {!state.storageFolder.exists && !state.storageFolder.originalsExists && (
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

      {state.loading && (
        <div className="rounded-lg border bg-white p-4 text-gray-700">이미지 정보를 불러오는 중...</div>
      )}

      {!state.loading && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold text-gray-900">
                호텔 이미지 목록
              </h5>
            </div>
            
            <div className="flex justify-between items-center gap-2 mb-4">
            <div className="flex gap-2">
              <Button
                  type="button"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleFileSelectClick}
                  disabled={fileUploading || syncing || importing}
                >
                  {fileUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" /> 로컬 파일 업로드
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setUrlModalOpen(true)}
                  disabled={syncing || fileUploading || importing}
                >
                  <Plus className="h-4 w-4 mr-2" /> 이미지 URL로 업로드
                </Button>
              <Button
                type="button"
                variant="outline"
                disabled={syncing || importing}
                onClick={async () => {
                  try {
                    setSyncing(true)
                    const sabreIdStr = String(hotel.sabre_id)
                    
                    const payload = { sabreId: sabreIdStr }
                    const res = await fetch('/api/hotel-images/version', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    })
                    const json = await res.json()
                    
                    if (!res.ok || !json.success) {
                      alert(json.error || '캐시 초기화에 실패했습니다.')
                      return
                    }
                    
                    setHotelVersion(json.data.version)
                    
                    try { onLoadStorageImages(hotelId, sabreIdStr) } catch {}
                    
                    alert('캐시 초기화 완료')
                  } catch (err) {
                    console.error('[캐시 초기화] 오류:', err)
                    alert('캐시 초기화 요청 중 오류가 발생했습니다.')
                  } finally {
                    setSyncing(false)
                  }
                }}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '캐시 초기화'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                onClick={syncStorageToDb}
                disabled={syncing || fileUploading || importing}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" /> Storage → DB 일괄 동기화
                  </>
                )}
              </Button>
              <Button
                type="button"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={importFromDetails}
                disabled={importing || fileUploading || syncing}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" /> 호텔 상세 페이지 이미지 가져오기
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                onClick={async () => {
                  if (!confirm('Public 폴더와 Originals 폴더의 이미지를 동기화하시겠습니까?')) return;
                  try {
                    setSyncing(true);
                    const sabreIdStr = String(hotel.sabre_id);
                    
                    const res = await fetch('/api/hotel-images/sync-folders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sabreId: sabreIdStr })
                    });
                    
                    const json = await res.json();
                    
                    if (!res.ok || !json.success) {
                      alert(json.error || '폴더 동기화에 실패했습니다.');
                      return;
                    }
                    
                    alert(`폴더 동기화 완료: ${json.data?.message || '성공'}`);
                    
                    // 이미지 목록 새로고침
                    try { onLoadStorageImages(hotelId, sabreIdStr) } catch {}
                  } catch (err) {
                    console.error('[폴더 동기화] 오류:', err);
                    alert('폴더 동기화 요청 중 오류가 발생했습니다.');
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing || importing || fileUploading}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Public / Original 폴더 동기화
                  </>
                )}
              </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => uploadLocalFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>

          {localImages && localImages.length > 0 && (() => {
            const publicImages = localImages.filter(img => img.folder === 'public');
            const originalsImages = localImages.filter(img => img.folder === 'originals');
            const displayImages = activeFolder === 'public' ? publicImages : originalsImages;
            
            return (
              <>
                {/* 탭 네비게이션 */}
                <div className="mb-4 border-b border-gray-200">
                  <nav className="-mb-px flex space-x-4">
                    <button
                      onClick={() => setActiveFolder('public')}
                      className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                        activeFolder === 'public'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Public 폴더
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          activeFolder === 'public'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {publicImages.length}개
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveFolder('originals')}
                      className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                        activeFolder === 'originals'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Originals 폴더
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          activeFolder === 'originals'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {originalsImages.length}개
                        </span>
                      </div>
                    </button>
                  </nav>
                </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                        checked={selectedImages.size === displayImages.length && displayImages.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                            setSelectedImages(new Set(displayImages.map((img, idx) => 
                          (img as any).storagePath || (img as any).path || img.name || String(idx)
                        )))
                      } else {
                        setSelectedImages(new Set())
                      }
                    }}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    전체 선택 ({selectedImages.size}개 선택됨)
                  </span>
                </label>
              </div>
              {selectedImages.size > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    if (!confirm(`선택한 ${selectedImages.size}개의 이미지를 삭제하시겠습니까?`)) return;
                    try {
                      const pathsToDelete = Array.from(selectedImages)
                      const promises = pathsToDelete.map(path =>
                        fetch(`/api/hotel-images/delete?filePath=${encodeURIComponent(path)}`, {
                          method: 'DELETE',
                        }).then(res => res.json())
                      )
                      const results = await Promise.all(promises)
                      const successCount = results.filter(r => r.success).length
                      const failCount = results.length - successCount
                      alert(`${successCount}개 이미지 삭제 완료${failCount > 0 ? ` (${failCount}개 실패)` : ''}`)
                      setSelectedImages(new Set())
                      onLoadStorageImages(hotelId, String(hotel.sabre_id))
                    } catch {
                      alert('다중 삭제 중 오류가 발생했습니다.')
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> 선택 삭제
                </Button>
              )}
            </div>

                {/* 선택된 폴더의 이미지 섹션 */}
                {displayImages.length > 0 && (
                  <div className="mb-6">
          <div className="space-y-3">
                      {displayImages.map((image, _index) => (
              <div key={(image as any).storagePath || (image as any).path || image.name || _index} className="relative">
                <label className="absolute top-3 left-3 z-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedImages.has((image as any).storagePath || (image as any).path || image.name || String(_index))}
                    onChange={(e) => {
                      const path = (image as any).storagePath || (image as any).path || image.name || String(_index)
                      if (e.target.checked) {
                        setSelectedImages(new Set([...selectedImages, path]))
                      } else {
                        const newSet = new Set(selectedImages)
                        newSet.delete(path)
                        setSelectedImages(newSet)
                      }
                    }}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                </label>
              <SortableImageCard
                image={image}
                hotelId={hotelId}
                hotel={hotel}
                hotelVersion={hotelVersion}
                onRenameSuccess={({ oldPath, newPath, newName }) => {
                  setLocalImages((prev) => {
                    if (!prev) return prev
                    const now = Date.now()
                    return prev.map((img) => {
                      const sp = (img as any).storagePath || (img as any).path || img.name
                      if (sp !== oldPath) return img
                      let newUrl = img.url
                      if (newUrl && typeof newUrl === 'string') {
                        const replaced = newUrl.replace(/[^/]+(?=($|\?))/, newName)
                        newUrl = replaced + (replaced.includes('?') ? `&v=${now}` : `?v=${now}`)
                      }
                      const updated: any = { ...img, name: newName, url: newUrl }
                      ;(updated as any).storagePath = newPath
                      ;(updated as any).path = newPath
                      const m = newName.match(/_(\d+)_([0-9]{2})\./)
                      if (m) {
                        const seq = Number(m[2])
                        if (!Number.isNaN(seq)) (updated as any).seq = seq
                      }
                      return updated
                    })
                  })
                }}
                onDelete={async () => {
                  if (!confirm(`정말로 ${image.name}을(를) 삭제하시겠습니까?`)) return;
                  const pathToDelete = (image as { path?: string; storagePath?: string }).path || (image as { path?: string; storagePath?: string }).storagePath;
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
                  } catch {
                    alert('삭제 중 오류가 발생했습니다.');
                  }
                }}
              />
              </div>
            ))}
          </div>
                  </div>
                )}

                {displayImages.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>{activeFolder === 'public' ? 'Public' : 'Originals'} 폴더에 이미지가 없습니다.</p>
                    <p className="text-sm">이미지를 업로드하거나 폴더 동기화를 실행하세요.</p>
                  </div>
                )}

                {publicImages.length === 0 && originalsImages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Supabase Storage에 이미지가 없습니다.</p>
                <p className="text-sm">호텔 이미지 마이그레이션을 통해 이미지를 업로드하세요.</p>
              </div>
            )}
              </>
            )
          })()}
          </div>
        </div>
      )}

      {urlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setUrlModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지 URL로 업로드</h3>
            <p className="text-sm text-gray-600 mb-4">이미지 URL을 한 줄에 하나씩 입력하세요 (최대 10개).</p>
            <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
              {urlInputs.map((val, idx) => (
                <input
                  key={`url-${idx}`}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder={`이미지 URL #${idx + 1}`}
                  value={val}
                  onChange={(e) => {
                    const next = [...urlInputs]
                    next[idx] = e.target.value
                    setUrlInputs(next)
                  }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setUrlModalOpen(false)} disabled={uploading}>취소</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700" 
                onClick={uploadFromUrls}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  '저장하기'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

