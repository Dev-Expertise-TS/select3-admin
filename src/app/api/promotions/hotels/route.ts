import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// 프로모션에 연결된 호텔 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get("promotionId");

    if (!promotionId) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 프로모션에 연결된 호텔 목록 조회
    const { data: mappedHotels, error } = await supabase
      .from("select_hotel_promotions_map")
      .select(`
        sabre_id,
        select_hotels!inner (
          sabre_id,
          property_name_ko,
          property_name_en,
          slug
        )
      `)
      .eq("promotion_id", promotionId);

    if (error) {
      console.error("프로모션 호텔 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 호텔 조회 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hotels: mappedHotels?.map(item => ({
          sabre_id: item.sabre_id,
          ...item.select_hotels
        })) || [],
        totalCount: mappedHotels?.length || 0,
      },
    });
  } catch (error) {
    console.error("프로모션 호텔 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 호텔 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

// 프로모션에 호텔 연결
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotionId, sabreId } = body;

    if (!promotionId || !sabreId) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID와 호텔 Sabre ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 중복 연결 체크
    const { data: existingMapping } = await supabase
      .from("select_hotel_promotions_map")
      .select("id")
      .eq("promotion_id", promotionId)
      .eq("sabre_id", sabreId)
      .single();

    if (existingMapping) {
      return NextResponse.json(
        { success: false, error: "이미 연결된 호텔입니다." },
        { status: 409 },
      );
    }

    // 호텔 존재 여부 확인
    const { data: hotel } = await supabase
      .from("select_hotels")
      .select("sabre_id")
      .eq("sabre_id", sabreId)
      .single();

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 호텔입니다." },
        { status: 404 },
      );
    }

    // 매핑 생성
    const { data: newMapping, error } = await supabase
      .from("select_hotel_promotions_map")
      .insert({
        promotion_id: promotionId,
        sabre_id: sabreId,
      })
      .select()
      .single();

    if (error) {
      console.error("프로모션 호텔 연결 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 호텔 연결 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { mapping: newMapping },
      message: "호텔이 프로모션에 성공적으로 연결되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 호텔 연결 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 호텔 연결 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

// 프로모션에서 호텔 연결 해제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get("promotionId");
    const sabreId = searchParams.get("sabreId");

    if (!promotionId || !sabreId) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID와 호텔 Sabre ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from("select_hotel_promotions_map")
      .delete()
      .eq("promotion_id", promotionId)
      .eq("sabre_id", sabreId);

    if (error) {
      console.error("프로모션 호텔 연결 해제 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 호텔 연결 해제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "호텔이 프로모션에서 성공적으로 연결 해제되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 호텔 연결 해제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 호텔 연결 해제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
