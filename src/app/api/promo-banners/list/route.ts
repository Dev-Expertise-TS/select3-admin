import { NextRequest, NextResponse } from "next/server";
// import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest) {
  try {
    // const supabase = createServiceRoleClient();

    // 임시로 빈 배열 반환 (실제 테이블이 없을 수 있으므로)
    // const { data: banners, error } = await supabase
    //   .from("promo_banners")
    //   .select("*")
    //   .order("priority", { ascending: true });

    // if (error) {
    //   console.error("프로모션 베너 조회 오류:", error);
    //   return NextResponse.json(
    //     { success: false, error: "프로모션 베너 조회 중 오류가 발생했습니다." },
    //     { status: 500 },
    //   );
    // }

    return NextResponse.json({
      success: true,
      data: {
        banners: [], // 임시로 빈 배열
        totalCount: 0,
      },
    });
  } catch (error) {
    console.error("프로모션 베너 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "프로모션 베너 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
