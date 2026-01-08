import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { SABRE_CONFIG } from "@/config/sabre";

// 실시간 데이터이므로 캐시 비활성화
export const dynamic = "force-dynamic";

// *.priviatravel.com 서브도메인만 허용하는 CORS 체크
function isAllowedOrigin(origin: string | null): string {
  if (!origin) return "";

  // 패턴: https://*.priviatravel.com (포트 포함 가능)
  // 예: https://local.priviatravel.com:8443, https://www.priviatravel.com
  const pattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?priviatravel\.com(:\d+)?$/;

  return pattern.test(origin) ? origin : "";
}

// CORS 헤더 생성 함수
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // origin이 동적이므로 Vary 헤더 추가 (캐시 관련)
    ...(allowedOrigin && { Vary: "Origin" }),
  };
}

// OPTIONS 메소드 처리 (CORS preflight)
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

/**
 * ExactMatchOnly가 true인 Rate Plan Codes
 *
 * Sabre API 요청 시:
 * - "PrepaidQualifier": "ExcludePrepaid"
 * - "ExactMatchOnly": true
 * 로 설정되어야 세이버 360 단말에서 조회하는 조건과 동일한 요금이 조회됩니다.
 *
 * [ExactMatchOnly = true로 조회 가능한 코드]
 * API, ZP3, VMC, TLC, H01, S72
 *
 * [ExactMatchOnly = false로만 조회 가능한 코드 (현재 지원 안함)]
 * XLO, PPR, FAN, WMP, HPM, TID (STP는 세팅중)
 *
 * 위 코드들이 ExactMatchOnly=true 상태에서 조회 안 되는 이유:
 * - 해당 호텔에서 E66L PCC에 해당 코드를 태그로 보내지 않음
 * - 요금에 태그가 없으므로 true 상태에서는 조회 불가
 * - false 상태에서는 일반요금과 뒤섞여 조회됨
 *
 * 결론:
 * - 세이버 단말기와 일치하는 호텔(코드)에 대해서만 캘린더 요금조회 가능
 * - 그 외 호텔들은 컨소시아에 E66L 요금 코드 설정 요청 필요
 *
 * @see https://tidesquareworkspace.slack.com/archives/C07SWB02A7Q/p1747809799407399
 */
const EXACT_MATCH_CODES = ["API", "ZP3", "VMC", "TLC", "H01", "S72"];

// 날짜 형식 검증 (YYYY-MM-DD)
function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// 오늘 날짜 가져오기 (YYYY-MM-DD)
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// 체크아웃 날짜 계산 (check_in + nights)
function calculateCheckOutDate(checkIn: string, nights: number): string {
  const date = new Date(checkIn);
  date.setDate(date.getDate() + nights);
  return date.toISOString().split("T")[0];
}

// ExactMatchOnly 플래그 결정
function determineExactMatchOnly(ratePlanCodes: string[]): boolean {
  // 모든 코드가 EXACT_MATCH_CODES에 있으면 true
  return ratePlanCodes.every((code) => EXACT_MATCH_CODES.includes(code));
}

// 취소 마감일 계산
function calculateCancelDeadline(
  cancelPenalty: CancelPenalty | undefined,
  startDate: string
): string {
  if (!cancelPenalty) return "";

  // Refundable이 false면 환불 불가
  if (cancelPenalty.Refundable === false) return "";

  const deadline = cancelPenalty.Deadline;
  if (!deadline) return "";

  // Deadline이 문자열이면 (YYYY-MM-DD) → YYYYMMDD로 변환
  if (typeof deadline === "string") {
    return deadline.replace(/-/g, "");
  }

  // Offset 정보가 있으면 체크인 날짜에서 계산
  if (deadline.OffsetDropTime === "BeforeArrival") {
    const checkInDate = new Date(startDate);

    if (deadline.OffsetTimeUnit === "Day" && deadline.OffsetUnitMultiplier) {
      checkInDate.setDate(
        checkInDate.getDate() - deadline.OffsetUnitMultiplier
      );
    } else if (
      deadline.OffsetTimeUnit === "Hour" &&
      deadline.OffsetUnitMultiplier
    ) {
      checkInDate.setHours(
        checkInDate.getHours() - deadline.OffsetUnitMultiplier
      );
    }

    // YYYYMMDD 형식으로 반환
    return checkInDate.toISOString().split("T")[0].replace(/-/g, "");
  }

  return "";
}

