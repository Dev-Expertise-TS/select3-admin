import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

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
    // 먼저 호텔 슬러그 가져오기
    const { data: hotel, error: hotelError } = await supabase
      .from("select_hotels")
      .select("slug")
      .eq("sabre_id", sabreId)
      .single();

    if (hotelError || !hotel) {
      console.error("호텔 조회 오류:", hotelError);
      return NextResponse.json(
        { success: false, error: "호텔이 존재하지 않습니다." },
        { status: 404 },
      );
    }

    if (!hotel.slug) {
      return NextResponse.json({
        success: true,
        data: { imageUrl: null, message: "호텔 슬러그가 없습니다." },
      });
    }

    // Supabase Storage에서 첫 번째 이미지 가져오기
    const normalizedSlug = normalizeSlug(hotel.slug);
    const { data: files, error: filesError } = await supabase.storage
      .from("hotel-media")
      .list(`public/${normalizedSlug}`, {
        limit: 1,
        sortBy: { column: "name", order: "asc" },
      });

    if (filesError) {
      console.error("Storage 파일 조회 오류:", filesError);
      return NextResponse.json({
        success: true,
        data: { imageUrl: null, message: "이미지를 찾을 수 없습니다." },
      });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: true,
        data: { imageUrl: null, message: "이미지가 없습니다." },
      });
    }

    // 첫 번째 파일의 공개 URL 생성
    const { data: publicUrlData } = supabase.storage
      .from("hotel-media")
      .getPublicUrl(`public/${normalizedSlug}/${files[0].name}`);

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: publicUrlData.publicUrl,
        fileName: files[0].name,
        slug: hotel.slug,
        normalizedSlug,
      },
    });
  } catch (error) {
    console.error("호텔 첫 번째 이미지 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "호텔 첫 번째 이미지 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
