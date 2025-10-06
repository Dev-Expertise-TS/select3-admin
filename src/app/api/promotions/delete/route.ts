import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "프로모션 ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 먼저 매핑된 호텔이 있는지 확인
    const { data: mappedHotels } = await supabase
      .from("select_hotel_promotions_map")
      .select("sabre_id")
      .eq("promotion_id", id);

    if (mappedHotels && mappedHotels.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `이 프로모션은 ${mappedHotels.length}개의 호텔에 연결되어 있어 삭제할 수 없습니다. 먼저 호텔 연결을 해제해주세요.`,
        },
        { status: 409 },
      );
    }

    // 프로모션 삭제
    const { error } = await supabase
      .from("select_hotel_promotions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("프로모션 삭제 오류:", error);
      return NextResponse.json(
        { success: false, error: "프로모션 삭제 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "프로모션이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
