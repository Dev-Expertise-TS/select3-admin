'use client'

import React from 'react'
import NextImage from 'next/image'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SortableImageCardProps } from './hotel-search-widget.types'

export const SortableImageCard: React.FC<SortableImageCardProps> = ({ 
  image, 
  hotelId, 
  hotel, 
  onDelete, 
  onRenameSuccess, 
  hotelVersion 
}) => {
  const handleRename = async () => {
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
          const errorData = await res.json().catch(() => ({}))
          const errorMessage = errorData.error || '파일명 변경 요청이 실패했습니다.'
          
          if (res.status === 409) {
            alert(`${errorMessage}\n\n다른 파일명을 입력하세요.`)
            next = trimmed
            continue
          }
          
          // 상세 오류 메시지 표시
          console.error('[파일명 변경] 오류:', { status: res.status, error: errorMessage, data: errorData })
          alert(`파일명 변경 실패:\n${errorMessage}`)
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
  }

  const renderImage = () => {
    const v = image.lastModified ? new Date(image.lastModified).getTime() : Date.now()
    const addParam = (url: string, key: string, value: string | number) => 
      url.includes('?') ? `${url}&${key}=${value}` : `${url}?${key}=${value}`
    
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
  }

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-row items-center min-h-[110px] bg-white pr-3">
      {/* 미리보기 */}
      <div className="min-w-[100px] max-w-[110px] min-h-[90px] max-h-[90px] bg-gray-100 flex items-center justify-center">
        {renderImage()}
      </div>
      
      {/* 정보 및 관리 */}
      <div className="flex-1 flex flex-row items-center justify-between pl-5 py-2 gap-4">
        {/* 이미지 정보 */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex gap-3 items-center">
            <div className="w-7 h-7 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">
                {String(image.seq).padStart(2, '0')}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 truncate" title={image.name}>
              {image.name}
            </span>
          </div>
          
          <div className="flex flex-row flex-wrap gap-3 text-xs text-gray-600">
            <span>
              크기: <span className="font-mono">
                {image.size ? `${(image.size / 1024).toFixed(1)} KB` : 'N/A'}
              </span>
            </span>
            <span>
              타입: <span className="font-mono">
                {image.contentType?.split('/')[1]?.toUpperCase() || 'N/A'}
              </span>
            </span>
            <span>
              수정: <span className="font-mono">
                {image.lastModified ? new Date(image.lastModified).toLocaleDateString('ko-KR') : 'N/A'}
              </span>
            </span>
            <span>
              경로: <span className="font-mono">{image.storagePath}</span>
            </span>
          </div>
          
          {image.url && (
            <a 
              href={image.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block text-xs text-blue-700 underline font-mono break-all mt-1"
            >
              {image.url}
            </a>
          )}
        </div>
        
        {/* 액션 버튼 */}
        <div className="flex flex-col items-end gap-2 mr-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-20 text-gray-700 hover:text-gray-900"
            onClick={handleRename}
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

