'use client'

import React, { useEffect, useCallback } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection, 
  LexicalEditor,
  $createParagraphNode,
  $createTextNode
} from 'lexical'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table'

import { cn } from '@/lib/utils'
import { Bold, Italic, Underline, List, ListOrdered, Link, Code, Quote, Heading1, Heading2, Heading3, Image, Table, Trash2 } from 'lucide-react'





interface LexicalEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
}

// 에디터 툴바 컴포넌트
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext()

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (format === 'bold') {
          selection.formatText('bold')
        } else if (format === 'italic') {
          selection.formatText('italic')
        } else if (format === 'underline') {
          selection.formatText('underline')
        }
      }
    })
  }

  const insertHeading = (level: 1 | 2 | 3) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const headingText = `제목 ${level}`
        const textNode = $createTextNode(headingText)
        selection.insertNodes([textNode])
      }
    })
  }

    const insertList = (ordered: boolean) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        // 간단한 목록 삽입 구현
        const listText = ordered ? '1. ' : '• '
        const textNode = $createTextNode(listText)
        selection.insertNodes([textNode])
      }
    })
  }

  const insertLink = () => {
    const url = prompt('링크 URL을 입력하세요:')
    if (url) {
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const linkText = `[${url}](${url})`
          const textNode = $createTextNode(linkText)
          selection.insertNodes([textNode])
        }
      })
    }
  }

  const insertCode = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const codeText = '`코드`'
        const textNode = $createTextNode(codeText)
        selection.insertNodes([textNode])
      }
    })
  }

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        const quoteText = '> 인용구'
        const textNode = $createTextNode(quoteText)
        selection.insertNodes([textNode])
      }
    })
  }

  const insertImage = () => {
    const src = prompt('이미지 URL을 입력하세요:')
    if (src) {
      const alt = prompt('이미지 대체 텍스트를 입력하세요 (선택사항):') || '이미지'
      const width = prompt('이미지 너비를 입력하세요 (선택사항):') || '400'
      const height = prompt('이미지 높이를 입력하세요 (선택사항):') || '300'
      
      editor.update(() => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          // 이미지를 실제 HTML로 삽입
          const imageHtml = `<img src="${src}" alt="${alt}" width="${width}" height="${height}" class="max-w-full h-auto rounded-lg shadow-md border border-gray-200" />`
          const textNode = $createTextNode(imageHtml)
          selection.insertNodes([textNode])
        }
      })
    }
  }

  const insertTable = () => {
    const rows = prompt('테이블 행 수를 입력하세요 (기본값: 3):') || '3'
    const cols = prompt('테이블 열 수를 입력하세요 (기본값: 3):') || '3'
    
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        let tableText = '\n'
        for (let i = 0; i < parseInt(rows); i++) {
          if (i === 1) {
            // 헤더 구분선
            tableText += '|' + '---|'.repeat(parseInt(cols)) + '\n'
          }
          tableText += '|' + ' 셀 |'.repeat(parseInt(cols)) + '\n'
        }
        const textNode = $createTextNode(tableText)
        selection.insertNodes([textNode])
      }
    })
  }

  const clearEditor = () => {
    if (confirm('에디터의 모든 내용을 지우시겠습니까?')) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const paragraph = $createParagraphNode()
        root.append(paragraph)
      })
    }
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
      <button
        onClick={() => formatText('bold')}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="굵게"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => formatText('italic')}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="기울임"
      >
        <Italic className="h-4 w-4" />
      </button>
      <button
        onClick={() => formatText('underline')}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="밑줄"
      >
        <Underline className="h-4 w-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-2" />
      
      <button
        onClick={() => insertHeading(1)}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="제목 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        onClick={() => insertHeading(2)}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="제목 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => insertHeading(3)}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="제목 3"
      >
        <Heading3 className="h-4 w-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-2" />
      
      <button
        onClick={() => insertList(false)}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="글머리 기호 목록"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => insertList(true)}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="번호 매기기 목록"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-2" />
      
      <button
        onClick={insertLink}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="링크 삽입"
      >
        <Link className="h-4 w-4" />
      </button>
      <button
        onClick={insertCode}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="코드 블록"
      >
        <Code className="h-4 w-4" />
      </button>
      <button
        onClick={insertQuote}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="인용구"
      >
        <Quote className="h-4 w-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-2" />
      
      <button
        onClick={insertImage}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="이미지 삽입"
      >
        <Image className="h-4 w-4" />
      </button>
      
      <button
        onClick={insertTable}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="테이블 삽입"
      >
        <Table className="h-4 w-4" />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-2" />
      
      <button
        onClick={clearEditor}
        className="p-2 hover:bg-gray-200 rounded transition-colors text-red-600"
        title="에디터 내용 지우기"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}