// 타입 정의
interface RoomDescription {
  price: number;
  roomCode: string;
  roomName: string;
  roomDescription: string;
  cancelDeadLine: string;
}

interface CancelPenaltyDeadline {
  OffsetDropTime?: string;
  OffsetTimeUnit?: string;
  OffsetUnitMultiplier?: number;
}

interface CancelPenalty {
  Refundable?: boolean;
  Deadline?: string | CancelPenaltyDeadline;
}

interface RateInfo {
  AmountAfterTax?: number;
  StartDate?: string;
  CancelPenalties?: {
    CancelPenalty?: CancelPenalty[];
  };
}

interface RatePlan {
  ProductCode?: string;
  ConvertedRateInfo?: RateInfo;
  RateInfo?: RateInfo;
}

interface RoomDescriptionInfo {
  Name?: string;
  Text?: string[];
}

interface Room {
  RoomType?: string;
  RoomDescription?: RoomDescriptionInfo;
  RatePlans?: {
    RatePlan?: RatePlan[];
  };
}

interface HotelInfo {
  HotelName?: string;
  SabreHotelCode?: string;
}

interface SabreResponse {
  GetHotelDetailsRS?: {
    HotelDetailsInfo?: {
      HotelInfo?: HotelInfo;
      HotelRateInfo?: {
        Rooms?: {
          Room?: Room[];
        };
      };
    };
  };
}

// Sabre 응답 변환
function convertSabreResponse(
  sabreResponse: SabreResponse,
  sabreId: string,
  checkIn: string
): {
  propertyNameKor: string;
  propertyNameEng: string;
  sabreId: string;
  destinationKor: string;
  destinationEng: string;
  cityKor: string;
  cityEng: string;
  paragonId: number;
  roomDescriptions: RoomDescription[];
} {
  const hotelDetailsInfo = sabreResponse?.GetHotelDetailsRS?.HotelDetailsInfo;
  const hotelInfo = hotelDetailsInfo?.HotelInfo;
  const rooms = hotelDetailsInfo?.HotelRateInfo?.Rooms?.Room || [];

  const hotelName = hotelInfo?.HotelName || "";
  const sabreHotelCode = hotelInfo?.SabreHotelCode || sabreId;

  const roomDescriptions: RoomDescription[] = [];

  // Room × RatePlan 조합으로 roomDescriptions 생성
  for (const room of rooms) {
    const roomType =
      room.RoomType || room.RoomDescription?.Name || "There is no roomType";
    const roomDescText = room.RoomDescription?.Text?.join(" ") || "";
    const ratePlans = room.RatePlans?.RatePlan || [];

    for (const ratePlan of ratePlans) {
      const productCode = ratePlan.ProductCode || "";

      // 가격: ConvertedRateInfo 우선, fallback으로 RateInfo
      const rateInfo = ratePlan.ConvertedRateInfo || ratePlan.RateInfo;
      const price = rateInfo?.AmountAfterTax
        ? parseInt(String(rateInfo.AmountAfterTax), 10)
        : 0;

      // 취소 마감일 계산
      const cancelPenalties =
        ratePlan.ConvertedRateInfo?.CancelPenalties?.CancelPenalty ||
        ratePlan.RateInfo?.CancelPenalties?.CancelPenalty ||
        [];
      const startDate = rateInfo?.StartDate || checkIn;
      const cancelDeadLine = calculateCancelDeadline(
        cancelPenalties[0],
        startDate
      );

      roomDescriptions.push({
        price,
        roomCode: roomType,
        roomName: productCode
          ? `${productCode} - ${roomDescText}`
          : roomDescText,
        roomDescription: roomDescText,
        cancelDeadLine,
      });
    }
  }

  return {
    propertyNameKor: hotelName,
    propertyNameEng: hotelName,
    sabreId: sabreHotelCode,
    destinationKor: "",
    destinationEng: "",
    cityKor: "",
    cityEng: "",
    paragonId: 0,
    roomDescriptions,
  };
}

