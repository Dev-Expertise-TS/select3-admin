import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 먼저 레코드 정보 조회
    const { data: mediaRecord, error: fetchError } = await supabase
      .from("select_city_media")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !mediaRecord) {
      return NextResponse.json(
        { success: false, error: "이미지 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from("hotel-media")
      .remove([mediaRecord.file_path]);

    if (storageError) {
      console.warn("Storage 파일 삭제 오류:", storageError);
      // Storage 삭제 실패해도 DB 레코드는 삭제 진행
    }

    // DB 레코드 삭제
    const { error: deleteError } = await supabase
      .from("select_city_media")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("DB 레코드 삭제 오류:", deleteError);
      return NextResponse.json(
        { success: false, error: `삭제 실패: ${deleteError.message}` },
        { status: 500 },
      );
    }

    console.log(`도시 이미지 삭제 완료: ${mediaRecord.file_path}`);

    return NextResponse.json({
      success: true,
      message: "이미지가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("도시 이미지 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

