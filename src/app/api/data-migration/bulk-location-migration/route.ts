import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractLocationFromAddress } from '@/lib/openai-location-extractor'

export async function POST(_request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient()

        // property_address가 있는 모든 호텔 조회
        const { data: hotels, error: fetchError } = await supabase
          .from('select_hotels')
          .select('sabre_id, property_name_ko, property_address')
          .not('property_address', 'is', null)
          .neq('property_address', '')
          .order('sabre_id')

        if (fetchError || !hotels) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: '호텔 목록 조회 실패'
          })}\n\n`))
          controller.close()
          return
        }

        const total = hotels.length
        let processed = 0
        let success = 0
        let failed = 0

        console.log(`총 ${total}개 호텔 위치 정보 마이그레이션 시작`)

        for (const hotel of hotels) {
          const sabreId = hotel.sabre_id as string
          const propertyNameKo = hotel.property_name_ko as string
          const propertyAddress = hotel.property_address as string

          try {
            // OpenAI로 위치 정보 추출
            const locationInfo = await extractLocationFromAddress(propertyAddress)

            if (locationInfo) {
              // DB 업데이트
              const { error: updateError } = await supabase
                .from('select_hotels')
                .update({
                  city_ko: locationInfo.city_ko,
                  city_en: locationInfo.city_en,
                  country_ko: locationInfo.country_ko,
                  country_en: locationInfo.country_en,
                  continent_ko: locationInfo.continent_ko,
                  continent_en: locationInfo.continent_en
                })
                .eq('sabre_id', sabreId)

              if (updateError) {
                console.error(`${sabreId} 업데이트 실패:`, updateError)
                failed++
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'error',
                  sabreId,
                  error: 'DB 업데이트 실패'
                })}\n\n`))
              } else {
                success++
                console.log(`${sabreId} (${propertyNameKo}) 성공: ${locationInfo.city_ko}, ${locationInfo.country_ko}`)
              }
            } else {
              failed++
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                sabreId,
                error: '위치 정보 추출 실패'
              })}\n\n`))
            }
          } catch (error) {
            failed++
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
            console.error(`${sabreId} 처리 오류:`, error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              sabreId,
              error: errorMessage
            })}\n\n`))
          }

          processed++

          // 진행 상황 전송
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'progress',
            total,
            processed,
            success,
            failed,
            currentHotel: `${sabreId} - ${propertyNameKo}`
          })}\n\n`))

          // API Rate Limit 방지를 위한 딜레이 (OpenAI API)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // 완료 메시지 전송
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          total,
          success,
          failed
        })}\n\n`))

        console.log(`마이그레이션 완료: 성공 ${success}개, 실패 ${failed}개`)
        controller.close()
      } catch (error) {
        console.error('일괄 마이그레이션 오류:', error)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