export async function GET(request: NextRequest) {
  // Origin 헤더 추출 및 CORS + 캐시 헤더 병합
  const origin = request.headers.get("origin");
  const responseHeaders = {
    ...getCorsHeaders(origin),
    "Cache-Control": "no-store",
  };

  try {
    // 1. Bearer 토큰 검증
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || token !== process.env.API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "인증 토큰이 유효하지 않습니다" },
        { status: 401, headers: responseHeaders }
      );
    }

    // 2. Query Parameters 추출
    const { searchParams } = new URL(request.url);
    const sabreId = searchParams.get("sabre_id");
    const checkIn = searchParams.get("check_in");
    const nightsStr = searchParams.get("nights");
    const numberOfPeopleStr = searchParams.get("number_of_people");

    // 3. 필수 파라미터 검증
    if (!sabreId || !checkIn || !nightsStr || !numberOfPeopleStr) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 파라미터가 누락되었습니다.",
          message:
            "sabre_id, check_in, nights, number_of_people 파라미터를 모두 제공해주세요.",
          required_params: [
            "sabre_id",
            "check_in",
            "nights",
            "number_of_people",
          ],
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // 4. 날짜 형식 검증
    if (!isValidDateFormat(checkIn)) {
      return NextResponse.json(
        {
          success: false,
          error: "체크인 날짜 형식이 올바르지 않습니다.",
          message: "날짜는 YYYY-MM-DD 형식으로 입력해주세요.",
          example: "2024-03-15",
          provided_value: checkIn,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // 5. 과거 날짜 검증
    const today = getTodayString();
    if (checkIn < today) {
      return NextResponse.json(
        {
          success: false,
          error: "체크인 날짜가 과거 날짜입니다.",
          message: "체크인 날짜는 오늘 이후로 선택해주세요.",
          today,
          provided_value: checkIn,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // 6. nights 범위 검증
    const nights = parseInt(nightsStr, 10);
    if (isNaN(nights) || nights < 1 || nights > 30) {
      return NextResponse.json(
        {
          success: false,
          error: "숙박 일수가 유효하지 않습니다.",
          message: "숙박 일수는 1-30일 사이로 입력해주세요.",
          provided_value: nightsStr,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // 7. number_of_people 범위 검증
    const numberOfPeople = parseInt(numberOfPeopleStr, 10);
    if (isNaN(numberOfPeople) || numberOfPeople < 1 || numberOfPeople > 20) {
      return NextResponse.json(
        {
          success: false,
          error: "투숙 인원이 유효하지 않습니다.",
          message: "투숙 인원은 1-20명 사이로 입력해주세요.",
          provided_value: numberOfPeopleStr,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    // 8. Supabase에서 rate_plan_code 조회
    const supabase = createServiceRoleClient();
    const { data: hotelData, error: dbError } = await supabase
      .from("select_hotels")
      .select("rate_plan_code")
      .eq("sabre_id", sabreId)
      .single();

    if (dbError) {
      if (dbError.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "해당 sabre_id의 호텔을 찾을 수 없습니다",
            sabre_id: sabreId,
          },
          { status: 404, headers: responseHeaders }
        );
      }

      console.error("호텔 데이터 조회 오류:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "일시적으로 요금 정보를 조회할 수 없습니다.",
          message:
            "잠시 후 다시 시도해주세요. 문제가 지속되면 CX DM팀으로 문의해주세요.",
          sabre_id: sabreId,
          retry_suggested: true,
        },
        { status: 503, headers: responseHeaders }
      );
    }

    // 9. rate_plan_code 배열로 변환
    const ratePlanCodes: string[] = hotelData.rate_plan_code
      ? hotelData.rate_plan_code
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean)
      : [];

    // 10. rate_plan_code가 없으면 요금 조회 불가
    if (ratePlanCodes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "요금 조회가 불가능합니다.",
          message: `해당 숙소(sabre_id: ${sabreId})의 요금 코드(rate_plan_code)가 설정되지 않아 요금 조회가 어렵습니다.`,
          sabre_id: sabreId,
          suggestion: "다른 숙소를 선택해주세요.",
        },
        { status: 422, headers: responseHeaders }
      );
    }

    // 11. 체크아웃 날짜 계산
    const checkOut = calculateCheckOutDate(checkIn, nights);

    // 12. ExactMatchOnly 결정
    const exactMatchOnly = determineExactMatchOnly(ratePlanCodes);

    // 13. 외부 Sabre 프록시 API 호출
    const sabreRequestBody = {
      HotelCode: sabreId,
      CurrencyCode: "KRW",
      StartDate: checkIn,
      EndDate: checkOut,
      Adults: numberOfPeople,
      Children: 0,
      Rooms: 1,
      RatePlanCode: ratePlanCodes,
      ExactMatchOnly: exactMatchOnly,
    };

    console.log("Sabre 프록시 API 요청:", sabreRequestBody);

    const sabreProxyUrl = `${SABRE_CONFIG.PROXY.BASE_URL}/hotel-details`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      SABRE_CONFIG.TIMEOUT.PROXY
    );

    let sabreResponse: Response;
    try {
      sabreResponse = await fetch(sabreProxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sabreRequestBody),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "요금 조회 시간이 초과되었습니다.",
            message: "네트워크 상태가 불안정합니다. 잠시 후 다시 시도해주세요.",
            retry_suggested: true,
          },
          { status: 504, headers: responseHeaders }
        );
      }

      console.error("Sabre 프록시 API 호출 오류:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: "시스템 오류가 발생했습니다.",
          message:
            "예상치 못한 문제가 발생했습니다. CX DM 팀으로 문의해주세요.",
          error_id: Math.random().toString(36).substring(2, 10),
        },
        { status: 500, headers: responseHeaders }
      );
    }

    clearTimeout(timeoutId);

    // 14. Sabre 응답 파싱
    const sabreResponseText = await sabreResponse.text();
    console.log("Sabre 프록시 API 응답 상태:", sabreResponse.status);

    let sabreData: SabreResponse;
    try {
      sabreData = JSON.parse(sabreResponseText);
    } catch {
      console.error("Sabre 응답 파싱 실패:", sabreResponseText.slice(0, 500));
      return NextResponse.json(
        {
          success: false,
          error: "시스템 오류가 발생했습니다.",
          message:
            "예상치 못한 문제가 발생했습니다. CX DM 팀으로 문의해주세요.",
          error_id: Math.random().toString(36).substring(2, 10),
        },
        { status: 500, headers: responseHeaders }
      );
    }

    // 15. 응답 변환
    const convertedData = convertSabreResponse(sabreData, sabreId, checkIn);

    // 16. 객실 정보가 없으면 404
    if (convertedData.roomDescriptions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "요금 정보를 찾을 수 없습니다.",
          message: "해당 조건에 맞는 객실이 없거나 예약이 마감되었습니다.",
          sabre_id: sabreId,
          search_params: {
            check_in: checkIn,
            check_out: checkOut,
            guests: numberOfPeople,
          },
        },
        { status: 404, headers: responseHeaders }
      );
    }

    // 17. 성공 응답
    return NextResponse.json(
      {
        success: true,
        data: convertedData,
        search_info: {
          sabre_id: sabreId,
          check_in: checkIn,
          check_out: checkOut,
          guests: numberOfPeople,
          nights,
        },
      },
      { status: 200, headers: responseHeaders }
    );
  } catch (error) {
    console.error("select-hotel-price API 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "시스템 오류가 발생했습니다.",
        message: "예상치 못한 문제가 발생했습니다. CX DM 팀으로 문의해주세요.",
        error_id: Math.random().toString(36).substring(2, 10),
      },
      { status: 500, headers: responseHeaders }
    );
  }
}
