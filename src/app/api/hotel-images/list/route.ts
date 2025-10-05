import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sabreId = searchParams.get("sabreId");

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: "Sabre ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 호텔 정보 조회
    const { data: hotel, error } = await supabase
      .from("select_hotels")
      .select(
        "sabre_id, property_name_ko, property_name_en, slug, image_1, image_2, image_3, image_4, image_5",
      )
      .eq("sabre_id", sabreId)
      .single();

    if (error) {
      console.error("호텔 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "호텔 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "호텔이 존재하지 않습니다." },
        { status: 404 },
      );
    }

    // select_hotels 테이블의 image_1~image_5 컬럼에서 이미지 URL 추출
    const images: Array<{
      column: string;
      url: string;
      seq: number;
      checked: boolean;
    }> = [];
    const imageColumns = ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'];
    
    imageColumns.forEach((column, index) => {
      const url = hotel[column as keyof typeof hotel] as string | null;
      if (url && url.trim()) {
        images.push({
          column,
          url: url.trim(),
          seq: index + 1,
          checked: true,
        });
      }
    });

    console.log(`호텔 ${sabreId} 이미지 조회 결과:`, {
      totalImages: images.length,
      images: images.map(img => ({ column: img.column, url: img.url }))
    });

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          sabreId: hotel.sabre_id,
          nameKr: hotel.property_name_ko,
          nameEn: hotel.property_name_en,
          slug: hotel.slug,
        },
        images,
        totalImages: images.length,
      },
    });
  } catch (error) {
    console.error("호텔 이미지 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "호텔 이미지 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}