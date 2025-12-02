import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sabreId, checkInDate, checkOutDate, adults = 2, children = 0, ratePlanCode } = body

    if (!sabreId || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { success: false, error: 'Sabre ID, 체크인 날짜, 체크아웃 날짜는 필수입니다.' },
        { status: 400 }
      )
    }

    // Sabre API 호출을 위한 요청 데이터 구성
    const requestData: any = {
      HotelCode: sabreId,
      CurrencyCode: 'KRW',
      StartDate: checkInDate,
      EndDate: checkOutDate,
      Adults: adults,
      Children: children,
    }

    // RatePlanCode가 있으면 배열로 변환하고 ExactMatchOnly 플래그 추가
    if (ratePlanCode) {
      const codes = ratePlanCode.split(',').map((c: string) => c.trim()).filter(Boolean)
      if (codes.length > 0) {
        requestData.RatePlanCode = codes
        requestData.ExactMatchOnly = true
      }
    }

    console.log('[RoomUrlRates] Sabre API Request:', JSON.stringify(requestData, null, 2))

    // 실제 Sabre API 호출
    const response = await fetch('https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    })

    const responseText = await response.text()
    
    let result: any = null
    try {
      result = JSON.parse(responseText)
    } catch (e) {
      console.error('[RoomUrlRates] Sabre API JSON Parse Error:', e)
      console.error('[RoomUrlRates] Raw Response:', responseText)
      return NextResponse.json(
        { success: false, error: 'Sabre API 응답을 파싱할 수 없습니다.', rawResponse: responseText },
        { status: 502 }
      )
    }

    if (!response.ok) {
      console.error('[RoomUrlRates] Sabre API Error:', response.status, result)
      return NextResponse.json(
        { success: false, error: `Sabre API 오류: ${response.status}`, rawResponse: result },
        { status: response.status }
      )
    }

    const ratePlans = extractRatePlanRows(result)

    return NextResponse.json({
      success: true,
      data: ratePlans,
      rawResponse: result
    })

  } catch (error: any) {
    console.error('[RoomUrlRates] Internal Server Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || '서버 내부 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 헬퍼 함수: Sabre 응답에서 RatePlanRow 추출 (클라이언트 로직 이식)
function extractRatePlanRows(payload: any): any[] {
  const rows: any[] = []
  
  // payload가 유효하지 않으면 빈 배열 반환
  if (!payload || !payload.GetHotelDetailsRS) {
    return [];
  }

  // 1. HotelRateInfo 레벨 탐색
  const hotelRateInfos = getDeepValue(payload, ['GetHotelDetailsRS', 'HotelDetailsInfo', 'HotelRateInfo']);
  // HotelRateInfo는 단일 객체일 수도, 배열일 수도 있음 (보통은 단일 객체지만 확장성을 위해 처리)
  const rateInfoList = Array.isArray(hotelRateInfos) ? hotelRateInfos : (hotelRateInfos ? [hotelRateInfos] : []);

  rateInfoList.forEach((rateInfo: any, index: number) => {
      // 2. RateInfos -> RateInfo 탐색
      const rateInfos = getDeepValue(rateInfo, ['RateInfos', 'RateInfo']);
      const rateInfosList = Array.isArray(rateInfos) ? rateInfos : (rateInfos ? [rateInfos] : []);

      rateInfosList.forEach((ri: any, riIndex: number) => {
        // 3. Rooms -> Room 탐색
        const rooms = getDeepValue(ri, ['Rooms', 'Room']);
        const roomList = Array.isArray(rooms) ? rooms : (rooms ? [rooms] : []);

        roomList.forEach((room: any, roomIndex: number) => {
            // 4. RatePlans -> RatePlan 탐색
            const ratePlans = getDeepValue(room, ['RatePlans', 'RatePlan']);
            const planList = Array.isArray(ratePlans) ? ratePlans : (ratePlans ? [ratePlans] : []);

            planList.forEach((plan: any, planIndex: number) => {
                const ratePlanCode = getDeepValue(plan, ['RatePlanCode']) || ''
                const ratePlanName = getDeepValue(plan, ['RatePlanName']) || ''
                const rateKey = getDeepValue(plan, ['RateKey']) || ''
                
                const convertedRateInfo = getDeepValue(plan, ['ConvertedRateInfo'])
                const currency = convertedRateInfo?.CurrencyCode || ''
                const amountAfterTax = convertedRateInfo?.AmountAfterTax || ''
                const amountBeforeTax = convertedRateInfo?.AmountBeforeTax || ''

                const roomType = getDeepValue(room, ['RoomType']) || ''
                const roomName = getDeepValue(room, ['RoomDescription', 'Name']) || ''
                const roomDesc = getDeepValue(room, ['RoomDescription', 'Text']) || ''

                // Bed Type Summary
                const bedTypeOptions = getDeepValue(room, ['BedTypeOptions', 'BedTypes'])
                const bedList = Array.isArray(bedTypeOptions) ? bedTypeOptions : (bedTypeOptions ? [bedTypeOptions] : [])
                const bedSummary = bedList.map((bed: any) => {
                    const count = getDeepValue(bed, ['BedType', 'Count'])
                    const desc = getDeepValue(bed, ['BedType', 'Description'])
                    return count && desc ? `${count} ${desc}` : desc
                }).filter(Boolean).join(', ')

                const displayRoomName = roomName || ratePlanName || ratePlanCode || roomType
                const descriptionParts = [roomDesc, bedSummary, ratePlanName].filter((part, idx, arr) => part && arr.indexOf(part) === idx)
                
                rows.push({
                    id: `${rateKey || ratePlanCode || index}-${roomIndex}-${planIndex}`,
                    ratePlanCode,
                    ratePlanName,
                    rateKey,
                    roomType: roomType || roomName || ratePlanName || 'RoomType 미상',
                    roomName: displayRoomName,
                    description: descriptionParts.join(' • '),
                    currency,
                    amountAfterTax,
                    amountBeforeTax
                })
            })
        })
      })
  })

  // 가격순 정렬
  return rows.sort((a, b) => {
      const ax = a.amountAfterTax === '' ? Infinity : Number(a.amountAfterTax)
      const bx = b.amountAfterTax === '' ? Infinity : Number(b.amountAfterTax)
      return ax - bx
  })
}

// 안전한 깊은 접근 헬퍼
function getDeepValue(obj: any, path: string[]) {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined) ? acc[key] : undefined, obj)
}
