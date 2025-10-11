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

    // 먼저 테이블의 실제 컬럼 확인
    const { data: schemaTest, error: schemaError } = await supabase
      .from("select_city_media")
      .select("*")
      .limit(1);

    if (schemaError) {
      console.error("도시 이미지 스키마 확인 오류:", schemaError);
      return NextResponse.json(
        { success: false, error: `스키마 확인 오류: ${schemaError.message}` },
        { status: 500 },
      );
    }

    // 사용 가능한 컬럼 확인
    const availableColumns = schemaTest && schemaTest.length > 0 ? Object.keys(schemaTest[0]) : [];
    console.log('[city-images/list] Available columns:', availableColumns);

    // 모든 데이터를 가져온 후 메모리에서 필터링 (컬럼 구조 불확실하므로)
    const { data: allData, error } = await supabase
      .from("select_city_media")
      .select("*")
      .order("image_seq", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("도시 이미지 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // 메모리에서 필터링 (우선순위: city_code > city_ko > city_en)
    let filtered: Record<string, unknown>[] = [];
    
    console.log('[city-images/list] Filtering with:', { cityCode, cityKo, cityEn, citySlug });
    console.log('[city-images/list] Total records:', allData?.length || 0);
    
    if (allData && allData.length > 0) {
      filtered = allData.filter((item: Record<string, unknown>) => {
        // 1순위: city_code로 필터링
        if (cityCode && availableColumns.includes('city_code')) {
          const matches = item.city_code === cityCode;
          console.log(`[city-images/list] Checking city_code: "${item.city_code}" === "${cityCode}" → ${matches}`);
          return matches;
        }
        // 2순위: city_ko로 필터링
        if (cityKo && availableColumns.includes('city_ko')) {
          const matches = item.city_ko === cityKo;
          console.log(`[city-images/list] Checking city_ko: "${item.city_ko}" === "${cityKo}" → ${matches}`);
          return matches;
        }
        // 3순위: city_en으로 필터링
        if (cityEn && availableColumns.includes('city_en')) {
          const matches = item.city_en === cityEn;
          console.log(`[city-images/list] Checking city_en: "${item.city_en}" === "${cityEn}" → ${matches}`);
          return matches;
        }
        // 4순위: citySlug로 필터링 (하위 호환성)
        if (citySlug && availableColumns.includes('city_code')) {
          const matches = item.city_code === citySlug;
          console.log(`[city-images/list] Checking city_code (via citySlug): "${item.city_code}" === "${citySlug}" → ${matches}`);
          return matches;
        }
        // 매칭 조건이 없으면 제외
        console.log('[city-images/list] No matching condition, excluding item');
        return false;
      });
    }
    
    console.log('[city-images/list] Filtered results:', filtered.length);

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: {
        availableColumns,
        searchedBy: cityCode ? 'cityCode' : (cityKo ? 'cityKo' : (cityEn ? 'cityEn' : 'citySlug')),
        totalRecords: allData?.length || 0,
        filteredRecords: filtered.length
      }
    });
  } catch (error) {
    console.error("도시 이미지 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

