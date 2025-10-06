import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "제목과 내용은 필수입니다." },
        { status: 400 },
      );
    }

    // 임시로 성공 응답 반환 (실제 DB 저장 로직은 추후 구현)
    const mockBanner = {
      id: Date.now(),
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
      message: "프로모션 베너가 성공적으로 생성되었습니다.",
    });
  } catch (error) {
    console.error("프로모션 베너 생성 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 베너 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
