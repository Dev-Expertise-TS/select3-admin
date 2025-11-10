'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { quillFormats, createQuillModules, EDITOR_HEIGHTS, EditorHeight } from '@/lib/quill-config'
import { useQuillImageUpload } from '@/hooks/use-quill-image-upload'
import { ImageUploadDialog } from './image-upload-dialog'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-50 rounded border flex items-center justify-center text-gray-500">에디터 로딩 중...</div>
})

interface ContentEditorSectionProps {
  title: string
  content: string
  onContentChange: (content: string) => void
  onSave?: () => Promise<void>
  sabreId?: string
  initialExpanded?: boolean
  showSaveButton?: boolean
}

export function ContentEditorSection({
  title,
  content,
  onContentChange,
  onSave,
  sabreId,
  initialExpanded = false,
  showSaveButton = true
}: ContentEditorSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)
  const [editorHeight, setEditorHeight] = useState<EditorHeight>('medium')
  const [editorContent, setEditorContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const { quillRef, handleImageUpload, showImageDialog, setShowImageDialog, uploadFile, uploadUrl } = useQuillImageUpload({ sabreId })

  // content prop이 변경될 때 editorContent 업데이트
  useEffect(() => {
    setEditorContent(content)
  }, [content])

  // 에디터 내용 변경
  const handleEditorChange = useCallback((htmlContent: string) => {
    if (typeof htmlContent === 'string') {
      setEditorContent(htmlContent)
      onContentChange(htmlContent)
      setSaveSuccess(false)
    }
  }, [onContentChange])

  // Quill 모듈 설정 (clipboard 이미지 자동 업로드 포함)
  const quillModules = useMemo(() => createQuillModules(handleImageUpload, uploadFile), [handleImageUpload, uploadFile])
  
  // 이미지 업로드 다이얼로그 핸들러
  const handleImageFileSelected = async (file: File) => {
    await uploadFile(file)
  }

  const handleImageUrlSubmitted = async (url: string) => {
    await uploadUrl(url)
  }

  // 저장
  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      await onSave()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('저장 오류:', err)
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
        {isExpanded && (
          <div className="flex items-center gap-3">
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
            {showSaveButton && onSave && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
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
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="p-4 bg-white flex justify-center">
          <div className="w-full max-w-4xl">
            <style jsx global>{`
              .hotel-content-editor .ql-container {
                font-family: inherit;
              }
              .hotel-content-editor .ql-editor {
                line-height: 1.8 !important;
              }
              .hotel-content-editor .ql-editor p {
                margin-bottom: 1.2em !important;
                line-height: 1.8 !important;
              }
              .hotel-content-editor .ql-editor h1,
              .hotel-content-editor .ql-editor h2,
              .hotel-content-editor .ql-editor h3,
              .hotel-content-editor .ql-editor h4,
              .hotel-content-editor .ql-editor h5,
              .hotel-content-editor .ql-editor h6 {
                margin-top: 1.5em !important;
                margin-bottom: 0.8em !important;
                line-height: 1.6 !important;
              }
              .hotel-content-editor .ql-editor ul,
              .hotel-content-editor .ql-editor ol {
                margin-bottom: 1.2em !important;
              }
              .hotel-content-editor .ql-editor li {
                margin-bottom: 0.4em !important;
                line-height: 1.8 !important;
              }
              .hotel-content-editor .ql-editor blockquote {
                margin: 1.5em 0 !important;
                padding: 0.8em 1.2em !important;
                line-height: 1.7 !important;
              }
            `}</style>
            <ReactQuill
              {...({ ref: quillRef } as any)}
              theme="snow"
              defaultValue={editorContent || ''}
              value={editorContent || ''}
              onChange={handleEditorChange}
              modules={quillModules}
              formats={quillFormats}
              className="bg-white hotel-content-editor"
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

