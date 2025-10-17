'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HotelAutocomplete } from '@/components/shared/hotel-autocomplete'
import { cn } from '@/lib/utils'
import { quillFormats, createQuillModules, EDITOR_HEIGHTS, EditorHeight } from '@/lib/quill-config'
import { useQuillImageUpload } from '@/hooks/use-quill-image-upload'
import { ImageUploadDialog } from '@/components/shared/image-upload-dialog'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 rounded border flex items-center justify-center text-gray-500">에디터 로딩 중...</div>
})

interface BlogSectionEditorProps {
  title: string
  contentKey: string
  sabreKey: string
  content: string
  sabreId: string
  blogId?: string
  blogSlug?: string
  onContentChange: (key: string, value: string) => void
  onSabreChange: (key: string, value: string) => void
}

export function BlogSectionEditor({
  title,
  contentKey,
  sabreKey,
  content,
  sabreId,
  blogId,
  blogSlug,
  onContentChange,
  onSabreChange
}: BlogSectionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(!!content)
  const [editorHeight, setEditorHeight] = useState<EditorHeight>('medium')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hotelInfo, setHotelInfo] = useState<{ property_name_ko: string; property_name_en: string } | null>(null)
  const [loadingHotelInfo, setLoadingHotelInfo] = useState(false)
  const [editorContent, setEditorContent] = useState(content)
  
  const { quillRef, handleImageUpload, showImageDialog, setShowImageDialog, uploadFile, uploadUrl } = useQuillImageUpload({ sabreId })
  const handleEditorChange = useRef<NodeJS.Timeout | undefined>(undefined)

  // 이미지 업로드 다이얼로그 핸들러
  const handleImageFileSelected = async (file: File) => {
    await uploadFile(file)
  }

  const handleImageUrlSubmitted = async (url: string) => {
    await uploadUrl(url)
  }

  // content prop이 변경될 때만 에디터 내용 업데이트
  useEffect(() => {
    setEditorContent(content)
  }, [content])

  // cleanup: 컴포넌트 언마운트 시 debounce 타이머 정리
  useEffect(() => {
    return () => {
      if (handleEditorChange.current) {
        clearTimeout(handleEditorChange.current)
      }
    }
  }, [])

  // 호텔 정보 가져오기
  useEffect(() => {
    const fetchHotelInfo = async () => {
      if (!sabreId) {
        setHotelInfo(null)
        return
      }

      setLoadingHotelInfo(true)
      try {
        const response = await fetch(`/api/hotel/get?sabre_id=${sabreId}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setHotelInfo({
            property_name_ko: result.data.property_name_ko,
            property_name_en: result.data.property_name_en
          })
        } else {
          setHotelInfo(null)
        }
      } catch (err) {
        console.error('호텔 정보 로드 오류:', err)
        setHotelInfo(null)
      } finally {
        setLoadingHotelInfo(false)
      }
    }

    fetchHotelInfo()
  }, [sabreId])

  // Quill 모듈 설정
  const quillModules = useMemo(() => createQuillModules(handleImageUpload), [handleImageUpload])

  // 에디터 내용 변경 (debounce 적용)
  const onEditorChange = useCallback((htmlContent: string) => {
    if (typeof htmlContent === 'string') {
      setEditorContent(htmlContent)
      setSaveSuccess(false)
      
      if (handleEditorChange.current) {
        clearTimeout(handleEditorChange.current)
      }
      handleEditorChange.current = setTimeout(() => {
        onContentChange(contentKey, htmlContent)
      }, 500)
    }
  }, [contentKey, onContentChange])

  // 섹션별 저장
  const handleSectionSave = async () => {
    if (!blogId) {
      alert('블로그를 먼저 생성해주세요.')
      return
    }

    if (!blogSlug) {
      alert('블로그 slug가 필요합니다.')
      return
    }

    setIsSaving(true)
    try {
      // 현재 에디터 내용 먼저 부모에게 전달
      onContentChange(contentKey, editorContent)
      
      const response = await fetch(`/api/hotel-articles/${blogId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug: blogSlug,
          [contentKey]: editorContent,
          [sabreKey]: sabreId || null
        })
      })

      const result = await response.json()

      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        alert(result.error || '저장에 실패했습니다.')
      }
    } catch (err) {
      console.error('섹션 저장 오류:', err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer text-xs"
          >
            {isExpanded ? '접기' : '편집하기'}
          </Button>
          {content && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              작성됨
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">
              ✓ 저장됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            {sabreId && hotelInfo ? (
              <div className="text-sm">
                <span className="font-medium text-gray-700">Sabre ID: {sabreId}</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-700">{hotelInfo.property_name_ko}</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-500">{hotelInfo.property_name_en}</span>
              </div>
            ) : sabreId && loadingHotelInfo ? (
              <div className="text-sm text-gray-500">호텔 정보 로딩 중...</div>
            ) : sabreId ? (
              <div className="text-sm text-gray-500">Sabre ID: {sabreId}</div>
            ) : (
              <div className="text-sm text-gray-400">호텔 미연결</div>
            )}
            <div className="w-64">
              <HotelAutocomplete
                value={sabreId}
                onChange={(value) => {
                  onSabreChange(sabreKey, value)
                  setSaveSuccess(false)
                }}
                placeholder="호텔 검색..."
              />
            </div>
          </div>
          {isExpanded && (
            <>
              <div className="flex items-center gap-1 border rounded px-2 py-1 bg-white">
                <button
                  type="button"
                  onClick={() => setEditorHeight('small')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'small' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="작게"
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => setEditorHeight('medium')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'medium' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="보통"
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => setEditorHeight('large')}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded",
                    editorHeight === 'large' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  )}
                  title="크게"
                >
                  L
                </button>
              </div>
              {blogId && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSectionSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      저장중
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white flex justify-center">
          <div className="w-full max-w-4xl">
            <ReactQuill
              {...({ ref: quillRef } as any)}
              key={`editor-${contentKey}`}
              theme="snow"
              defaultValue={editorContent || ''}
              value={editorContent || ''}
              onChange={onEditorChange}
              modules={quillModules}
              formats={quillFormats}
              className="bg-white"
              style={{ height: EDITOR_HEIGHTS[editorHeight], marginBottom: '42px' }}
            />
          </div>
        </div>
      )}
      
      {/* 이미지 업로드 다이얼로그 */}
      <ImageUploadDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onImageSelected={handleImageFileSelected}
        onUrlSubmitted={handleImageUrlSubmitted}
      />
    </div>
  )
}

