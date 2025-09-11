import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sabreId = searchParams.get('sabre_id')
    
    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID가 필요합니다' },
        { status: 400 }
      )
    }

    try {
      // 요금 코드 관리 페이지와 동일한 방식으로 Sabre API 호출
      console.log('Sabre Hotel Details API 호출 시작:', sabreId)
      
      // 오늘 날짜로부터 14일 후와 16일 후 계산
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 14)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 16)
      
      // YYYY-MM-DD 형식으로 변환
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0]
      }
      
      const requestBody = {
        HotelCode: sabreId,
        CurrencyCode: 'KRW',
        StartDate: formatDate(startDate),
        EndDate: formatDate(endDate),
        Adults: 2
      }
      
      console.log('API 요청 파라미터:', requestBody)

      const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Sabre API 응답 상태:', response.status, response.statusText)

      // 응답을 먼저 텍스트로 받기
      const responseText = await response.text()
      console.log('Sabre API 응답 텍스트:', responseText.slice(0, 500))
      
      let hotelData: any = null
      
      try {
        // JSON 파싱 시도
        const result = JSON.parse(responseText)
        console.log('Sabre API 응답 파싱 성공:', JSON.stringify(result, null, 2))
        
        // 응답에서 호텔 정보 추출 (실제 Sabre API 응답 구조에 맞게)
        if (result.GetHotelDetailsRS?.HotelDetailsInfo?.HotelInfo) {
          hotelData = result.GetHotelDetailsRS.HotelDetailsInfo.HotelInfo
        } else if (result.HotelDetailsInfo?.HotelInfo) {
          hotelData = result.HotelDetailsInfo.HotelInfo
        } else if (result.HotelInfo) {
          hotelData = result.HotelInfo
        } else if (result.HotelDetails) {
          hotelData = result.HotelDetails
        } else if (result.hotel) {
          hotelData = result.hotel
        } else if (result) {
          // 응답 자체가 호텔 정보인 경우
          hotelData = result
        }
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError)
        // JSON 파싱 실패시에도 데모 데이터 반환
      }

      if (!hotelData) {
        // API 응답에서 호텔 정보를 찾을 수 없는 경우 데모 데이터 반환
        const demoData = {
          HotelCode: sabreId,
          CodeContext: 'GLOBAL',
          HotelName: `Demo Hotel ${sabreId}`,
          ChainCode: 'DEM',
          ChainName: 'Demo Chain',
          BrandCode: '99999',
          BrandName: 'Demo Brand',
          SabreRating: '4.5',
          SabreHotelCode: sabreId
        }

        return NextResponse.json(
          { 
            success: true, 
            data: {
              HotelDetailsInfo: {
                HotelInfo: demoData
              }
            },
            error: 'Sabre API에서 호텔 정보를 찾을 수 없어 데모 데이터를 반환합니다.'
          },
          { status: 200 }
        )
      }

      // 성공 응답
      return NextResponse.json(
        { 
          success: true, 
          data: {
            HotelDetailsInfo: {
              HotelInfo: hotelData
            }
          }
        },
        { status: 200 }
      )

    } catch (sabreError) {
      console.error('Sabre API 호출 오류:', sabreError)
      
      // Sabre API 실패 시에도 데모 데이터 반환
      const demoData = {
        HotelCode: sabreId,
        CodeContext: 'GLOBAL',
        HotelName: `Demo Hotel ${sabreId}`,
        ChainCode: 'DEM',
        ChainName: 'Demo Chain',
        BrandCode: '99999',
        BrandName: 'Demo Brand',
        SabreRating: '4.5',
        SabreHotelCode: sabreId
      }

      return NextResponse.json(
        { 
          success: true, 
          data: {
            HotelDetailsInfo: {
              HotelInfo: demoData
            }
          },
          error: `Sabre API 오류: ${sabreError instanceof Error ? sabreError.message : '알 수 없는 오류'}. 데모 데이터를 반환합니다.`
        },
        { status: 200 }
      )
    }

  } catch (error) {
    console.error('호텔 상세 정보 API 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다' 
      },
      { status: 500 }
    )
  }
}
