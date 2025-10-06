import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      promotion_id, 
      promotion, 
      promotion_description, 
      booking_date, 
      check_in_date 
    } = body;

    if (!id || !promotion_id || !promotion) {
      return NextResponse.json(
        { success: false, error: "ID, 프로모션 ID, 프로모션명은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // promotion_id 중복 체크 (자신 제외)
    const { data: existingPromotion } = await supabase
      .from("select_hotel_promotions")
      .select("id, promotion_id")
      .eq("promotion_id", promotion_id)
      .neq("id", id)
      .single();

    if (existingPromotion) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 프로모션 ID입니다." },
        { status: 409 },
      );
    }

    const { data: updatedPromotion, error } = await supabase
      .from("select_hotel_promotions")
      .update({
        promotion_id,
        promotion,
        promotion_description: promotion_description || null,
        booking_date: booking_date || null,
        check_in_date: check_in_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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
