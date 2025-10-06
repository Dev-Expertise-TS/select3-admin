import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      promotion_id, 
      promotion, 
      promotion_description, 
      note,
      booking_start_date,
      booking_end_date,
      check_in_start_date,
      check_in_end_date,
    } = body;

    if (!promotion_id || !promotion) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID와 프로모션명은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // promotion_id를 기준으로 업데이트하므로 별도의 중복 체크는 불필요

    const { data: updatedPromotion, error } = await supabase
      .from("select_hotel_promotions")
      .update({
        promotion_id,
        promotion,
        promotion_description: promotion_description || null,
        note: note || null,
        booking_start_date: booking_start_date || null,
        booking_end_date: booking_end_date || null,
        check_in_start_date: check_in_start_date || null,
        check_in_end_date: check_in_end_date || null,
      })
      .eq("promotion_id", promotion_id)
      .select()
      .single();

    if (error) {
      console.error("프로모션 업데이트 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 업데이트 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    if (!updatedPromotion) {
      return NextResponse.json(
        { success: false, error: "프로모션을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { promotion: updatedPromotion },
      message: "프로모션이 성공적으로 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 업데이트 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
