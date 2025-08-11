import { NextRequest, NextResponse } from 'next/server'

interface SabreHotelSearchRequest {
  hotelName: string
}

interface SabreHotel {
  hotelCode: string
  hotelName: string
  address?: string
  city?: string
  country?: string
}

interface SabreHotelSearchResponse {
  success: boolean
  data?: SabreHotel[]
  error?: string
}

// Sabre REST API 기본 설정
const SABRE_API_BASE_URL = 'https://api.havail.sabre.com'
const SABRE_API_VERSION = 'v4.1.0'

// 공식 Sabre API 인터페이스들
interface SabreHotelListRequest {
  HotelName?: string
  CityName?: string
  CountryCode?: string
  Latitude?: number
  Longitude?: number
  Radius?: number
  RadiusUnit?: string
  Limit?: number
}

interface SabreHotelListResponse {
  HotelListRS?: {
    HotelProperty?: Array<{
      HotelCode?: string
      HotelName?: string
      Address?: {
        AddressLine?: string
        CityName?: string
        CountryCode?: string
        StateCode?: string
        PostalCode?: string
      }
      ContactNumbers?: Array<{
        ContactType?: string
        ContactNumber?: string
      }>
      Latitude?: number
      Longitude?: number
    }>
  }
}

interface SabreHotelDetailsRequest {
  HotelCode: string
}

interface SabreHotelDetailsResponse {
  HotelDetailRS?: {
    HotelDetail?: {
      HotelInfo?: {
        HotelCode?: string
        HotelName?: string
        Address?: {
          AddressLine?: string[]
          CityName?: string
          CountryCode?: string
          StateCode?: string
          PostalCode?: string
        }
        ContactNumbers?: Array<{
          ContactType?: string
          ContactNumber?: string
        }>
      }
      LocationInfo?: {
        Latitude?: number
        Longitude?: number
      }
    }
  }
}

// 공식 Sabre API에서 호텔 목록을 검색하는 함수 (최적화된 버전)
async function searchHotelsByName(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔍 최적화된 호텔 검색: ${hotelName}`)
    
    // 순수 숫자인지 확인 (Sabre Hotel Code 직접 검색)
    const isPureNumeric = /^\d+$/.test(hotelName.trim())
    
    if (isPureNumeric) {
      console.log(`🔢 순수 숫자 검색 모드: Sabre Hotel Code ${hotelName}`)
      // Sabre Hotel Code로 직접 검색 (가장 빠름)
      return await getHotelDetailsByCode(hotelName.trim())
    } else {
      console.log(`📝 호텔명 검색 모드: "${hotelName}"`)
      // 호텔명으로 최적화 검색 (인덱스 활용)
      return await searchHotelsByNameAndGetDetails(hotelName)
    }
    
  } catch (error) {
    console.error('호텔 검색 오류:', error)
    throw new Error('호텔 검색 중 오류가 발생했습니다.')
  }
}

// 특정 Sabre Hotel Code로 호텔 상세 정보 조회
async function getHotelDetailsByCode(hotelCode: string): Promise<SabreHotel[]> {
  try {
    console.log(`📋 Sabre Hotel Code ${hotelCode}로 상세 정보 조회`)
    
    const requestBody = {
      HotelCode: hotelCode,
      CurrencyCode: 'KRW',
      StartDate: new Date().toISOString().split('T')[0],
      EndDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Adults: 2
    }

    const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`호텔 상세 정보 조회 실패: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.GetHotelDetailsRS?.HotelDetailsInfo?.HotelInfo) {
      const hotelInfo = result.GetHotelDetailsRS.HotelDetailsInfo.HotelInfo
      
      return [{
        hotelCode: hotelCode,
        hotelName: hotelInfo.HotelName || 'Unknown Hotel',
        address: extractAddress(hotelInfo),
        city: extractCity(hotelInfo),
        country: extractCountry(hotelInfo)
      }]
    }
    
    return []
  } catch (error) {
    console.error(`호텔 상세 정보 조회 오류 (${hotelCode}):`, error)
    return []
  }
}

// 호텔명-코드 매핑 테이블 (성능 최적화를 위한 인덱스)
const HOTEL_NAME_INDEX: Record<string, string> = {
  // Four Seasons Hotels
  'four seasons hotel sydney': '890',
  'four seasons hotel kyoto': '292823',
  'four seasons resort lanai': '28383',
  'four seasons macao': '24535',
  'four seasons jimbaran bay bali': '33434',
  'four seasons the nam hai': '7928',
  'four seasons bali sayan': '17603',
  'four seasons oahu at ko olina': '282795',
  'four seasons hotel bangkok': '320464',
  
  // InterContinental Hotels
  'grand intercontinental seoul parnas': '13872',
  'intercontinental new york barclay': '592',
  'intercontinental barcelona': '30179',
  'intercontinental grandstanford': '3302',
  'intercontinental phuket resort': '325018',
  'intercontinental paris legrand': '1189',
  'intercontinental ana tokyo': '27819',
  'intercontinental sydney': '7556',
  'intercontinental bangkok sukhumvit': '601050',
  'intercontinental pattaya resort': '39232',
  'intercontinental bangkok': '46741',
  'intercontinental singapore robertson quay': '313539',
  'intercontinental singapore': '18587',
  'intercontinental los angeles downtown': '312215',
  'intercontinental bali resort': '36315',
  'intercontinental chiang mai the mae ping': '286575',
  'intercontinental danang resort': '143881',
  'intercontinental ana beppu resort and spa': '323573',
  'intercontinental phu quoc long beach resort': '319250',
  'intercontinental osaka': '177549',
  
  // Sofitel Hotels
  'sofitel legend metropole hanoi': '39157',
  'sofitel singapore city centre': '311810',
  
  // Marriott Hotels
  'jw marriott phu quoc emerald bay resort and spa': '313016',
  'jw marriott jeju resort and spa': '601847'
}

