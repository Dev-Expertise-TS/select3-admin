'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react'

interface ImageUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onImageSelected: (file: File) => void
  onUrlSubmitted: (url: string) => void
}

export function ImageUploadDialog({
  isOpen,
  onClose,
  onImageSelected,
  onUrlSubmitted
}: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('url')
  const [imageUrl, setImageUrl] = useState('')

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageSelected(file)
      onClose()
    }
  }

  const handleUrlSubmit = () => {
    if (imageUrl.trim() && imageUrl.startsWith('http')) {
      onUrlSubmitted(imageUrl.trim())
      setImageUrl('')
      onClose()
    } else {
      alert('유효한 이미지 URL을 입력해주세요.')
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">이미지 추가</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="inline h-4 w-4 mr-2" />
            URL로 추가
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`flex-1 px-4 py-3 text-sm font-medium ${
              activeTab === 'file'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="inline h-4 w-4 mr-2" />
            파일 업로드
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4">
          {activeTab === 'url' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 URL
                </label>
                <Input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleUrlSubmit()
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL을 입력하면 자동으로 다운로드하여 Storage에 저장합니다.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                  disabled={!imageUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  추가
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파일 선택
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  로컬 파일을 선택하여 업로드합니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

