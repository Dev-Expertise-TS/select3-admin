import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI, DEFAULT_CONFIG } from '@/config/openai'

interface SearchAddressRequest {
  hotelNameEn: string
}

interface SearchAddressResponse {
  success: boolean
  data?: {
    address: string
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchAddressRequest = await request.json()
    
    if (!body.hotelNameEn || typeof body.hotelNameEn !== 'string') {
      return NextResponse.json<SearchAddressResponse>(
        { success: false, error: '호텔 영문명이 필요합니다.' },
        { status: 400 }
      )
    }

    const hotelNameEn = body.hotelNameEn.trim()
    if (hotelNameEn.length < 2) {
      return NextResponse.json<SearchAddressResponse>(
        { success: false, error: '호텔 영문명은 최소 2글자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json<SearchAddressResponse>(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const systemMessage = `You are a helpful assistant that finds the official address of hotels from their official websites. 
When given a hotel name in English, search for the hotel's official website and extract the complete official address in English as it appears on their website.
Return only the address text, without any additional explanation or formatting.`

    const userMessage = `Find the official address of this hotel from their official website: "${hotelNameEn}"
Return only the complete official address in English as it appears on the hotel's official website.`

    try {
      const response = await callOpenAI({
        apiKey,
        systemMessage,
        userMessage,
        config: {
          ...DEFAULT_CONFIG,
          model: 'gpt-5.2',
          temperature: 0.3,
          maxTokens: 200,
          responseFormat: { type: 'text' }, // 텍스트 형식으로 반환
        },
        enableWebSearch: true, // 웹 검색 활성화
      })

      const address = response.content.trim()
      
      if (!address || address.length === 0) {
        return NextResponse.json<SearchAddressResponse>(
          { success: false, error: '주소를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      return NextResponse.json<SearchAddressResponse>({
        success: true,
        data: {
          address,
        },
      })
    } catch (error) {
      console.error('[search-address] OpenAI API 오류:', error)
      return NextResponse.json<SearchAddressResponse>(
        {
          success: false,
          error: error instanceof Error ? error.message : '주소 검색 중 오류가 발생했습니다.',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[search-address] 요청 처리 오류:', error)
    return NextResponse.json<SearchAddressResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}

