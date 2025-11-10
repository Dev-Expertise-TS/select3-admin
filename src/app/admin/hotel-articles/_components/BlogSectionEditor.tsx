'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HotelAutocomplete } from '@/components/shared/hotel-autocomplete'
import { cn } from '@/lib/utils'
import { quillFormats, createQuillModules } from '@/lib/quill-config'
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

  // Quill 모듈 설정 (clipboard 이미지 자동 업로드 포함)
  const quillModules = useMemo(() => createQuillModules(handleImageUpload, uploadFile), [handleImageUpload, uploadFile])

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
    if (!blogSlug) {
      alert('블로그 slug가 필요합니다.')
      return
    }

    setIsSaving(true)
    try {
      // 현재 에디터 내용 먼저 부모에게 전달
      onContentChange(contentKey, editorContent)
      
      // blogId가 있으면 PUT, 없으면 POST (slug 기준 upsert)
      const url = blogId ? `/api/hotel-articles/${blogId}` : '/api/hotel-articles'
      const method = blogId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slug: blogSlug,
          main_title: 'Untitled', // POST 시 필수 필드
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
    <div className="flex-1 flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
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
          {/* 호텔 정보 표시 */}
          <div className="flex-1 min-w-0">
            {sabreId && hotelInfo ? (
              <div className="text-sm text-gray-600 truncate">
                <span className="font-medium text-gray-700">{hotelInfo.property_name_ko}</span>
                <span className="text-gray-500 mx-2">•</span>
                <span className="text-gray-500">{hotelInfo.property_name_en}</span>
                <span className="text-gray-400 ml-2">({sabreId})</span>
              </div>
            ) : sabreId && loadingHotelInfo ? (
              <div className="text-sm text-gray-500">호텔 정보 로딩 중...</div>
            ) : sabreId ? (
              <div className="text-sm text-gray-500">Sabre ID: {sabreId}</div>
            ) : (
              <div className="text-sm text-gray-400">호텔 미연결</div>
            )}
          </div>
          
          {/* 입력 필드 */}
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
          {blogSlug && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSectionSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '섹션 저장'
                  )}
                </Button>
              )}
        </div>
      </div>
      
      {/* 에디터 영역 - 전체 높이 사용 */}
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-4xl h-full flex flex-col">
          <style jsx global>{`
            .full-height-editor {
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            .full-height-editor .ql-container {
              flex: 1;
              overflow-y: auto;
            }
            .full-height-editor .ql-editor {
              min-height: 100%;
              line-height: 1.8 !important;
            }
            .full-height-editor .ql-editor p {
              margin-bottom: 1.2em !important;
              line-height: 1.8 !important;
            }
            .full-height-editor .ql-editor h1,
            .full-height-editor .ql-editor h2,
            .full-height-editor .ql-editor h3,
            .full-height-editor .ql-editor h4,
            .full-height-editor .ql-editor h5,
            .full-height-editor .ql-editor h6 {
              margin-top: 1.5em !important;
              margin-bottom: 0.8em !important;
              line-height: 1.6 !important;
            }
            .full-height-editor .ql-editor ul,
            .full-height-editor .ql-editor ol {
              margin-bottom: 1.2em !important;
            }
            .full-height-editor .ql-editor li {
              margin-bottom: 0.4em !important;
              line-height: 1.8 !important;
            }
            .full-height-editor .ql-editor blockquote {
              margin: 1.5em 0 !important;
              padding: 0.8em 1.2em !important;
              line-height: 1.7 !important;
            }
          `}</style>
          <ReactQuill
            {...({ ref: quillRef } as any)}
            key={`editor-${contentKey}`}
            theme="snow"
            defaultValue={editorContent || ''}
            value={editorContent || ''}
            onChange={onEditorChange}
            modules={quillModules}
            formats={quillFormats}
            className="bg-white full-height-editor"
          />
        </div>
      </div>
      
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

