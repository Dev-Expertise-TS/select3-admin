import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SearchHotelRequest, HotelSearchResult, ApiResponse } from '@/types/hotel';

export async function POST(request: NextRequest) {
  try {
    // 요청 Body 파싱 및 검증
    const body: SearchHotelRequest = await request.json();
    
    if (body.searching_string === undefined || body.searching_string === null) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'searching_string is required'
        },
        { status: 400 }
      );
    }

    if (typeof body.searching_string !== 'string') {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'searching_string must be a string'
        },
        { status: 400 }
      );
    }

    // 검색어 처리
    const searchTerm = body.searching_string.trim();

    // Supabase 관리자 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 빈 검색어인 경우 최신 호텔 리스트 반환
    if (!searchTerm) {
      const { data, error } = await supabase
        .from('select_hotels')
        .select(`
          sabre_id, 
          paragon_id, 
          property_name_kor, 
          property_name_eng, 
          rate_plan_codes, 
          created_at,
          brand_id
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[hotel-search] Supabase query error (initial list):', error);
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Database query failed'
          },
          { status: 500 }
        );
      }

      // 브랜드 정보를 별도로 가져오기
      const brandIds = data.map(row => row.brand_id).filter(Boolean);
      const brandsData = brandIds.length > 0 ? await supabase
        .from('hotel_brands')
        .select('brand_id, name_kr, chain_id')
        .in('brand_id', brandIds) : { data: [], error: null };

      // 체인 정보를 별도로 가져오기
      const chainIds = (brandsData.data || []).map(brand => brand.chain_id).filter(Boolean);
      const chainsData = chainIds.length > 0 ? await supabase
        .from('hotel_chains')
        .select('chain_id, name_kr')
        .in('chain_id', chainIds) : { data: [], error: null };

      // 브랜드와 체인 매핑
      const brandMap = new Map((brandsData.data || []).map(brand => [brand.brand_id, brand]));
      const chainMap = new Map((chainsData.data || []).map(chain => [chain.chain_id, chain]));

      const results: HotelSearchResult[] = (data || []).map((row) => {
        const brand = row.brand_id ? brandMap.get(row.brand_id) : null;
        const chain = brand?.chain_id ? chainMap.get(brand.chain_id) : null;
        
        return {
          sabre_id: row.sabre_id ? String(row.sabre_id) : null,
          paragon_id: row.paragon_id ? String(row.paragon_id) : null,
          property_name_kor: row.property_name_kor || null,
          property_name_eng: row.property_name_eng || null,
          rate_plan_codes: row.rate_plan_codes || null,
          created_at: row.created_at || null,
          chain_name_kr: chain?.name_kr || null,
          brand_name_kr: brand?.name_kr || null,
        };
      });

      return NextResponse.json<ApiResponse<HotelSearchResult[]>>(
        {
          success: true,
          data: results,
          count: results.length
        },
        { status: 200 }
      );
    }

    // or() 사용 시 검색어에 ','가 포함되면 구문 오류를 유발할 수 있어 병렬 쿼리 후 병합 방식으로 변경
    const baseSelect = 'sabre_id, paragon_id, property_name_kor, property_name_eng, rate_plan_codes, created_at, brand_id'
    const isNumericSearch = /^\d+$/.test(searchTerm)

    type Row = { 
      sabre_id: string | null; 
      paragon_id: string | null; 
      property_name_kor: string | null; 
      property_name_eng: string | null; 
      rate_plan_codes: string[] | null; 
      created_at: string | null;
      brand_id: number | null;
    }
    type TaskResult = { data: Row[] | null; error: unknown }
    const tasks: Array<Promise<TaskResult>> = []
    // 한글명
    tasks.push((async () => {
      const { data, error } = await supabase
        .from('select_hotels')
        .select(baseSelect)
        .ilike('property_name_kor', `%${searchTerm}%`)
        .limit(200)
      return { data: data as Row[] | null, error }
    })())
    // 영문명
    tasks.push((async () => {
      const { data, error } = await supabase
        .from('select_hotels')
        .select(baseSelect)
        .ilike('property_name_eng', `%${searchTerm}%`)
        .limit(200)
      return { data: data as Row[] | null, error }
    })())
    // 숫자일 경우 ID 정확 매치도 포함
    if (isNumericSearch) {
      tasks.push((async () => {
        const { data, error } = await supabase
          .from('select_hotels')
          .select(baseSelect)
          .eq('sabre_id', Number(searchTerm))
          .limit(200)
        return { data: data as Row[] | null, error }
      })())
      tasks.push((async () => {
        const { data, error } = await supabase
          .from('select_hotels')
          .select(baseSelect)
          .eq('paragon_id', Number(searchTerm))
          .limit(200)
        return { data: data as Row[] | null, error }
      })())
    }

    const results = await Promise.all(tasks)
    const firstError = results.find((r) => r.error)?.error
    if (firstError) {
      console.error('Supabase query error (merged):', firstError)
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Database query failed' }, { status: 500 })
    }

    // 병합 및 중복 제거 (sabre_id-paragon_id 기준)
    const merged: Row[] = []
    const seen = new Set<string>()
    for (const r of results) {
      for (const row of (r.data as Row[] | null) ?? []) {
        const key = `${row.sabre_id ?? 'null'}-${row.paragon_id ?? 'null'}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(row)
      }
    }

    // 정렬: 한글명 우선, 없으면 영문명
    merged.sort((a, b) => {
      const ak = a.property_name_kor ?? a.property_name_eng ?? ''
      const bk = b.property_name_kor ?? b.property_name_eng ?? ''
      return ak.localeCompare(bk)
    })

    // 검색 결과에서 브랜드 정보를 별도로 가져오기
    const searchBrandIds = merged.map(row => row.brand_id).filter(Boolean);
    const searchBrandsData = searchBrandIds.length > 0 ? await supabase
      .from('hotel_brands')
      .select('brand_id, name_kr, chain_id')
      .in('brand_id', searchBrandIds) : { data: [], error: null };

    // 검색 결과에서 체인 정보를 별도로 가져오기
    const searchChainIds = (searchBrandsData.data || []).map(brand => brand.chain_id).filter(Boolean);
    const searchChainsData = searchChainIds.length > 0 ? await supabase
      .from('hotel_chains')
      .select('chain_id, name_kr')
      .in('chain_id', searchChainIds) : { data: [], error: null };

    // 검색 결과용 브랜드와 체인 매핑
    const searchBrandMap = new Map((searchBrandsData.data || []).map(brand => [brand.brand_id, brand]));
    const searchChainMap = new Map((searchChainsData.data || []).map(chain => [chain.chain_id, chain]));

    const searchResults: HotelSearchResult[] = merged.map((row) => {
      const brand = row.brand_id ? searchBrandMap.get(row.brand_id) : null;
      const chain = brand?.chain_id ? searchChainMap.get(brand.chain_id) : null;
      
      return {
        sabre_id: row.sabre_id ? String(row.sabre_id) : null,
        paragon_id: row.paragon_id ? String(row.paragon_id) : null,
        property_name_kor: row.property_name_kor || null,
        property_name_eng: row.property_name_eng || null,
        rate_plan_codes: row.rate_plan_codes || null,
        created_at: row.created_at || null,
        chain_name_kr: chain?.name_kr || null,
        brand_name_kr: brand?.name_kr || null,
      };
    });

    return NextResponse.json<ApiResponse<HotelSearchResult[]>>({ success: true, data: searchResults, count: searchResults.length }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('API route error:', error);
    
    // JSON 파싱 오류 등 처리
    if (error instanceof SyntaxError) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid JSON format'
        },
        { status: 400 }
      );
    }

    // 기타 예상치 못한 오류
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS 메소드 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}