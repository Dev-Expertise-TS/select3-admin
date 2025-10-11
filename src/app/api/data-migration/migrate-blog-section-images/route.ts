import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = createServiceRoleClient()

        // 1. 모든 블로그 레코드 조회 (섹션 컬럼들 포함)
        const { data: blogs, error: fetchError } = await supabase
          .from('select_hotel_blogs')
          .select('id, s1_contents, s2_contents, s3_contents, s4_contents, s5_contents, s6_contents, s7_contents, s8_contents, s9_contents, s10_contents, s11_contents, s12_contents')

        if (fetchError) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: `블로그 데이터 조회 실패: ${fetchError.message}` 
          })}\n\n`))
          controller.close()
          return
        }

        if (!blogs || blogs.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            total: 0, 
            processed: 0,
            imagesReplaced: 0,
            failed: 0 
          })}\n\n`))
          controller.close()
          return
        }

        const total = blogs.length
        let processed = 0
        let totalImagesReplaced = 0
        let failed = 0

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'init', 
          total 
        })}\n\n`))

        // 2. 각 블로그의 섹션 이미지 마이그레이션
        for (let i = 0; i < blogs.length; i++) {
          const blog = blogs[i]
          const { id } = blog

          try {
            const sectionColumns = ['s1_contents', 's2_contents', 's3_contents', 's4_contents', 's5_contents', 's6_contents', 's7_contents', 's8_contents', 's9_contents', 's10_contents', 's11_contents', 's12_contents']
            const updates: Record<string, string> = {}
            let blogImagesReplaced = 0

            // 각 섹션 컬럼 처리
            for (const column of sectionColumns) {
              const content = blog[column as keyof typeof blog] as string | null
              
              if (!content) continue

              // framerusercontent.com URL 찾기 (정규식)
              const urlRegex = /https:\/\/framerusercontent\.com\/[^\s"')]+/g
              const urls = content.match(urlRegex)

              if (!urls || urls.length === 0) continue

              let updatedContent = content
              
              // 각 URL 처리
              for (const imageUrl of urls) {
                try {
                  // 이미지 다운로드
                  const imageResponse = await fetch(imageUrl)
                  if (!imageResponse.ok) {
                    console.error(`이미지 다운로드 실패 (Blog ${id}, ${column}): ${imageUrl}`)
                    continue
                  }

                  const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())
                  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

                  // 파일명 생성
                  const timestamp = Date.now()
                  const inferredExt = (() => {
                    if (contentType.includes('png')) return 'png'
                    if (contentType.includes('webp')) return 'webp'
                    if (contentType.includes('avif')) return 'avif'
                    if (contentType.includes('gif')) return 'gif'
                    return 'jpg'
                  })()

                  const fileName = `blog-${id}-section-${column}-${timestamp}.${inferredExt}`

                  // Storage 경로
                  const storagePath = `blog/${id}/${fileName}`

                  // Supabase Storage에 업로드
                  const { error: uploadError } = await supabase.storage
                    .from('hotel-media')
                    .upload(storagePath, imageBuffer, {
                      contentType: contentType,
                      upsert: false
                    })

                  if (uploadError) {
                    console.error(`Storage 업로드 실패 (Blog ${id}, ${column}): ${uploadError.message}`)
                    continue
                  }

                  // Public URL 생성
                  const { data: publicUrlData } = supabase.storage
                    .from('hotel-media')
                    .getPublicUrl(storagePath)

                  // 원본 URL을 새 URL로 교체
                  updatedContent = updatedContent.replace(imageUrl, publicUrlData.publicUrl)
                  blogImagesReplaced++
                  totalImagesReplaced++

                  // 약간의 지연 추가 (API rate limit 방지)
                  await new Promise(resolve => setTimeout(resolve, 100))

                } catch (urlError) {
                  console.error(`URL 처리 오류 (Blog ${id}, ${column}): ${urlError}`)
                  continue
                }
              }

              // 컬럼이 업데이트되었으면 updates에 추가
              if (updatedContent !== content) {
                updates[column] = updatedContent
              }
            }

            // 업데이트할 내용이 있으면 DB 업데이트
            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from('select_hotel_blogs')
                .update(updates)
                .eq('id', id)

              if (updateError) {
                failed++
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'progress', 
                  current: i + 1, 
                  total, 
                  blogId: id,
                  status: 'failed',
                  message: `DB 업데이트 실패: ${updateError.message}`,
                  processed,
                  imagesReplaced: totalImagesReplaced,
                  failed
                })}\n\n`))
              } else {
                processed++
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'progress', 
                  current: i + 1, 
                  total, 
                  blogId: id,
                  status: 'success',
                  message: `${blogImagesReplaced}개 이미지 교체됨`,
                  processed,
                  imagesReplaced: totalImagesReplaced,
                  failed
                })}\n\n`))
              }
            } else {
              // 이미지가 없으면 건너뜀
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                blogId: id,
                status: 'skipped',
                message: 'framerusercontent.com 이미지 없음',
                processed,
                imagesReplaced: totalImagesReplaced,
                failed
              })}\n\n`))
            }

          } catch (error) {
            failed++
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              blogId: id,
              status: 'failed',
              message: errorMessage,
              processed,
              imagesReplaced: totalImagesReplaced,
              failed
            })}\n\n`))
          }
        }

        // 완료 메시지
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete', 
          total,
          processed,
          imagesReplaced: totalImagesReplaced,
          failed
        })}\n\n`))

        controller.close()

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          error: errorMessage 
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