// 간단한 ErrorBoundary 컴포넌트
function SimpleErrorBoundary({ children }: { children: React.ReactElement }) {
  return children
}

// 에디터 플러그인
function EditorPlugin({ onChange, initialValue }: { onChange: (value: string) => void; initialValue?: string }) {
  const [editor] = useLexicalComposerContext()
  const [isInitialized, setIsInitialized] = React.useState(false)
  const lastValueRef = React.useRef<string>('')

  // 초기값 설정 (한 번만 로드)
  useEffect(() => {
    if (initialValue !== undefined && !isInitialized) {
      console.log('EditorPlugin: 초기값 설정:', initialValue.substring(0, 100) + '...')
      
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        
        // 빈 값이거나 null인 경우 빈 단락 노드 생성
        if (!initialValue || initialValue.trim() === '') {
          console.log('EditorPlugin: 빈 값 처리')
          const paragraph = $createParagraphNode()
          root.append(paragraph)
        }
        // HTML이 포함된 경우 파싱
        else if (initialValue.includes('<')) {
          console.log('EditorPlugin: HTML 파싱 시작')
          parseHtmlToLexicalInContext(initialValue)
        } else {
          console.log('EditorPlugin: 일반 텍스트 처리')
          // 일반 텍스트인 경우
          const paragraph = $createParagraphNode()
          const textNode = $createTextNode(initialValue)
          paragraph.append(textNode)
          root.append(paragraph)
        }
      })
      
      setIsInitialized(true)
      lastValueRef.current = initialValue
    }
  }, [editor, initialValue, isInitialized])

  // 클립보드 이벤트 처리 (복사된 HTML을 제대로 인식)
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData
      if (!clipboardData) return

      // HTML 데이터가 있는지 확인
      const htmlData = clipboardData.getData('text/html')
      if (htmlData) {
        event.preventDefault()
        
        editor.update(() => {
          // HTML을 파싱하여 에디터에 삽입
          parseHtmlToLexicalInContext(htmlData)
        })
        return
      }

      // 일반 텍스트 데이터
      const textData = clipboardData.getData('text/plain')
      if (textData) {
        // 기본 붙여넣기 동작 허용
        return
      }
    }

    // 에디터에 클립보드 이벤트 리스너 추가
    const rootElement = editor.getRootElement()
    if (rootElement) {
      rootElement.addEventListener('paste', handlePaste)
    }

    return () => {
      if (rootElement) {
        rootElement.removeEventListener('paste', handlePaste)
      }
    }
  }, [editor])

  // debounce된 onChange 콜백
  const debouncedOnChange = useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      onChange(value)
    }, 300) // 300ms debounce
    
    return () => clearTimeout(timeoutId)
  }, [onChange])

  // Lexical 개발 문서에 따른 올바른 업데이트 리스너 (무한 루프 방지 + debounce)
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      // 에디터 상태가 업데이트될 때마다 HTML로 변환하여 onChange 콜백 호출
      editorState.read(() => {
        const root = $getRoot()
        const htmlString = $generateHtmlFromNodes(editor, root)
        
        // 무한 루프 방지: 값이 실제로 변경된 경우에만 onChange 호출
        if (htmlString !== lastValueRef.current) {
          lastValueRef.current = htmlString
          debouncedOnChange(htmlString)
        }
      })
    })
  }, [editor, debouncedOnChange])

  return null
}

