/**
 * Quill 에디터 공통 설정
 * 
 * 사용법:
 * import { quillFormats, createQuillModules } from '@/lib/quill-config'
 * const modules = createQuillModules(imageUploadHandler, clipboardImageHandler)
 */

export const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'indent',
  'align',
  'link', 'image',
  'blockquote', 'code-block'
]

/**
 * base64 데이터 URI를 Blob으로 변환
 */
export function dataURItoBlob(dataURI: string): Blob | null {
  try {
    const byteString = atob(dataURI.split(',')[1])
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  } catch (e) {
    console.error('dataURItoBlob 변환 오류:', e)
    return null
  }
}

export const createQuillModules = (
  imageHandler: () => void, 
  clipboardImageHandler?: (file: File) => Promise<void>
) => ({
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    handlers: {
      image: imageHandler
    }
  },
  clipboard: {
    matchVisual: false,
    matchers: clipboardImageHandler ? [
      ['IMG', (node: HTMLElement, delta: any) => {
        const src = node.getAttribute('src')
        if (src && src.startsWith('data:image/')) {
          // base64 이미지를 파일로 변환하여 업로드
          const blob = dataURItoBlob(src)
          if (blob) {
            const timestamp = Date.now()
            const extension = blob.type.split('/')[1] || 'png'
            const file = new File([blob], `pasted-image-${timestamp}.${extension}`, { type: blob.type })
            
            // 비동기 업로드 실행
            clipboardImageHandler(file).catch(err => {
              console.error('클립보드 이미지 업로드 오류:', err)
            })
          }
          // base64 이미지는 삽입하지 않음 (업로드 후 URL로 삽입됨)
          return new (delta.constructor)()
        }
        return delta
      }]
    ] : []
  }
})

export const EDITOR_HEIGHTS = {
  small: '390px',
  medium: '585px',
  large: '780px'
} as const

export type EditorHeight = keyof typeof EDITOR_HEIGHTS

