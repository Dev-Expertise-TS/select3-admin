import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promotion_id, promotion, promotion_description, booking_date, check_in_date } = body;

    if (!promotion_id || !promotion) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID와 프로모션명은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 중복 promotion_id 체크
    const { data: existingPromotion } = await supabase
      .from("select_hotel_promotions")
      .select("promotion_id")
      .eq("promotion_id", promotion_id)
      .single();

    if (existingPromotion) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 프로모션 ID입니다." },
        { status: 409 },
      );
    }

    const { data: newPromotion, error } = await supabase
      .from("select_hotel_promotions")
      .insert({
        promotion_id,
        promotion,
        promotion_description: promotion_description || null,
        booking_date: booking_date || null,
        check_in_date: check_in_date || null,
      })
      .select()
      .single();

    if (error) {
      console.error("프로모션 생성 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 생성 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { promotion: newPromotion },
      message: "프로모션이 성공적으로 생성되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 생성 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
