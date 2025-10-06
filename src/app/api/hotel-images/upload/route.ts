import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sabreId = formData.get("sabreId") as string;
    const file = formData.get("file") as File;

    if (!sabreId || !file) {
      return NextResponse.json(
        { success: false, error: "Sabre ID와 파일은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabase
      .from("select_hotels")
      .select("sabre_id, slug")
      .eq("sabre_id", sabreId)
      .single();

    if (hotelError || !hotel) {
      return NextResponse.json(
        { success: false, error: "호텔 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: "호텔에 slug가 설정되어 있지 않습니다." },
        { status: 400 },
      );
    }

    // slug 정규화 및 경로 생성
    const normalizedSlug = normalizeSlug(hotel.slug);
    const storagePath = `public/${normalizedSlug}`;

    // 파일명 생성 (타임스탬프 추가로 중복 방지)
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${sabreId}-${timestamp}.${fileExtension}`;
    const filePath = `${storagePath}/${fileName}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("hotel-media")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage 업로드 오류:", uploadError);
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from("hotel-media")
      .getPublicUrl(filePath);

    console.log(`이미지 업로드 완료: ${filePath}`);

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        url: publicUrlData.publicUrl,
        storagePath: uploadData.path,
      },
      message: "이미지가 성공적으로 업로드되었습니다.",
    });
  } catch (error) {
    console.error("이미지 업로드 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "이미지 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

