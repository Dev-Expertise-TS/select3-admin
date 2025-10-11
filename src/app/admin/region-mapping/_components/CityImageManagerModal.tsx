'use client'

import React, { useState, useEffect } from 'react'
import { X, Upload, Trash2, Image as ImageIcon, Download, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadCityImagesFromUrls } from '@/features/regions/actions'

interface CityImage {
  id: number
  city_code?: string | null
  city_ko?: string | null
  city_en?: string | null
  file_name: string
  file_path: string
  storage_path: string
  public_url: string
  file_type?: string | null
  file_size?: number | null
  image_seq?: number | null
  created_at?: string
  updated_at?: string
  [key: string]: unknown  // 동적 컬럼 지원
}

interface CityImageManagerModalProps {
  isOpen: boolean
  onClose: () => void
  onImageChanged?: () => void  // 이미지 변경 시 호출될 콜백
  cityKo: string | null
  cityEn: string | null
  cityCode: string | null
  citySlug: string | null
}

export default function CityImageManagerModal({
  isOpen,
  onClose,
  onImageChanged,
  cityKo,
  cityEn,
  cityCode,
  citySlug
}: CityImageManagerModalProps) {
  const [images, setImages] = useState<CityImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  
  // URL 입력 관련 상태
  const [urlInput, setUrlInput] = useState('')
  const [urlUploading, setUrlUploading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadImages()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cityCode, cityKo, cityEn])

  const loadImages = async () => {
    setLoading(true)
    try {
      // city_code 우선, 없으면 cityKo, 없으면 cityEn 사용
      const searchKey = cityCode || cityKo || cityEn
      const searchParam = cityCode ? 'cityCode' : (cityKo ? 'cityKo' : 'cityEn')
      
      if (!searchKey) {
        console.warn('[CityImageManager] No search key available')
        setImages([])
        return
      }
      
      console.log('[CityImageManager] Loading images with:', { searchParam, searchKey });
      
      const response = await fetch(`/api/city-images/list?${searchParam}=${encodeURIComponent(searchKey)}`)
      const result = await response.json()
      
      console.log('[CityImageManager] API response:', result);
      
      if (result.success) {
        setImages(result.data || [])
      } else {
        console.error('[CityImageManager] loadImages error:', result.error)
      }
    } catch (error) {
      console.error('[CityImageManager] loadImages exception:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // city_code 필수 체크
    if (!cityCode) {
      alert('도시 코드(city_code)가 설정되지 않았습니다.\n먼저 도시 레코드에 도시 코드를 입력하고 저장한 후 이미지를 업로드해주세요.')
      event.target.value = ''
      return
    }

    // 이미지 파일만 허용
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 파일 크기 제한 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('cityKo', cityKo || '')
      formData.append('cityEn', cityEn || '')
      formData.append('cityCode', cityCode)  // 필수
      formData.append('citySlug', citySlug || '')

      const response = await fetch('/api/city-images/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        alert('이미지가 업로드되었습니다.')
        await loadImages()
        // ✅ 썸네일 새로고침을 위한 콜백 호출
        if (onImageChanged) {
          onImageChanged()
        }
      } else {
        alert(result.error || '업로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('[CityImageManager] handleFileSelect error:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      // input 초기화
      event.target.value = ''
    }
  }

  const handleDeleteImage = async (image: CityImage) => {
    if (!confirm(`"${image.file_name}" 이미지를 삭제하시겠습니까?`)) {
      return
    }

    setDeleting(image.id)
    try {
      const response = await fetch(`/api/city-images/delete?id=${image.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        alert('이미지가 삭제되었습니다.')
        setImages(prev => prev.filter(img => img.id !== image.id))
        // ✅ 썸네일 새로고침을 위한 콜백 호출
        if (onImageChanged) {
          onImageChanged()
        }
      } else {
        alert(result.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('[CityImageManager] handleDeleteImage error:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  // URL에서 이미지 다운로드 핸들러
  const handleUploadFromUrls = async () => {
    if (!cityCode) {
      alert('⚠️ City Code가 없어 URL 업로드를 진행할 수 없습니다.')
      return
    }

    const urls = urlInput
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0)
    
    if (urls.length === 0) {
      alert('⚠️ 업로드할 이미지 URL을 입력해주세요.')
      return
    }

    const confirmed = confirm(
      `${urls.length}개의 URL에서 이미지를 다운로드하여 저장하시겠습니까?\n\n` +
      `도시 코드: ${cityCode}\n` +
      `첫 번째 URL: ${urls[0]}\n` +
      `${urls.length > 1 ? `...외 ${urls.length - 1}개` : ''}`
    )

    if (!confirmed) return

    setUrlUploading(true)

    try {
      const result = await uploadCityImagesFromUrls({
        cityCode,
        cityKo: cityKo || undefined,
        cityEn: cityEn || undefined,
        urls
      })

      if (result.success && result.data) {
        const { uploaded, total, results } = result.data
        
        // 에러 메시지 수집
        const errors = results.filter(r => r.error)
        
        let message = `✅ ${uploaded}/${total}개 이미지 업로드 완료!`
        
        if (errors.length > 0) {
          message += `\n\n⚠️ 실패한 항목 (${errors.length}개):\n`
          errors.slice(0, 3).forEach(e => {
            message += `• ${e.url.substring(0, 50)}...\n  → ${e.error}\n`
          })
          if (errors.length > 3) {
            message += `...외 ${errors.length - 3}개`
          }
        }
        
        alert(message)
        
        // 성공한 경우 입력 필드 초기화 및 이미지 목록 새로고침
        if (uploaded > 0) {
          setUrlInput('')
          await loadImages()
          // ✅ 썸네일 새로고침을 위한 콜백 호출
          if (onImageChanged) {
            onImageChanged()
          }
        }
      } else {
        alert(`❌ 업로드 실패:\n${result.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error('[CityImageManager] URL upload error:', error)
      alert(`❌ URL 업로드 중 오류가 발생했습니다:\n${error}`)
    } finally {
      setUrlUploading(false)
    }
  }

  if (!isOpen) return null

  const cityName = cityKo || cityEn || '(이름 없음)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-blue-600" />
              도시 이미지 관리
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              도시: <span className="font-medium">{cityName}</span>
              {cityCode ? (
                <span className="text-blue-600 ml-2 font-mono font-semibold">[{cityCode}]</span>
              ) : (
                <span className="text-red-600 ml-2 text-xs">⚠️ 도시 코드 미설정</span>
              )}
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
          {/* ✅ 파일 업로드 섹션 */}
          <div className={`mb-4 p-4 border-2 border-dashed rounded-lg ${
            cityCode ? 'border-blue-300 bg-blue-50' : 'border-red-300 bg-red-50'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  파일 업로드
                </h3>
                {cityCode ? (
                  <p className="text-sm text-gray-600">
                    로컬 파일에서 이미지를 선택하여 업로드하세요 (최대 10MB)
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ⚠️ 도시 코드가 설정되지 않았습니다.
                  </p>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading || !cityCode}
                  className="hidden"
                  id="city-image-upload"
                />
                <label htmlFor="city-image-upload">
                  <span
                    className={`inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                      uploading || !cityCode
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    }`}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        업로드 중...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        파일 선택
                      </>
                    )}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ✅ URL 다운로드 섹션 */}
          <div className={`mb-6 p-4 border-2 border-dashed rounded-lg ${
            cityCode ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Link className="h-5 w-5 text-green-600" />
                  URL에서 다운로드
                </h3>
                {cityCode ? (
                  <p className="text-sm text-gray-600">
                    이미지 URL을 입력하여 원격 이미지를 다운로드하세요 (최대 20개)
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ⚠️ 도시 코드가 설정되지 않았습니다.
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 URL (한 줄에 하나씩)
                </label>
                <textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                  className="w-full h-28 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm resize-none"
                  disabled={urlUploading || !cityCode}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 여러 URL을 한 줄씩 입력하면 일괄 다운로드됩니다.
                </p>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <Button
                  onClick={() => setUrlInput('')}
                  variant="outline"
                  size="sm"
                  disabled={urlUploading || !urlInput.trim()}
                >
                  지우기
                </Button>
                <Button
                  onClick={handleUploadFromUrls}
                  size="sm"
                  disabled={urlUploading || urlInput.trim().length === 0 || !cityCode}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {urlUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      다운로드 중...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-2" />
                      다운로드 및 저장
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {cityCode && (
            <p className="text-xs text-blue-600 font-mono mb-4">
              Storage: cities/{cityCode}/ 폴더에 저장됩니다
            </p>
          )}

          {/* Images Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">이미지 목록을 불러오는 중...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">업로드된 이미지가 없습니다.</p>
              <p className="text-gray-500 text-sm mt-2">
                위의 버튼을 사용하여 이미지를 업로드하세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                총 <span className="font-semibold text-gray-900">{images.length}</span>개의 이미지
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow"
                  >
                    {/* Image */}
                    <div className="aspect-video bg-gray-100 relative">
                      <img
                        src={image.public_url}
                        alt={image.file_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Button
                          onClick={() => handleDeleteImage(image)}
                          size="sm"
                          variant="destructive"
                          disabled={deleting === image.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {deleting === image.id ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span className="text-xs">삭제 중...</span>
                            </div>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              <span className="text-xs">삭제</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="p-3 space-y-2">
                      {/* 파일명 */}
                      <div className="pb-2 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 font-medium">파일명</p>
                          <span className="text-xs text-gray-400">#{image.image_seq || 1}</span>
                        </div>
                        <p className="text-xs font-mono text-gray-900 break-all" title={image.file_name}>
                          {image.file_name}
                        </p>
                      </div>
                      
                      {/* Storage 경로 */}
                      <div className="pb-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">Storage 경로</p>
                        <div className="bg-gray-50 px-2 py-1.5 rounded">
                          <p className="text-xs font-mono text-gray-700 break-all" title={image.file_path}>
                            {image.file_path}
                          </p>
                        </div>
                      </div>
                      
                      {/* Public URL */}
                      <div className="pb-2 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 font-medium">Public URL</p>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                await navigator.clipboard.writeText(image.public_url)
                                alert('✅ URL이 클립보드에 복사되었습니다!')
                              } catch {
                                alert('❌ 복사에 실패했습니다.')
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            복사
                          </button>
                        </div>
                        <div className="bg-blue-50 px-2 py-1.5 rounded">
                          <p className="text-xs font-mono text-blue-900 break-all" title={image.public_url}>
                            {image.public_url}
                          </p>
                        </div>
                      </div>
                      
                      {/* 파일 정보 */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                        <span>
                          {image.file_size ? `${(image.file_size / 1024).toFixed(1)} KB` : '-'}
                        </span>
                        <span>
                          {image.file_type || 'unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {images.length > 0 && (
              <span>
                총 용량: {(images.reduce((sum, img) => sum + (img.file_size || 0), 0) / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}

