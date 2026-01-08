import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// 실시간 데이터이므로 캐시 비활성화
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Bearer 토큰 검증
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token || token !== process.env.API_TOKEN) {
      return NextResponse.json(
        { success: false, error: "인증 토큰이 유효하지 않습니다" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2. sabre_id 파라미터 검증
    const { searchParams } = new URL(request.url);
    const sabreId = searchParams.get("sabre_id");

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: "sabre_id 파라미터가 필요합니다" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 3. Supabase 조회
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("select_hotels")
      .select("rate_plan_code")
      .eq("sabre_id", sabreId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "해당 sabre_id의 호텔을 찾을 수 없습니다" },
          { status: 404, headers: { "Cache-Control": "no-store" } }
        );
      }

      console.error("호텔 데이터 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "호텔 데이터 조회 중 오류가 발생했습니다" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    // 4. rate_plan_code를 배열로 변환
    const codes = data.rate_plan_code
      ? data.rate_plan_code
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean)
      : [];

    return NextResponse.json(
      { success: true, data: codes },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Rate Plan Codes API 오류:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