// HTML 생성 함수 (간단하고 안전한 구현)
function $generateHtmlFromNodes(editor: LexicalEditor, root: unknown): string {
  let html = ''
  
  try {
    if (root && typeof root === 'object' && 'getChildren' in root) {
      const children = (root as { getChildren(): unknown[] }).getChildren()
      
      children.forEach((child: unknown) => {
        if (child && typeof child === 'object' && 'getType' in child) {
          const childType = (child as { getType(): string }).getType()
          
          // 모든 노드 타입을 안전하게 처리
          switch (childType) {
            case 'paragraph':
            case 'heading':
            case 'list':
            case 'quote':
            case 'code':
              // 기본 태그로 감싸기
              const tagMap: Record<string, string> = {
                'paragraph': 'p',
                'heading': 'h1',
                'list': 'ul',
                'quote': 'blockquote',
                'code': 'code'
              }
              const tag = tagMap[childType] || 'div'
              html += `<${tag}>`
              
              // 텍스트 내용 추출 (안전하게)
              if ('getChildren' in child) {
                const textNodes = (child as { getChildren(): unknown[] }).getChildren()
                textNodes.forEach((textNode: unknown) => {
                  if (textNode && typeof textNode === 'object' && 'getTextContent' in textNode) {
                    const text = (textNode as { getTextContent(): string }).getTextContent()
                    html += text
                  }
                })
              }
              
              html += `</${tag}>`
              break
              
            default:
              // 알 수 없는 노드 타입은 텍스트로 처리
              if ('getTextContent' in child) {
                const text = (child as { getTextContent(): string }).getTextContent()
                html += text
              }
              break
          }
        }
      })
    }
  } catch (error) {
    console.error('HTML 생성 중 오류:', error)
    return ''
  }
  
  return html
}

