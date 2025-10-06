import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "베너 ID가 필요합니다." },
        { status: 400 },
      );
    }

    // 임시로 성공 응답 반환 (실제 DB 삭제 로직은 추후 구현)
    console.log(`프로모션 베너 삭제 요청: ID ${id}`);

    return NextResponse.json({
      success: true,
      message: "프로모션 베너가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 베너 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 베너 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
