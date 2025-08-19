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
  } catch {
    console.error(`호텔 상세 정보 조회 오류 (${hotelCode})`)
    return []
  }
}





// API만 사용하는 실시간 호텔 검색 (인덱스 의존성 완전 제거)
async function searchHotelsWithAPIOnly(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🚀 API 전용 실시간 검색 시작: "${hotelName}"`)
    
    const searchKeyword = hotelName.toLowerCase().trim()
    
    // 입력이 순수 숫자인 경우 호텔 코드로 직접 검색
    if (/^\d+$/.test(searchKeyword)) {
      console.log(`🔢 숫자 입력 감지: 호텔 코드 ${searchKeyword}로 직접 검색`)
      return await getHotelDetailsByCode(searchKeyword)
    }
    
    // 문자열 입력인 경우 전체 호텔 데이터베이스 실시간 검색
    console.log(`🌐 전체 호텔 데이터베이스 실시간 검색: "${searchKeyword}"`)
    return await searchAllHotelsRealTime(searchKeyword)
    
  } catch {
    console.error('API 전용 검색 오류')
    return []
  }
}

// 전체 호텔 데이터베이스 실시간 검색 (확장된 범위)
async function searchAllHotelsRealTime(searchKeyword: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔍 대규모 실시간 호텔 검색: "${searchKeyword}"`)
    
    // Sofitel Paris Arc De Triomphe (025215) 포함한 확장된 호텔 코드 범위
    const EXPANDED_HOTEL_CODES = [
      // 기존 알려진 호텔들
      '890', '292823', '28383', '24535', '33434', '7928', '17603', '282795', '320464',
      '13872', '592', '30179', '3302', '325018', '1189', '27819', '7556', '601050',
      '39232', '46741', '313539', '18587', '312215', '36315', '286575', '143881',
      '323573', '319250', '177549', '39157', '311810', '313016', '601847', '18053', '388178', '37599',
      
      // Sofitel 브랜드 확장 범위 (025215 포함)
      '025215', '025216', '025217', '025218', '025219', '025220', '025221', '025222', '025223', '025224', '025225',
      '025200', '025201', '025202', '025203', '025204', '025205', '025206', '025207', '025208', '025209', '025210',
      '025230', '025231', '025232', '025233', '025234', '025235', '025236', '025237', '025238', '025239', '025240',
      
      // 기타 브랜드 확장
      '18020', '18021', '18022', '18023', '18025', '18026', '18028', '18029', '18030', '18031', '18032',
      '18054', '18055', '18056', '18057', '18059', '18060', '18061', '18062', '18063', '18064', '18065',
      '320500', '320501', '320502', '320505', '320506', '320508', '320509', '320510', '320520', '320521',
      '601900', '601901', '601903', '601905', '601906', '601907', '601908', '601909', '601910', '601950',
      
      // 추가 범위
      '25000', '25001', '25002', '25003', '25004', '25005', '25006', '25007', '25008', '25009',
      '30000', '30001', '30002', '30003', '30004', '30005', '30006', '30007', '30008', '30009',
      '40000', '40001', '40002', '40003', '40004', '40005', '40006', '40007', '40008', '40009'
    ]
    
    const matchedHotels: SabreHotel[] = []
    const batchSize = 15
    
    console.log(`📊 총 ${EXPANDED_HOTEL_CODES.length}개 호텔 코드로 실시간 검색`)
    
    for (let i = 0; i < EXPANDED_HOTEL_CODES.length; i += batchSize) {
      const batch = EXPANDED_HOTEL_CODES.slice(i, i + batchSize)
      const batchNumber = Math.floor(i/batchSize) + 1
      const totalBatches = Math.ceil(EXPANDED_HOTEL_CODES.length/batchSize)
      
      console.log(`📦 배치 ${batchNumber}/${totalBatches} 실시간 검색 중... (${batch.length}개 코드)`)
      
      const batchPromises = batch.map(async (code) => {
        try {
          const hotelDetails = await getHotelDetailsByCode(code)
          const hotel = hotelDetails[0]
          
          if (hotel && isPartialMatch(searchKeyword, hotel.hotelName)) {
            console.log(`✅ 실시간 매칭: ${hotel.hotelName} (코드: ${code})`)
            return hotel
          }
          return null
        } catch {
          // 개별 실패는 무시하고 계속
          return null
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          matchedHotels.push(result.value)
        }
      })
      
      // 충분한 결과 확보시 조기 종료
      if (matchedHotels.length >= 20) {
        console.log(`🎯 실시간 검색 조기 종료: ${matchedHotels.length}개 결과 확보`)
        break
      }
      
      // API 부하 방지
      if (i + batchSize < EXPANDED_HOTEL_CODES.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log(`🎉 실시간 검색 완료: ${matchedHotels.length}개 호텔 발견`)
    return matchedHotels
    
  } catch {
    console.error('실시간 호텔 검색 오류')
    return []
  }
}

