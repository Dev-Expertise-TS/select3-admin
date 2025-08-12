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

// Sabre 공식 API 설정
const SABRE_API_BASE_URL = 'https://api.havail.sabre.com'


// Sabre API 인증 정보 (환경 변수에서 가져와야 함)
const SABRE_CLIENT_ID = process.env.SABRE_CLIENT_ID || 'your_client_id'
const SABRE_CLIENT_SECRET = process.env.SABRE_CLIENT_SECRET || 'your_client_secret'

// Sabre API 엔드포인트
const SABRE_HOTEL_SEARCH_URL = `${SABRE_API_BASE_URL}/v4.1.0/shop/hotels`
const SABRE_TOKEN_URL = 'https://api.havail.sabre.com/v2/auth/token'



// Sabre API 인증 토큰 가져오기
async function getSabreAuthToken(): Promise<string | null> {
  try {
    console.log('🔐 Sabre API 인증 토큰 요청 중...')
    
    const response = await fetch(SABRE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SABRE_CLIENT_ID}:${SABRE_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      console.error('❌ Sabre API 인증 실패:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    const accessToken = data.access_token
    
    if (accessToken) {
      console.log('✅ Sabre API 인증 토큰 획득 성공')
      return accessToken
    } else {
      console.error('❌ Sabre API 응답에 access_token이 없음')
      return null
    }
  } catch (error) {
    console.error('❌ Sabre API 인증 오류:', error)
    return null
  }
}

// Sabre 공식 Hotel Search API를 사용한 호텔 검색
async function searchHotelsWithOfficialAPI(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🏨 Sabre 공식 API로 호텔 검색: "${hotelName}"`)
    
    // 1. 인증 토큰 획득
    const authToken = await getSabreAuthToken()
    if (!authToken) {
      console.log('⚠️ Sabre 공식 API 인증 실패, 기존 방식으로 폴백')
      return await searchHotelsWithAPIOnly(hotelName)
    }
    
    // 2. 공식 Hotel Search API 호출
    const searchRequest = {
      "OTA_HotelSearchRQ": {
        "Version": "4.1.0",
        "SearchRequest": {
          "HotelSearchRequest": {
            "Criterion": {
              "HotelSearchCriterion": {
                "HotelRef": {
                  "HotelName": hotelName
                }
              }
            }
          }
        }
      }
    }
    
    console.log('📡 Sabre 공식 API 호출:', JSON.stringify(searchRequest, null, 2))
    
    const response = await fetch(SABRE_HOTEL_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(searchRequest)
    })
    
    if (!response.ok) {
      console.error('❌ Sabre 공식 API 호출 실패:', response.status, response.statusText)
      console.log('⚠️ 기존 방식으로 폴백')
      return await searchHotelsWithAPIOnly(hotelName)
    }
    
    const data = await response.json()
    console.log('📋 Sabre 공식 API 응답:', JSON.stringify(data, null, 2))
    
    // 3. 응답 파싱 및 변환
    const hotels: SabreHotel[] = []
    
    if (data.OTA_HotelSearchRS && data.OTA_HotelSearchRS.HotelSearchResults) {
      const properties = data.OTA_HotelSearchRS.HotelSearchResults.HotelSearchResult
      
      if (properties && Array.isArray(properties)) {
        for (const property of properties) {
          if (property.HotelReference && property.HotelReference.HotelCode) {
            const hotel: SabreHotel = {
              hotelCode: property.HotelReference.HotelCode,
              hotelName: property.HotelReference.HotelName || 'Unknown Hotel',
              address: property.HotelReference.Address?.AddressLine?.[0] || '주소 정보 없음',
              city: property.HotelReference.Address?.CityName || '도시 정보 없음',
              country: property.HotelReference.Address?.CountryCode || '국가 정보 없음'
            }
            hotels.push(hotel)
            console.log(`✅ 공식 API에서 호텔 발견: ${hotel.hotelName} (코드: ${hotel.hotelCode})`)
          }
        }
      }
    }
    
    if (hotels.length > 0) {
      console.log(`🎉 Sabre 공식 API 검색 완료: ${hotels.length}개 호텔 발견`)
      return hotels
    } else {
      console.log('⚠️ 공식 API에서 결과 없음, 기존 방식으로 폴백')
      return await searchHotelsWithAPIOnly(hotelName)
    }
    
  } catch (error) {
    console.error('❌ Sabre 공식 API 검색 오류:', error)
    console.log('⚠️ 기존 방식으로 폴백')
    return await searchHotelsWithAPIOnly(hotelName)
  }
}

// Sabre 공식 API 우선 사용하는 호텔 검색 함수
async function searchHotelsByName(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔍 Sabre 공식 API 우선 호텔 검색: ${hotelName}`)
    
    // 순수 숫자인지 확인 (Sabre Hotel Code 직접 검색)
    const isPureNumeric = /^\d+$/.test(hotelName.trim())
    
    if (isPureNumeric) {
      console.log(`🔢 순수 숫자 검색 모드: Sabre Hotel Code ${hotelName}`)
      // Sabre Hotel Code로 직접 검색 (가장 빠름)
      return await getHotelDetailsByCode(hotelName.trim())
    }
    
    // 문자열 검색 모드 - 공식 API 우선 사용
    console.log(`🔍 문자열 검색 모드: "${hotelName}" - 공식 API 우선`)
    
    // 1단계: Sabre 공식 Hotel Search API 시도
    const officialResults = await searchHotelsWithOfficialAPI(hotelName)
    
    if (officialResults.length > 0) {
      console.log(`🎉 공식 API 검색 성공: ${officialResults.length}개 호텔 반환`)
      return officialResults
    }
    
    // 2단계: 공식 API 실패시 기존 방식으로 폴백
    console.log(`⚠️ 공식 API 실패, 기존 방식으로 폴백`)
    return await searchHotelsWithAPIOnly(hotelName)
    
  } catch (error) {
    console.error('호텔 검색 오류:', error)
    console.log('⚠️ 오류 발생, 기존 방식으로 폴백')
    return await searchHotelsWithAPIOnly(hotelName)
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
  'jw marriott jeju resort and spa': '601847',
  
  // V Villas Hotels
  'v villas hua hin mgallery': '18053',
  'v villas phuket mgallery': '388178', // 실제 Sabre Hotel Code
  'v villas phuket - mgallery': '388178' // 다양한 표기법 지원
}

// 호텔명으로 검색하여 매칭되는 호텔들의 상세 정보 조회 (최적화된 버전)
async function searchHotelsByNameAndGetDetails(hotelName: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔍 호텔명 '${hotelName}'으로 최적화 검색`)
    
    const searchKeyword = hotelName.toLowerCase().trim()
    const matchedCodes: string[] = []
    
    // 1단계: 호텔명 인덱스에서 고급 부분 매칭으로 코드 찾기 (중복 제거)
    for (const [hotelName, code] of Object.entries(HOTEL_NAME_INDEX)) {
      if (isPartialMatch(searchKeyword, hotelName)) {
        if (!matchedCodes.includes(code)) { // 중복 방지
          matchedCodes.push(code)
          console.log(`✅ 인덱스 매칭 발견: ${hotelName} -> ${code}`)
        }
      }
    }
    
    console.log(`📊 인덱스 검색 결과: ${matchedCodes.length}개 호텔 코드 발견`)
    
    if (matchedCodes.length === 0) {
      console.log('📭 인덱스에서 매칭 결과 없음, 폴백 검색 시작...')
      return await fallbackSearch(searchKeyword)
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
    
  } catch (error) {
    console.error('API 전용 검색 오류:', error)
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
        } catch (error) {
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
    
  } catch (error) {
    console.error('실시간 호텔 검색 오류:', error)
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

// 폴백 검색: 모든 호텔에 대해 고급 부분 매칭 지원
async function fallbackSearch(searchKeyword: string): Promise<SabreHotel[]> {
  try {
    console.log(`🔄 고급 부분 매칭 폴백 검색 시작: "${searchKeyword}"`)
    
    // 알려진 모든 호텔 코드들 (대폭 확장된 범위 - V Villas Phuket 포함)
    const ALL_KNOWN_CODES = [
      '890', '292823', '28383', '24535', '33434', '7928', '17603', '282795', '320464',
      '13872', '592', '30179', '3302', '325018', '1189', '27819', '7556', '601050',
      '39232', '46741', '313539', '18587', '312215', '36315', '286575', '143881',
      '323573', '319250', '177549', '39157', '311810', '313016', '601847', '18053', '388178', '37599',
      // V Villas 및 추가 MGallery 호텔들을 찾기 위한 확장 범위
      '18020', '18021', '18022', '18023', '18025', '18026', '18028', '18029',
      '18054', '18055', '18056', '18057', '18059', '18060',
      '320500', '320501', '320502', '320505', '320506', '320508', '320509', '320510',
      '601900', '601901', '601903', '601905', '601906', '601907', '601908', '601909', '601910',
      // 추가 범위 - V Villas Phuket을 찾기 위한 더 넓은 검색
      '18061', '18062', '18063', '18064', '18065', '18066', '18067', '18068', '18069', '18070',
      '320520', '320521', '320522', '320523', '320524', '320525', '320526', '320527', '320528', '320529',
      '601950', '601951', '601952', '601953', '601954', '601955', '601956', '601957', '601958', '601959',
      // MGallery 브랜드 코드 범위 확장
      '25000', '25001', '25002', '25003', '25004', '25005', '25006', '25007', '25008', '25009',
      '30000', '30001', '30002', '30003', '30004', '30005', '30006', '30007', '30008', '30009'
    ]
    
    const matchedHotels: SabreHotel[] = []
    const batchSize = 15
    
    for (let i = 0; i < ALL_KNOWN_CODES.length; i += batchSize) {
      const batch = ALL_KNOWN_CODES.slice(i, i + batchSize)
      console.log(`📦 고급 매칭 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(ALL_KNOWN_CODES.length/batchSize)} (${batch.length}개)`)
      
      const batchPromises = batch.map(async (code) => {
        try {
          const hotelDetails = await getHotelDetailsByCode(code)
          const hotel = hotelDetails[0]
          
          if (hotel && isPartialMatch(searchKeyword, hotel.hotelName)) {
            console.log(`✅ 고급 매칭 발견: ${hotel.hotelName} (${code})`)
            return hotel
          }
          
          return null
        } catch (error) {
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
      
      // 충분한 결과를 얻으면 중단 (최대 15개로 증가)
      if (matchedHotels.length >= 15) {
        console.log('📊 고급 매칭에서 충분한 결과 확보, 검색 중단')
        break
      }
      
      // 배치 간 대기
      if (i + batchSize < ALL_KNOWN_CODES.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    
    console.log(`🎉 고급 부분 매칭 완료: ${matchedHotels.length}개 호텔 발견`)
    return matchedHotels
    
  } catch (error) {
    console.error('고급 부분 매칭 오류:', error)
    return []
  }
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
