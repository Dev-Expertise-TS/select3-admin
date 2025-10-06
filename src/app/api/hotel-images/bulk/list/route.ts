import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // 모든 호텔 조회 (이미지가 있는 호텔만)
    const { data: hotels, error } = await supabase
      .from("select_hotels")
      .select(
        "id_old, sabre_id, slug, property_name_ko, property_name_en, image_1, image_2, image_3, image_4, image_5"
      )
      .not("slug", "is", null)
      .or(
        "image_1.not.is.null,image_2.not.is.null,image_3.not.is.null,image_4.not.is.null,image_5.not.is.null"
      );

    if (error) {
      console.error("호텔 목록 조회 오류:", error);
      return NextResponse.json(
        {
          success: false,
          error: "호텔 목록 조회 중 오류가 발생했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hotels: hotels || [],
        totalHotels: hotels?.length || 0,
      },
    });
  } catch (error) {
    console.error("호텔 목록 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "호텔 목록 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