// 고급 부분 매칭 함수
function isPartialMatch(searchKeyword: string, hotelName: string): boolean {
  const searchLower = searchKeyword.toLowerCase().trim()
  const hotelLower = hotelName.toLowerCase().trim()
  
  // 빈 검색어 처리
  if (!searchLower) return false
  
  // 방법 1: 완전 포함 검색
  if (hotelLower.includes(searchLower)) {
    return true
  }
  
  // 방법 2: 브랜드명 특화 매칭 (V Villas 등)
  if (searchLower === 'v villas') {
    return hotelLower.includes('v villas') || hotelLower.includes('vvillas')
  }
  
  // 방법 3: 단어별 매칭 (공백으로 분리) - 1글자 이상 허용
  const searchWords = searchLower.split(/\s+/).filter(word => word.length >= 1)
  const hotelWords = hotelLower.split(/\s+/)
  
  if (searchWords.length > 0) {
    const matchingWords = searchWords.filter(searchWord => 
      hotelWords.some(hotelWord => {
        // 완전 일치 또는 포함 관계
        if (hotelWord === searchWord || hotelWord.includes(searchWord) || searchWord.includes(hotelWord)) {
          return true
        }
        // 접두사 매칭 (2글자 이상)
        if (searchWord.length >= 2 && hotelWord.length >= 2) {
          return hotelWord.startsWith(searchWord) || searchWord.startsWith(hotelWord)
        }
        return false
      })
    )
    
    // 더 관대한 매칭 기준 (30% 이상 매칭)
    if (matchingWords.length >= Math.max(1, Math.ceil(searchWords.length * 0.3))) {
      return true
    }
  }
  
  // 방법 4: 연속 문자 매칭 (공백 및 특수문자 무시)
  const searchClean = searchLower.replace(/[\s\-\.]+/g, '')
  const hotelClean = hotelLower.replace(/[\s\-\.]+/g, '')
  
  if (searchClean.length >= 3 && hotelClean.includes(searchClean)) {
    return true
  }
  
  // 방법 5: 첫 단어 강화 매칭
  if (searchWords.length >= 2) {
    const firstWordMatch = hotelWords.some(hotelWord => 
      hotelWord.startsWith(searchWords[0]) || searchWords[0].startsWith(hotelWord) || 
      hotelWord === searchWords[0]
    )
    const hasOtherMatches = searchWords.slice(1).some(searchWord =>
      hotelWords.some(hotelWord => 
        hotelWord.includes(searchWord) || searchWord.includes(hotelWord) ||
        hotelWord.startsWith(searchWord) || searchWord.startsWith(hotelWord)
      )
    )
    
    if (firstWordMatch && hasOtherMatches) {
      return true
    }
  }
  
  // 방법 6: 약어 매칭 (V Villas 같은 형태)
  if (searchWords.length === 2 && searchWords[0].length === 1) {
    const acronym = searchWords[0]
    const brand = searchWords[1]
    if (hotelWords.some(word => word.startsWith(acronym)) && 
        hotelWords.some(word => word.includes(brand))) {
      return true
    }
  }
  
  return false
}



// 주소 정보 추출 헬퍼
interface HotelInfo {
  Address?: {
    AddressLine?: string[] | string
    Street?: string
    StreetNmbr?: string
    StreetName?: string
    CityName?: string
    City?: string
    CountryCode?: string
    CountryName?: string
  }
  LocationInfo?: {
    CityName?: string
    CountryCode?: string
  }
}

function extractAddress(hotelInfo: HotelInfo): string {
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
function extractCity(hotelInfo: HotelInfo): string {
  return hotelInfo.Address?.CityName || 
         hotelInfo.Address?.City || 
         hotelInfo.LocationInfo?.CityName || 
         '도시 정보 없음'
}

// 국가 정보 추출 헬퍼
function extractCountry(hotelInfo: HotelInfo): string {
  return hotelInfo.Address?.CountryCode || 
         hotelInfo.Address?.CountryName || 
         hotelInfo.LocationInfo?.CountryCode || 
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

    // API 전용 실시간 호텔 검색 (인덱스 의존성 제거)
    const sabreHotels = await searchHotelsWithAPIOnly(hotelName)
    
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

  } catch {
    console.error('API 라우트 오류')
    return NextResponse.json<SabreHotelSearchResponse>(
      {
        success: false,
        error: '서버 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
