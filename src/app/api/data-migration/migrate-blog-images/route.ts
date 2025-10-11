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

        // 1. 모든 블로그 레코드 조회 (main_image가 있는 것만)
        const { data: blogs, error: fetchError } = await supabase
          .from('select_hotel_blogs')
          .select('id, main_image')
          .not('main_image', 'is', null)

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
            migrated: 0, 
            skipped: 0, 
            failed: 0 
          })}\n\n`))
          controller.close()
          return
        }

        const total = blogs.length
        let migrated = 0
        let skipped = 0
        let failed = 0

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'init', 
          total 
        })}\n\n`))

        // 2. 각 블로그의 main_image 마이그레이션
        for (let i = 0; i < blogs.length; i++) {
          const blog = blogs[i]
          const { id, main_image } = blog

          try {
            // 이미 Storage URL인지 확인 (supabase URL 포함)
            if (!main_image || main_image.includes('supabase.co/storage')) {
              skipped++
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                blogId: id,
                status: 'skipped',
                message: '이미 Storage에 저장됨',
                migrated,
                skipped,
                failed
              })}\n\n`))
              continue
            }

            // 외부 URL에서 이미지 다운로드
            const imageResponse = await fetch(main_image)
            if (!imageResponse.ok) {
              failed++
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                blogId: id,
                status: 'failed',
                message: `이미지 다운로드 실패: ${imageResponse.status}`,
                migrated,
                skipped,
                failed
              })}\n\n`))
              continue
            }

            const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer())
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

            // 파일명 생성 (blogId 사용으로 ASCII 안전)
            const timestamp = Date.now()
            const inferredExt = (() => {
              if (contentType.includes('png')) return 'png'
              if (contentType.includes('webp')) return 'webp'
              if (contentType.includes('avif')) return 'avif'
              if (contentType.includes('gif')) return 'gif'
              return 'jpg'
            })()

            const fileName = `blog-${id}-main-${timestamp}.${inferredExt}`

            // Storage 경로 (blogId만 사용)
            const storagePath = `blog/${id}/${fileName}`

            // Supabase Storage에 업로드
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('hotel-media')
              .upload(storagePath, imageBuffer, {
                contentType: contentType,
                upsert: false
              })

            if (uploadError) {
              failed++
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress', 
                current: i + 1, 
                total, 
                blogId: id,
                status: 'failed',
                message: `Storage 업로드 실패: ${uploadError.message}`,
                migrated,
                skipped,
                failed
              })}\n\n`))
              continue
            }

            // Public URL 생성
            const { data: publicUrlData } = supabase.storage
              .from('hotel-media')
              .getPublicUrl(storagePath)

            // 블로그 레코드 업데이트
            const { error: updateError } = await supabase
              .from('select_hotel_blogs')
              .update({ main_image: publicUrlData.publicUrl })
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
                migrated,
                skipped,
                failed
              })}\n\n`))
              continue
            }

            migrated++
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress', 
              current: i + 1, 
              total, 
              blogId: id,
              status: 'success',
              oldUrl: main_image.substring(0, 50) + '...',
              newUrl: publicUrlData.publicUrl.substring(0, 50) + '...',
              migrated,
              skipped,
              failed
            })}\n\n`))

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
              migrated,
              skipped,
              failed
            })}\n\n`))
          }

          // 약간의 지연 추가 (API rate limit 방지)
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        // 완료 메시지
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete', 
          total,
          migrated,
          skipped,
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

