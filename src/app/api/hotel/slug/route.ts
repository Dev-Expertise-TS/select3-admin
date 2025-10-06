import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sabreId = searchParams.get("sabreId");

  if (!sabreId) {
    return NextResponse.json(
      { success: false, error: "sabreId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  try {
    const { data: hotel, error } = await supabase
      .from("select_hotels")
      .select("sabre_id, property_name_ko, property_name_en, slug")
      .eq("sabre_id", sabreId)
      .single();

    if (error || !hotel) {
      console.error("호텔 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "호텔이 존재하지 않습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sabreId: hotel.sabre_id,
        nameKr: hotel.property_name_ko,
        nameEn: hotel.property_name_en,
        slug: hotel.slug,
      },
    });
  } catch (error) {
    console.error("호텔 슬러그 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "호텔 슬러그 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