// HTML을 Lexical 노드로 파싱하는 함수 (Lexical 컨텍스트 내에서 실행)
function parseHtmlToLexicalInContext(html: string): void {
  console.log('parseHtmlToLexicalInContext: HTML 파싱 시작:', html.substring(0, 100) + '...')
  console.log('parseHtmlToLexicalInContext: 전체 HTML 길이:', html.length)
  
  // HTML 전처리: 빈 태그 정리 및 구조 개선
  const processedHtml = html
    .replace(/<p><\/p>/g, '<p><br></p>') // 빈 p 태그를 br로 변환
    .replace(/<h1><\/h1>/g, '<h1><br></h1>') // 빈 h1 태그를 br로 변환
    .replace(/<ul>([^<]*)<\/ul>/g, (match, content) => {
      // ul 태그 내부에 li가 없는 경우 li로 감싸기
      if (!content.includes('<li>')) {
        const lines = content.split('\n').filter((line: string) => line.trim())
        const liItems = lines.map((line: string) => `<li>${line.trim()}</li>`).join('')
        return `<ul>${liItems}</ul>`
      }
      return match
    })
  
  console.log('parseHtmlToLexicalInContext: 전처리된 HTML:', processedHtml.substring(0, 200) + '...')
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(processedHtml, 'text/html')
  
  // 루트 노드 가져오기
  const root = $getRoot()
  
  // HTML을 파싱하여 Lexical 노드로 변환
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text.trim()) {
        // 텍스트 노드는 단락 노드 안에 삽입
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode(text)
        paragraph.append(textNode)
        root.append(paragraph)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()
      
      switch (tagName) {
        case 'p':
          // 단락 노드 생성
          const paragraph = $createParagraphNode()
          
          // 자식 노드들을 처리 (모든 타입의 노드 처리)
          let hasContent = false
          Array.from(element.childNodes).forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
              const text = child.textContent || ''
              if (text.trim()) {
                const textNode = $createTextNode(text)
                paragraph.append(textNode)
                hasContent = true
              }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              // 중첩된 요소 노드도 처리
              const childElement = child as Element
              const childTagName = childElement.tagName.toLowerCase()
              
              if (childTagName === 'br') {
                // 줄바꿈 처리
                const lineBreak = $createTextNode('\n')
                paragraph.append(lineBreak)
                hasContent = true
              } else if (childTagName === 'strong' || childTagName === 'b') {
                // 굵은 텍스트 처리
                const boldText = childElement.textContent || ''
                if (boldText.trim()) {
                  const textNode = $createTextNode(`**${boldText}**`)
                  paragraph.append(textNode)
                  hasContent = true
                }
              } else if (childTagName === 'em' || childTagName === 'i') {
                // 기울임 텍스트 처리
                const italicText = childElement.textContent || ''
                if (italicText.trim()) {
                  const textNode = $createTextNode(`*${italicText}*`)
                  paragraph.append(textNode)
                  hasContent = true
                }
              } else if (childTagName === 'a') {
                // 링크 처리
                const link = childElement as HTMLAnchorElement
                const linkText = childElement.textContent || ''
                const linkHref = link.href || ''
                if (linkText && linkHref) {
                  const linkMarkdown = `[${linkText}](${linkHref})`
                  const textNode = $createTextNode(linkMarkdown)
                  paragraph.append(textNode)
                  hasContent = true
                }
              } else {
                // 기타 중첩 요소는 텍스트로 처리
                const nestedText = childElement.textContent || ''
                if (nestedText.trim()) {
                  const textNode = $createTextNode(nestedText)
                  paragraph.append(textNode)
                  hasContent = true
                }
              }
            }
          })
          
          // 내용이 있는 경우에만 루트에 추가
          // 빈 p 태그는 줄바꿈으로 처리하여 구조 유지
          if (hasContent) {
            root.append(paragraph)
          } else {
            // 빈 p 태그는 줄바꿈으로 처리
            const emptyParagraph = $createParagraphNode()
            root.append(emptyParagraph)
          }
          break
          
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          // 제목 노드 생성 (단락 노드로 처리)
          const headingText = element.textContent || ''
          if (headingText.trim()) {
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(headingText)
            paragraph.append(textNode)
            root.append(paragraph)
          } else {
            // 빈 제목 태그는 줄바꿈으로 처리
            const emptyParagraph = $createParagraphNode()
            root.append(emptyParagraph)
          }
          break
          
        case 'ul':
        case 'ol':
          // 목록 노드 생성 (li 태그가 없는 경우도 처리)
          const listItems = Array.from(element.querySelectorAll('li'))
          
          if (listItems.length > 0) {
            // li 태그가 있는 경우
            listItems.forEach((item, index) => {
              const itemText = item.textContent || ''
              if (itemText.trim()) {
                const listText = tagName === 'ol' ? `${index + 1}. ` : '• '
                const paragraph = $createParagraphNode()
                const textNode = $createTextNode(listText + itemText)
                paragraph.append(textNode)
                root.append(paragraph)
              }
            })
          } else {
            // li 태그가 없는 경우 - 직접 텍스트를 목록으로 처리
            const directText = element.textContent || ''
            if (directText.trim()) {
              // 텍스트를 줄바꿈으로 분리하여 각각을 목록 항목으로 처리
              const lines = directText.split('\n').filter(line => line.trim())
              lines.forEach((line, index) => {
                if (line.trim()) {
                  const listText = tagName === 'ol' ? `${index + 1}. ` : '• '
                  const paragraph = $createParagraphNode()
                  const textNode = $createTextNode(listText + line.trim())
                  paragraph.append(textNode)
                  root.append(paragraph)
                }
              })
            }
          }
          break
          
        case 'li':
          // 목록 항목 (이미 ul/ol에서 처리됨)
          break
          
        case 'blockquote':
          // 인용구 노드 생성 (단락 노드로 처리)
          const quoteText = element.textContent || ''
          if (quoteText.trim()) {
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode('> ' + quoteText)
            paragraph.append(textNode)
            root.append(paragraph)
          }
          break
          
        case 'code':
          // 코드 노드 생성 (단락 노드로 처리)
          const codeText = element.textContent || ''
          if (codeText.trim()) {
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode('`' + codeText + '`')
            paragraph.append(textNode)
            root.append(paragraph)
          }
          break
          
        case 'img':
          // 이미지 노드 생성 - 실제 이미지로 렌더링
          const img = element as HTMLImageElement
          const imgSrc = img.src || img.getAttribute('data-src') || ''
          const imgAlt = img.alt || '이미지'
          const imgWidth = img.width || img.getAttribute('width') || ''
          const imgHeight = img.height || img.getAttribute('height') || ''
          
          if (imgSrc) {
            const paragraph = $createParagraphNode()
            
            // 이미지가 링크 안에 있는지 확인
            const parentLink = img.closest('a')
            if (parentLink) {
              // 링크가 있는 이미지 - 클릭 가능한 이미지로 표시
              const linkHref = parentLink.href || ''
              const imageHtml = `<a href="${linkHref}" target="_blank" rel="noopener noreferrer"><img src="${imgSrc}" alt="${imgAlt}" ${imgWidth ? `width="${imgWidth}"` : ''} ${imgHeight ? `height="${imgHeight}"` : ''} class="max-w-full h-auto rounded-lg shadow-md border border-gray-200 hover:opacity-80 transition-opacity" /></a>`
              const textNode = $createTextNode(imageHtml)
              paragraph.append(textNode)
            } else {
              // 일반 이미지 - 실제 이미지로 표시
              const imageHtml = `<img src="${imgSrc}" alt="${imgAlt}" ${imgWidth ? `width="${imgWidth}"` : ''} ${imgHeight ? `height="${imgHeight}"` : ''} class="max-w-full h-auto rounded-lg shadow-md border border-gray-200" />`
              const textNode = $createTextNode(imageHtml)
              paragraph.append(textNode)
            }
            
            root.append(paragraph)
          }
          break
          
        case 'a':
          // 링크 노드 생성 (이미지가 포함된 링크도 처리)
          const link = element as HTMLAnchorElement
          const linkHref = link.href || ''
          
          if (linkHref) {
            const paragraph = $createParagraphNode()
            
            // 링크 안에 이미지가 있는지 확인
            const imgElement = element.querySelector('img')
            if (imgElement) {
              // 이미지가 포함된 링크: 클릭 가능한 이미지로 표시
              const img = imgElement as HTMLImageElement
              const imgSrc = img.src || img.getAttribute('data-src') || ''
              const imgAlt = img.alt || '이미지'
              const imgWidth = img.width || img.getAttribute('width') || ''
              const imgHeight = img.height || img.getAttribute('height') || ''
              
              if (imgSrc) {
                const imageHtml = `<a href="${linkHref}" target="_blank" rel="noopener noreferrer"><img src="${imgSrc}" alt="${imgAlt}" ${imgWidth ? `width="${imgWidth}"` : ''} ${imgHeight ? `height="${imgHeight}"` : ''} class="max-w-full h-auto rounded-lg shadow-md border border-gray-200 hover:opacity-80 transition-opacity" /></a>`
                const textNode = $createTextNode(imageHtml)
                paragraph.append(textNode)
              } else {
                const linkText = `[이미지 링크](${linkHref})`
                const textNode = $createTextNode(linkText)
                paragraph.append(textNode)
              }
            } else {
              // 일반 링크: 텍스트 링크로 표시
              const linkText = element.textContent || ''
              if (linkText.trim()) {
                const linkMarkdown = `[${linkText}](${linkHref})`
                const textNode = $createTextNode(linkMarkdown)
                paragraph.append(textNode)
              } else {
                // 링크 텍스트가 없는 경우 URL만 표시
                const linkMarkdown = `[${linkHref}](${linkHref})`
                const textNode = $createTextNode(linkMarkdown)
                paragraph.append(textNode)
              }
            }
            
            root.append(paragraph)
          }
          break
          
        case 'strong':
        case 'b':
          // 굵은 텍스트 (단락 노드로 처리)
          const boldText = element.textContent || ''
          if (boldText.trim()) {
            const boldMarkdown = `**${boldText}**`
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(boldMarkdown)
            paragraph.append(textNode)
            root.append(paragraph)
          }
          break
          
        case 'em':
        case 'i':
          // 기울임 텍스트 (단락 노드로 처리)
          const italicText = element.textContent || ''
          if (italicText.trim()) {
            const italicMarkdown = `*${italicText}*`
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(italicMarkdown)
            paragraph.append(textNode)
            root.append(paragraph)
          }
          break
          
        case 'br':
          // 줄바꿈 처리 (빈 단락 노드로 처리)
          const emptyParagraph = $createParagraphNode()
          root.append(emptyParagraph)
          break
          
        case 'span':
          // span 태그는 텍스트 내용을 추출하여 처리
          const spanText = element.textContent || ''
          if (spanText.trim()) {
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(spanText)
            paragraph.append(textNode)
            root.append(paragraph)
          }
          break
          
        case 'div':
          // div 태그는 자식 노드들을 처리
          // 이미지와 링크가 포함된 복잡한 구조 처리
          const hasImage = element.querySelector('img')
          const hasLink = element.querySelector('a')
          const hasComplexContent = element.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote')
          
          if (hasImage || hasLink || hasComplexContent) {
            // 복잡한 콘텐츠가 포함된 div는 특별 처리
            Array.from(element.childNodes).forEach(child => {
              processNode(child)
            })
          } else {
            // 일반 div는 자식 노드들을 처리
            // div 안에 직접 텍스트가 있는 경우도 처리
            const directText = element.textContent || ''
            if (directText.trim()) {
              const paragraph = $createParagraphNode()
              const textNode = $createTextNode(directText)
              paragraph.append(textNode)
              root.append(paragraph)
            }
            
            // 자식 노드들도 처리
            Array.from(element.childNodes).forEach(child => {
              processNode(child)
            })
          }
          break
          
        default:
          // 기타 태그는 자식 노드들을 재귀적으로 처리
          Array.from(element.childNodes).forEach(child => {
            processNode(child)
          })
          break
      }
    }
  }
  
  // 문서의 body 내용을 처리
  const body = doc.body
  if (body && body.childNodes.length > 0) {
    console.log('parseHtmlToLexicalInContext: body 자식 노드 수:', body.childNodes.length)
    Array.from(body.childNodes).forEach(child => {
      processNode(child)
    })
  } else {
    // body가 비어있거나 없는 경우 HTML 문자열을 직접 텍스트로 처리
    console.log('parseHtmlToLexicalInContext: body가 비어있음, 직접 텍스트로 처리')
    const paragraph = $createParagraphNode()
    const textNode = $createTextNode(html)
    paragraph.append(textNode)
    root.append(paragraph)
  }
  
  // 파싱 완료 후 루트 노드의 자식 수 로그
  const finalRootChildren = root.getChildren()
  console.log('parseHtmlToLexicalInContext: 파싱 완료, 루트 노드 자식 수:', finalRootChildren.length)
}

