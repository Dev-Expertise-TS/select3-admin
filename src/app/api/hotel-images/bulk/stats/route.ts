import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // id_old 컬럼의 최대값과 전체 호텔 수 조회
    const { data: hotels, error } = await supabase
      .from("select_hotels")
      .select("id_old")
      .not("id_old", "is", null)
      .order("id_old", { ascending: false });

    if (error) {
      console.error("호텔 통계 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "호텔 통계 정보를 조회할 수 없습니다." },
        { status: 500 },
      );
    }

    const maxIdOld = hotels && hotels.length > 0 ? hotels[0].id_old : 0;
    const totalHotels = hotels?.length || 0;

    // 이미지가 있는 호텔 수 조회
    const { data: hotelsWithImages, error: imageError } = await supabase
      .from("select_hotels")
      .select("id_old")
      .not("id_old", "is", null)
      .or(
        "image_1.not.is.null,image_2.not.is.null,image_3.not.is.null,image_4.not.is.null,image_5.not.is.null",
      );

    if (imageError) {
      console.error("이미지 호텔 통계 조회 오류:", imageError);
    }

    const hotelsWithImageCount = hotelsWithImages?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        maxIdOld,
        totalHotels,
        hotelsWithImageCount,
        hotelsWithoutImageCount: totalHotels - hotelsWithImageCount,
      },
      message: `총 ${totalHotels}개 호텔 중 ${hotelsWithImageCount}개 호텔에 이미지가 있습니다.`,
    });
  } catch (error) {
    console.error("통계 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "통계 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
