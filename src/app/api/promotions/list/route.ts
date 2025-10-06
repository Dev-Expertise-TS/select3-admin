import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    const { data: promotions, error } = await supabase
      .from("select_hotel_promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("프로모션 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 조회 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        promotions: promotions || [],
        totalCount: promotions?.length || 0,
      },
    });
  } catch (error) {
    console.error("프로모션 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
