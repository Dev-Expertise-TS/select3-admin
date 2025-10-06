import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "파일 경로는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Supabase Storage에서 파일 삭제
    const { data, error } = await supabase.storage
      .from("hotel-media")
      .remove([filePath]);

    if (error) {
      console.error("Storage 삭제 오류:", error);
      return NextResponse.json(
        { success: false, error: `삭제 실패: ${error.message}` },
        { status: 500 },
      );
    }

    console.log(`이미지 삭제 완료: ${filePath}`);

    return NextResponse.json({
      success: true,
      data: data,
      message: "이미지가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("이미지 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "이미지 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