// 호텔명으로 검색하여 매칭되는 호텔들의 상세 정보 조회 (최적화된 버전)
async function searchHotelsByNameAndGetDetails(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔍 호텔명 '${hotelName}'으로 최적화 검색`)
    
    const searchKeyword = hotelName.toLowerCase().trim()
    const matchedCodes: string[] = []
    
    // 1단계: 호텔명 인덱스에서 키워드 매칭하여 코드 찾기 (더 유연한 매칭)
    for (const [hotelName, code] of Object.entries(HOTEL_NAME_INDEX)) {
      // 다양한 매칭 방식 지원
      const isExactMatch = hotelName.includes(searchKeyword)
      const isPartialMatch = searchKeyword.split(' ').every(keyword => 
        keyword.length >= 2 && hotelName.includes(keyword)
      )
      
      if (isExactMatch || isPartialMatch) {
        matchedCodes.push(code)
        console.log(`✅ 매칭 발견: ${hotelName} -> ${code}`)
      }
    }
    
    console.log(`📊 인덱스 검색 결과: ${matchedCodes.length}개 호텔 코드 발견`)
    
    if (matchedCodes.length === 0) {
      console.log('📭 인덱스에서 매칭 결과 없음')
      return []
    }
    
    // 2단계: 매칭된 코드들만 API 호출하여 상세 정보 조회
    const matchedHotels: SabreHotel[] = []
    const batchSize = 10
    
    for (let i = 0; i < matchedCodes.length; i += batchSize) {
      const batch = matchedCodes.slice(i, i + batchSize)
      console.log(`📦 상세 정보 조회 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(matchedCodes.length/batchSize)} (${batch.length}개)`)
      
      const batchPromises = batch.map(async (code) => {
        try {
          const hotelDetails = await getHotelDetailsByCode(code)
          return hotelDetails[0] || null
        } catch (error) {
          console.warn(`❌ 호텔 코드 ${code} 상세 정보 조회 실패:`, error)
          return null
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // 성공한 결과만 추가
      batchResults.forEach(hotel => {
        if (hotel) {
          matchedHotels.push(hotel)
        }
      })
      
      // 배치 간 짧은 대기
      if (i + batchSize < matchedCodes.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`🎉 최적화 검색 완료: ${matchedHotels.length}/${matchedCodes.length}개 호텔 정보 조회 성공`)
    return matchedHotels
    
  } catch (error) {
    console.error('최적화 호텔명 검색 오류:', error)
    return []
  }
}

// 주소 정보 추출 헬퍼
function extractAddress(hotelInfo: any): string {
  if (hotelInfo.Address) {
    if (Array.isArray(hotelInfo.Address.AddressLine)) {
      return hotelInfo.Address.AddressLine.join(', ')
    } else if (hotelInfo.Address.AddressLine) {
      return hotelInfo.Address.AddressLine
    } else if (hotelInfo.Address.Street) {
      return hotelInfo.Address.Street
    }
  }
  return '주소 정보 없음'
}

// 도시 정보 추출 헬퍼
function extractCity(hotelInfo: any): string {
  return hotelInfo.Address?.CityName || 
         hotelInfo.Address?.City || 
         hotelInfo.LocationInfo?.Address?.CityName || 
         '도시 정보 없음'
}

// 국가 정보 추출 헬퍼
function extractCountry(hotelInfo: any): string {
  return hotelInfo.Address?.CountryCode || 
         hotelInfo.Address?.CountryName || 
         hotelInfo.LocationInfo?.Address?.CountryCode || 
         '국가 정보 없음'
}

export async function POST(request: NextRequest) {
  console.log('🔍 공식 Sabre API 기반 호텔 검색 시작')
  
  try {
    // 요청 body 파싱
    const body: SabreHotelSearchRequest = await request.json()
    console.log('📝 요청 데이터:', body)
    
    if (!body.hotelName || typeof body.hotelName !== 'string') {
      console.log('❌ 잘못된 요청: hotelName이 없거나 문자열이 아님')
      return NextResponse.json<SabreHotelSearchResponse>(
        {
          success: false,
          error: 'hotelName is required and must be a string'
        },
        { status: 400 }
      )
    }

    const hotelName = body.hotelName.trim()
    console.log('🏨 검색할 호텔명/코드:', hotelName)
    
    if (hotelName.length < 2) {
      console.log('❌ 검색어가 너무 짧음:', hotelName.length)
      return NextResponse.json<SabreHotelSearchResponse>(
        {
          success: false,
          error: '검색어는 최소 2글자 이상이어야 합니다.'
        },
        { status: 400 }
      )
    }

    // 공식 Sabre API 구조를 따른 호텔 검색
    const sabreHotels = await searchHotelsByName(hotelName)
    
    console.log(`🎉 최종 검색 결과: ${sabreHotels.length}개 호텔`)

    if (sabreHotels.length === 0) {
      return NextResponse.json<SabreHotelSearchResponse>(
        {
          success: true,
          data: [],
          error: `검색 결과가 없습니다. 검색어: "${hotelName}"`
        },
        { status: 200 }
      )
    }

    return NextResponse.json<SabreHotelSearchResponse>(
      {
        success: true,
        data: sabreHotels
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('API 라우트 오류:', error)
    return NextResponse.json<SabreHotelSearchResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
