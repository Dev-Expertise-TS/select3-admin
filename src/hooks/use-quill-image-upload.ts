import { useRef, useCallback, useState } from 'react'

interface UseQuillImageUploadOptions {
  sabreId?: string
  onError?: (error: string) => void
}

export function useQuillImageUpload({ sabreId, onError }: UseQuillImageUploadOptions = {}) {
  const quillRef = useRef<any>(null)
  const [showImageDialog, setShowImageDialog] = useState(false)

  // 파일로 업로드
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    if (sabreId) {
      formData.append('sabreId', sabreId)
    }

    try {
      const response = await fetch('/api/hotel/content/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        const quill = quillRef.current?.getEditor?.()
        if (quill) {
          const range = quill.getSelection(true) || { index: quill.getLength() }
          quill.insertEmbed(range.index, 'image', result.data.url)
          quill.setSelection(range.index + 1)
        }
      } else {
        const errorMsg = result.error || '이미지 업로드에 실패했습니다.'
        if (onError) {
          onError(errorMsg)
        } else {
          alert(errorMsg)
        }
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      const errorMsg = '이미지 업로드 중 오류가 발생했습니다.'
      if (onError) {
        onError(errorMsg)
      } else {
        alert(errorMsg)
      }
    }
  }, [sabreId, onError, quillRef])

  // URL로 업로드
  const uploadUrl = useCallback(async (url: string) => {
    try {
      const response = await fetch('/api/hotel/content/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: url,
          sabreId: sabreId || undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        const quill = quillRef.current?.getEditor?.()
        if (quill) {
          const range = quill.getSelection(true) || { index: quill.getLength() }
          quill.insertEmbed(range.index, 'image', result.data.url)
          quill.setSelection(range.index + 1)
        }
      } else {
        const errorMsg = result.error || '이미지 업로드에 실패했습니다.'
        if (onError) {
          onError(errorMsg)
        } else {
          alert(errorMsg)
        }
      }
    } catch (err) {
      console.error('이미지 업로드 오류:', err)
      const errorMsg = '이미지 업로드 중 오류가 발생했습니다.'
      if (onError) {
        onError(errorMsg)
      } else {
        alert(errorMsg)
      }
    }
  }, [sabreId, onError, quillRef])

  const handleImageUpload = useCallback(() => {
    setShowImageDialog(true)
  }, [])

  return {
    quillRef,
    handleImageUpload,
    showImageDialog,
    setShowImageDialog,
    uploadFile,
    uploadUrl
  }
}