// Lexical 에디터 메인 컴포넌트
export default function LexicalEditorComponent({
  value,
  onChange,
  placeholder = "내용을 입력하세요...",
  className,
  readOnly = false
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'HotelContentEditor',
    nodes: [LinkNode, ListNode, ListItemNode, HeadingNode, QuoteNode, CodeNode, CodeHighlightNode, TableNode, TableCellNode, TableRowNode],
    theme: {
      root: 'outline-none',
      link: 'text-blue-600 underline',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        underlineStrikethrough: 'underline line-through',
      },
      list: {
        ul: 'list-disc ml-4',
        ol: 'list-decimal ml-4',
        listitem: 'mb-1',
      },
              code: 'bg-gray-100 p-1 rounded font-mono text-sm',
        quote: 'border-l-4 border-gray-300 pl-4 italic text-gray-600',
        table: 'border-collapse border border-gray-300',
        tableCell: 'border border-gray-300 p-2',
        tableRow: 'border border-gray-300',
    },
    onError: (error: Error) => {
      console.error('Lexical 에디터 오류:', error)
    },
  }

  return (
    <div className={cn("border border-gray-300 rounded-md overflow-hidden", className)}>
      <LexicalComposer initialConfig={initialConfig}>
        {!readOnly && <ToolbarPlugin />}
        <div className="relative overflow-hidden">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "min-h-[300px] p-4 outline-none overflow-y-auto",
                  "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
                  "will-change-auto transform-gpu", // GPU 가속 활성화
                  readOnly && "bg-gray-50 cursor-not-allowed"
                )}
                readOnly={readOnly}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={SimpleErrorBoundary}
          />
          <HistoryPlugin />
          <AutoFocusPlugin />
          <EditorPlugin onChange={onChange} initialValue={value} />
        </div>
      </LexicalComposer>
    </div>
  )
}