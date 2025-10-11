import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityCode = searchParams.get("cityCode");
    const cityKo = searchParams.get("cityKo");
    const cityEn = searchParams.get("cityEn");
    const citySlug = searchParams.get("citySlug");

    if (!cityCode && !cityKo && !cityEn && !citySlug) {
      return NextResponse.json(
        { success: false, error: "cityCode, cityKo 또는 cityEn 중 하나는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 모든 레코드를 가져온 후 메모리에서 필터링 (컬럼 구조 동적 처리)
    const { data: allData, error } = await supabase
      .from("select_city_media")
      .select("*")
      .order("image_seq", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("도시 첫 번째 이미지 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    if (!allData || allData.length === 0) {
      return NextResponse.json({
        success: true,
        url: null,
      });
    }

    // 사용 가능한 컬럼 확인
    const availableColumns = Object.keys(allData[0]);
    console.log('[city-images/first] Available columns:', availableColumns);
    console.log('[city-images/first] Searching for:', { cityCode, cityKo, cityEn, citySlug });
    console.log('[city-images/first] Total records:', allData.length);

    // 메모리에서 필터링 (우선순위: city_code > city_ko > city_en)
    const filtered = allData.filter((item: Record<string, unknown>) => {
      // 1순위: city_code로 필터링
      if (cityCode && availableColumns.includes('city_code')) {
        const matches = item.city_code === cityCode;
        console.log(`[city-images/first] city_code: "${item.city_code}" === "${cityCode}" → ${matches}`);
        return matches;
      }
      // 2순위: city_ko로 필터링
      if (cityKo && availableColumns.includes('city_ko')) {
        const matches = item.city_ko === cityKo;
        console.log(`[city-images/first] city_ko: "${item.city_ko}" === "${cityKo}" → ${matches}`);
        return matches;
      }
      // 3순위: city_en으로 필터링
      if (cityEn && availableColumns.includes('city_en')) {
        const matches = item.city_en === cityEn;
        console.log(`[city-images/first] city_en: "${item.city_en}" === "${cityEn}" → ${matches}`);
        return matches;
      }
      // 4순위: citySlug로 필터링 (하위 호환성)
      if (citySlug && availableColumns.includes('city_code')) {
        const matches = item.city_code === citySlug;
        console.log(`[city-images/first] city_code (via citySlug): "${item.city_code}" === "${citySlug}" → ${matches}`);
        return matches;
      }
      // 매칭 조건이 없으면 제외
      return false;
    });

    console.log('[city-images/first] Filtered results:', filtered.length);

    const data = filtered.length > 0 ? filtered[0] : null;

    return NextResponse.json({
      success: true,
      url: data ? (data as { public_url?: string }).public_url || null : null,
      meta: {
        availableColumns,
        searchedBy: cityCode ? 'cityCode' : (cityKo ? 'cityKo' : (cityEn ? 'cityEn' : 'citySlug')),
        totalRecords: allData.length,
        filteredRecords: filtered.length
      }
    });
  } catch (error) {
    console.error("도시 첫 번째 이미지 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

