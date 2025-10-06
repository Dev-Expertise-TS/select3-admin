import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content } = body;

    if (!id || !title || !content) {
      return NextResponse.json(
        { success: false, error: "ID, 제목, 내용은 필수입니다." },
        { status: 400 },
      );
    }

    // 임시로 성공 응답 반환 (실제 DB 업데이트 로직은 추후 구현)
    const mockBanner = {
      id: parseInt(id),
      title,
      content,
      link_url: body.link_url || null,
      background_color: body.background_color || "#3B82F6",
      text_color: body.text_color || "#FFFFFF",
      is_active: body.is_active !== false,
      priority: body.priority || 1,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: { banner: mockBanner },
      message: "프로모션 베너가 성공적으로 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 베너 업데이트 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 베너 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
