import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    // upsert: promotion_id가 있으면 갱신, 없으면 생성
    const { data: upserted, error } = await supabase
      .from("select_hotel_promotions")
      .upsert({
        promotion_id,
        promotion,
        promotion_description: promotion_description || null,
        note: note || null,
        booking_start_date: booking_start_date || null,
        booking_end_date: booking_end_date || null,
        check_in_start_date: check_in_start_date || null,
        check_in_end_date: check_in_end_date || null,
      }, { onConflict: 'promotion_id' })
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
      data: { promotion: upserted },
      message: "프로모션이 추가/변경되었습니다.",
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
