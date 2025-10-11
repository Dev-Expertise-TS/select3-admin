/**
 * Quill 에디터 공통 설정
 * 
 * 사용법:
 * import { quillFormats, createQuillModules } from '@/lib/quill-config'
 * const modules = createQuillModules(imageUploadHandler)
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

export const createQuillModules = (imageHandler: () => void) => ({
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
  }
})

export const EDITOR_HEIGHTS = {
  small: '390px',
  medium: '585px',
  large: '780px'
} as const

export type EditorHeight = keyof typeof EDITOR_HEIGHTS

