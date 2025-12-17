import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';
import { callOpenAI, DEFAULT_CONFIG, getOpenAIApiKey } from '@/config/openai';
import { HotelSeoManagementForm } from './hotel-seo-form';

const initialScanState = { status: 'idle' as const, message: '' };
const initialUpdateState = { status: 'idle' as const, message: '' };

// 지역 목록만 조회하는 액션
export async function fetchRegionsAction(): Promise<{ regions: Array<{ value: string; label: string }> }> {
  'use server';

  try {
    const { data: regionsData } = await supabaseServer
      .from('allstay_regions')
      .select('region_id, region_name_ko')
      .order('region_name_ko', { ascending: true });

    const regions =
      (regionsData || [])
        .filter((r) => r.region_name_ko !== null && r.region_name_ko !== undefined && r.region_name_ko.trim() !== '')
        .map((r) => ({
          value: String(r.region_id ?? ''),
          label: String(r.region_name_ko ?? ''),
        }))
        .filter((r) => r.value && r.label);

    return { regions };
  } catch (error) {
    console.error('지역 목록 조회 실패:', error);
    return { regions: [] };
  }
}

export type HotelSeoScanState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    page: number;
    perPage: number;
    totalHotels: number | null;
    totalPages: number | null;
    hotels: Array<{
      id: string;
      hotelId: string | null;
      hotelSlug: string | null;
      regionId: string | null;
      hotelNameKo: string | null;
      hotelNameEn: string | null;
      regionNameKo: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string | null;
      canonicalUrl: string | null;
      createdAt: string | null;
    }>;
    regions?: Array<{ value: string; label: string }>;
    selectedRegionId?: string | null;
  };
};

export type HotelSeoGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    hotelId: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl?: string | null;
  };
};

export type HotelSeoUpdateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    updated: number;
    errors: string[];
  };
};

export type HotelSeoBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ hotelId: string; error: string }>;
  };
};

export type HotelCanonicalUrlBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ hotelId: string; error: string }>;
  };
};

export type HotelSeoAndCanonicalBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ hotelId: string; error: string }>;
  };
};

export async function scanHotelSeoAction(
  _prevState: HotelSeoScanState,
  formData: FormData,
): Promise<HotelSeoScanState> {
  'use server';

  try {
    const regionId = String(formData.get('regionId') ?? '').trim();

    // 기본 쿼리 구성
    let query = supabaseServer
      .from('allstay_hotels')
      .select(
        'id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, seo_title, seo_description, seo_keywords, canonical_url, created_at',
        { count: 'exact' },
      )
      .not('hotel_name_ko', 'is', null);

    // 지역 필터링 (region_id 기반)
    if (regionId && regionId !== 'ALL') {
      query = query.eq('region_id', regionId);
    }

    // 정렬
    query = query.order('created_at', { ascending: false, nullsFirst: false });

    // 페이지네이션 없이 모든 호텔 조회
    let rows: unknown[] | null = null;
    let error: { message: string } | null = null;
    let totalHotels: number | null = null;

    // seo_keywords, canonical_url 포함하여 조회 시도
    const resultWithAll = await query;

    if (resultWithAll.error) {
      // seo_keywords 또는 canonical_url 컬럼이 없을 수 있으므로, 다시 시도
      let queryWithoutOptional = supabaseServer
        .from('allstay_hotels')
        .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, seo_title, seo_description, canonical_url, created_at', {
          count: 'exact',
        })
        .not('hotel_name_ko', 'is', null);

      if (regionId && regionId !== 'ALL') {
        queryWithoutOptional = queryWithoutOptional.eq('region_id', regionId);
      }

      queryWithoutOptional = queryWithoutOptional.order('created_at', { ascending: false, nullsFirst: false });

      const resultWithoutOptional = await queryWithoutOptional;

      if (resultWithoutOptional.error) {
        // canonical_url도 없을 수 있으므로, 최소 필드만 조회
        let queryMinimal = supabaseServer
          .from('allstay_hotels')
          .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, seo_title, seo_description, created_at', {
            count: 'exact',
          })
          .not('hotel_name_ko', 'is', null);

        if (regionId && regionId !== 'ALL') {
          queryMinimal = queryMinimal.eq('region_id', regionId);
        }

        queryMinimal = queryMinimal.order('created_at', { ascending: false, nullsFirst: false });

        const resultMinimal = await queryMinimal;

        rows = resultMinimal.data;
        error = resultMinimal.error;
        totalHotels = resultMinimal.count;
      } else {
        rows = resultWithoutOptional.data;
        error = resultWithoutOptional.error;
        totalHotels = resultWithoutOptional.count;
      }
    } else {
      rows = resultWithAll.data;
      error = resultWithAll.error;
      totalHotels = resultWithAll.count;
    }

    if (error) {
      return { status: 'error', message: `호텔 조회 실패: ${error.message}` };
    }

    const hotels =
      rows?.map((row) => {
        const rowData = row as {
          id: string;
          hotel_id: string | null;
          hotel_slug?: string | null;
          region_id?: string | null;
          hotel_name_ko: string | null;
          hotel_name_en: string | null;
          region_name_ko: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string | null;
          seo_keywords?: string | null;
          canonical_url?: string | null;
        };
        return {
          id: String(rowData.id),
          hotelId: rowData.hotel_id ?? null,
          hotelSlug: rowData.hotel_slug ?? null,
          regionId: rowData.region_id ?? null,
          hotelNameKo: rowData.hotel_name_ko ?? null,
          hotelNameEn: rowData.hotel_name_en ?? null,
          regionNameKo: rowData.region_name_ko ?? null,
          seoTitle: rowData.seo_title ?? null,
          seoDescription: rowData.seo_description ?? null,
          seoKeywords: rowData.seo_keywords ?? null,
          canonicalUrl: rowData.canonical_url ?? null,
          createdAt: rowData.created_at
            ? new Date(rowData.created_at).toISOString().split('T')[0]
            : null,
        };
      }) ?? [];

    // 지역 목록 조회 (드롭다운용)
    const { data: regionsData } = await supabaseServer
      .from('allstay_regions')
      .select('region_id, region_name_ko')
      .order('region_name_ko', { ascending: true });

    const regions =
      (regionsData || [])
        .filter((r) => r.region_name_ko !== null && r.region_name_ko !== undefined && r.region_name_ko.trim() !== '')
        .map((r) => ({
          value: String(r.region_id ?? ''),
          label: String(r.region_name_ko ?? ''),
        }))
        .filter((r) => r.value && r.label);

    console.log('지역 목록 조회 결과:', {
      regionsDataLength: regionsData?.length ?? 0,
      regionsLength: regions.length,
      regions,
    });

    return {
      status: 'success',
      message: `스캔 완료: ${typeof totalHotels === 'number' ? totalHotels.toLocaleString() : '알 수 없음'}개 호텔 조회${regionId && regionId !== 'ALL' ? ` (지역 필터 적용)` : ''}`,
      details: {
        page: 1,
        perPage: typeof totalHotels === 'number' ? totalHotels : 0,
        totalHotels: typeof totalHotels === 'number' ? totalHotels : null,
        totalPages: 1,
        hotels,
        regions,
        selectedRegionId: regionId || null,
      },
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : '스캔 중 알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateHotelSeoAction(
  _prevState: HotelSeoUpdateState,
  formData: FormData,
): Promise<HotelSeoUpdateState> {
  'use server';

  try {
    const hotelId = String(formData.get('hotelId') ?? '').trim();
    if (!hotelId) {
      return { status: 'error', message: '업데이트할 호텔을 선택해주세요.' };
    }

    // 기존 호텔 데이터 조회
    const { data: existingHotel, error: fetchError } = await supabaseServer
      .from('allstay_hotels')
      .select('seo_title, seo_description, seo_keywords, canonical_url')
      .eq('id', hotelId)
      .single();

    if (fetchError) {
      return { status: 'error', message: `호텔 조회 실패: ${fetchError.message}` };
    }

    // 폼에서 받은 값
    const formSeoTitle = formData.get(`seoTitle_${hotelId}`)?.toString().trim() || null;
    const formSeoDescription = formData.get(`seoDescription_${hotelId}`)?.toString().trim() || null;
    const formSeoKeywords = formData.get(`seoKeywords_${hotelId}`)?.toString().trim() || null;
    const formCanonicalUrl = formData.get(`canonicalUrl_${hotelId}`)?.toString().trim() || null;

    // 필드가 비어있으면 기존 값 유지, 값이 있으면 새 값 사용
    const seoTitle = formSeoTitle && formSeoTitle !== '' ? formSeoTitle : (existingHotel?.seo_title ?? null);
    const seoDescription = formSeoDescription && formSeoDescription !== '' ? formSeoDescription : (existingHotel?.seo_description ?? null);
    const seoKeywords = formSeoKeywords && formSeoKeywords !== '' ? formSeoKeywords : (existingHotel?.seo_keywords ?? null);
    const canonicalUrl = formCanonicalUrl && formCanonicalUrl !== '' ? formCanonicalUrl : (existingHotel?.canonical_url ?? null);

    let updated = 0;
    const errors: string[] = [];

    try {
      const updateData: Record<string, unknown> = {
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      };

      // canonical_url 컬럼이 있는 경우 추가
      if (canonicalUrl !== null && canonicalUrl !== '') {
        updateData.canonical_url = canonicalUrl;
      }

      // seo_keywords 컬럼이 있는 경우에만 추가
      if (seoKeywords !== null && seoKeywords !== '') {
        updateData.seo_keywords = seoKeywords;
      }

      const { error: updateError } = await supabaseServer
        .from('allstay_hotels')
        .update(updateData)
        .eq('id', hotelId);

      if (updateError) {
        // seo_keywords 또는 canonical_url 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도
        if (
          updateError.message.includes('seo_keywords') ||
          updateError.message.includes('canonical_url') ||
          updateError.message.includes('column')
        ) {
          const updateDataMinimal: Record<string, unknown> = {
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString(),
          };
          // canonical_url이 있고 컬럼이 존재하는 경우에만 추가
          if (canonicalUrl !== null && canonicalUrl !== '') {
            try {
              updateDataMinimal.canonical_url = canonicalUrl;
            } catch {
              // 컬럼이 없으면 제외
            }
          }
          const { error: retryError } = await supabaseServer
            .from('allstay_hotels')
            .update(updateDataMinimal)
            .eq('id', hotelId);

          if (retryError) {
            errors.push(`업데이트 실패: ${retryError.message}`);
          } else {
            updated += 1;
          }
        } else {
          errors.push(`업데이트 실패: ${updateError.message}`);
        }
      } else {
        updated += 1;
      }
    } catch (e) {
      errors.push(`처리 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }

    const summary = `완료: ${updated}개 업데이트 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 ? 'error' : 'success',
      message: summary,
      details: { updated, errors },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO 데이터 업데이트 중 오류가 발생했습니다.',
      details: { updated: 0, errors: [String(error)] },
    };
  }
}

export async function generateHotelSeoAction(
  _prevState: HotelSeoGenerateState,
  formData: FormData,
): Promise<HotelSeoGenerateState> {
  'use server';

  try {
    const hotelId = String(formData.get('hotelId') ?? '').trim();
    if (!hotelId) return { status: 'error', message: 'hotelId가 필요합니다.' };

    // 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, star_rating, hotel_address')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      return { status: 'error', message: `호텔 조회 실패: ${hotelError?.message ?? 'not found'}` };
    }

    // 호텔 리뷰 조회 (hotel_id 기준으로 모든 리뷰 조회)
    const { data: reviews } = await supabaseServer
      .from('allstay_hotel_reviews')
      .select('hotel_review, hotel_review_summary')
      .eq('hotel_id', String(hotel.hotel_id ?? ''))
      .order('created_at', { ascending: false });

    const hotelNameKo = String((hotel as { hotel_name_ko: string | null }).hotel_name_ko ?? '').trim();
    const hotelNameEn = String((hotel as { hotel_name_en: string | null }).hotel_name_en ?? '').trim();
    const regionNameKo = String((hotel as { region_name_ko: string | null }).region_name_ko ?? '').trim();
    const starRating = String((hotel as { star_rating: string | null }).star_rating ?? '').trim();
    const hotelAddress = String((hotel as { hotel_address: string | null }).hotel_address ?? '').trim();

    if (!hotelNameKo && !hotelNameEn) {
      return { status: 'error', message: '호텔명이 없어 SEO를 생성할 수 없습니다.' };
    }

    // 리뷰 텍스트 수집 (hotel_review와 hotel_review_summary 모두 활용)
    // hotel_review가 있으면 우선 사용, 없으면 hotel_review_summary 사용
    // 둘 다 있으면 모두 포함
    const reviewTexts = (reviews ?? [])
      .map((r, index) => {
        const review = String((r as { hotel_review: string | null }).hotel_review ?? '').trim();
        const summary = String((r as { hotel_review_summary: string | null }).hotel_review_summary ?? '').trim();
        
        if (review && summary) {
          // 둘 다 있으면 모두 포함
          return `리뷰 ${index + 1}:\n요약: ${summary}\n상세: ${review}`;
        } else if (review) {
          // hotel_review만 있으면 사용
          return `리뷰 ${index + 1}: ${review}`;
        } else if (summary) {
          // hotel_review_summary만 있으면 사용
          return `리뷰 ${index + 1}: ${summary}`;
        }
        return null;
      })
      .filter((text): text is string => Boolean(text));

    // 리뷰 텍스트를 합쳐서 최대 5000자까지 사용 (더 많은 리뷰 정보 활용)
    const combinedReviews = reviewTexts.join('\n\n');
    const reviewsText = combinedReviews.length > 0 
      ? `\n\n고객 리뷰 (총 ${reviewTexts.length}개):\n${combinedReviews.slice(0, 5000)}` 
      : '';

    const hotelInfo = [
      hotelNameKo ? `호텔명 (한글): ${hotelNameKo}` : '',
      hotelNameEn ? `호텔명 (영문): ${hotelNameEn}` : '',
      regionNameKo ? `지역: ${regionNameKo}` : '',
      hotelAddress ? `주소: ${hotelAddress}` : '',
      starRating ? `성급: ${starRating}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const hotelText = `${hotelInfo}${reviewsText}`;

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 호텔 정보와 고객 리뷰를 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함. 고객 리뷰에서 언급된 주요 특징이나 장점을 반영. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 호텔의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 고객 리뷰에서 언급된 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드. 고객 리뷰에서 자주 언급되는 특징이나 장점을 포함)"
}

중요: 
- seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요.
- 고객 리뷰를 반드시 참고하여 실제 고객 경험과 평가를 반영해주세요.
- 호텔의 주요 내용, 특징, 장점, 추천 포인트를 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.
- 리뷰에서 언급된 구체적인 특징(예: 위치, 시설, 서비스, 음식 등)을 활용해주세요.`;

    const userMessage = `다음 호텔 정보와 고객 리뷰를 분석하여 SEO 메타데이터를 생성해주세요:

${hotelText}

위 호텔 정보와 고객 리뷰를 읽고, 이 호텔을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 
- 고객 리뷰에서 언급된 호텔의 주요 특징, 장점, 추천 포인트를 반드시 반영해주세요.
- seoTitle은 고객 리뷰에서 자주 언급되는 키워드나 특징을 포함하여 작성해주세요. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요.
- seoDescription은 270~330자 정도로 적절한 길이로 작성하여 호텔의 핵심 내용과 매력을 잘 전달해주세요.
- seoKeywords는 고객 리뷰에서 언급된 특징이나 장점을 포함해주세요.`;

    try {
      const apiKey = getOpenAIApiKey();
      const result = await callOpenAI({
        config: {
          ...DEFAULT_CONFIG,
          responseFormat: { type: 'json_object' },
          maxTokens: 1000,
        },
        systemMessage,
        userMessage,
        apiKey,
        enableWebSearch: false,
      });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      console.log('AI SEO 생성 결과 (generateHotelSeoAction):', {
        hotelId,
        rawParsed: parsed,
        seoTitle: parsed.seoTitle,
        seoTitleTrimmed: parsed.seoTitle?.trim(),
      });

      // Canonical URL 생성 (region_slug + hotel_slug)
      const baseUrl = 'https://allstay.com';
      const regionId = String((hotel as { region_id: string | null }).region_id ?? '').trim();
      const hotelSlug = String((hotel as { hotel_slug: string | null }).hotel_slug ?? '').trim();
      const hotelIdStr = String(hotel.hotel_id ?? '').trim();

      let canonicalUrl: string | null = null;

      if (hotelSlug) {
        if (regionId) {
          // region_slug 조회
          const { data: region } = await supabaseServer
            .from('allstay_regions')
            .select('region_slug')
            .eq('region_id', regionId)
            .single();

          const regionSlug = region?.region_slug ? String(region.region_slug).trim() : null;
          if (regionSlug) {
            canonicalUrl = `${baseUrl}/${regionSlug}/${hotelSlug}`;
          } else {
            // region_slug가 없으면 hotel_slug만 사용
            canonicalUrl = `${baseUrl}/${hotelSlug}`;
          }
        } else {
          // region_id가 없으면 hotel_slug만 사용
          canonicalUrl = `${baseUrl}/${hotelSlug}`;
        }
      } else if (hotelIdStr) {
        // hotel_slug가 없으면 hotel_id 사용
        canonicalUrl = `${baseUrl}/hotel/${hotelIdStr}`;
      }

      const seoTitle = parsed.seoTitle?.trim() || null;
      const seoDescription = parsed.seoDescription?.trim() || null;
      const seoKeywords = parsed.seoKeywords?.trim() || null;

      console.log('최종 반환값 (generateHotelSeoAction):', {
        hotelId,
        seoTitle,
        seoDescription,
        seoKeywords,
        canonicalUrl,
      });

      return {
        status: 'success',
        message: 'SEO 메타데이터가 생성되었습니다.',
        details: {
          hotelId,
          seoTitle,
          seoDescription,
          seoKeywords,
          canonicalUrl,
        },
      };
    } catch (aiError) {
      return {
        status: 'error',
        message: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function generateHotelSeoAndCanonicalAction(
  _prevState: HotelSeoGenerateState,
  formData: FormData,
): Promise<HotelSeoGenerateState> {
  'use server';

  try {
    const hotelId = String(formData.get('hotelId') ?? '').trim();
    if (!hotelId) return { status: 'error', message: 'hotelId가 필요합니다.' };

    // 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, star_rating, hotel_address')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      return { status: 'error', message: `호텔 조회 실패: ${hotelError?.message ?? 'not found'}` };
    }

    // 호텔 리뷰 조회 (hotel_id 기준으로 모든 리뷰 조회)
    const { data: reviews } = await supabaseServer
      .from('allstay_hotel_reviews')
      .select('hotel_review, hotel_review_summary')
      .eq('hotel_id', String(hotel.hotel_id ?? ''))
      .order('created_at', { ascending: false });

    const hotelNameKo = String((hotel as { hotel_name_ko: string | null }).hotel_name_ko ?? '').trim();
    const hotelNameEn = String((hotel as { hotel_name_en: string | null }).hotel_name_en ?? '').trim();
    const regionNameKo = String((hotel as { region_name_ko: string | null }).region_name_ko ?? '').trim();
    const starRating = String((hotel as { star_rating: string | null }).star_rating ?? '').trim();
    const hotelAddress = String((hotel as { hotel_address: string | null }).hotel_address ?? '').trim();

    if (!hotelNameKo && !hotelNameEn) {
      return { status: 'error', message: '호텔명이 없어 SEO를 생성할 수 없습니다.' };
    }

    // 리뷰 텍스트 수집 (hotel_review와 hotel_review_summary 모두 활용)
    const reviewTexts = (reviews ?? [])
      .map((r, index) => {
        const review = String((r as { hotel_review: string | null }).hotel_review ?? '').trim();
        const summary = String((r as { hotel_review_summary: string | null }).hotel_review_summary ?? '').trim();
        
        if (review && summary) {
          return `리뷰 ${index + 1}:\n요약: ${summary}\n상세: ${review}`;
        } else if (review) {
          return `리뷰 ${index + 1}: ${review}`;
        } else if (summary) {
          return `리뷰 ${index + 1}: ${summary}`;
        }
        return null;
      })
      .filter((text): text is string => Boolean(text));

    // 리뷰 텍스트를 합쳐서 최대 5000자까지 사용
    const combinedReviews = reviewTexts.join('\n\n');
    const reviewsText = combinedReviews.length > 0 
      ? `\n\n고객 리뷰 (총 ${reviewTexts.length}개):\n${combinedReviews.slice(0, 5000)}` 
      : '';

    const hotelInfo = [
      hotelNameKo ? `호텔명 (한글): ${hotelNameKo}` : '',
      hotelNameEn ? `호텔명 (영문): ${hotelNameEn}` : '',
      regionNameKo ? `지역: ${regionNameKo}` : '',
      hotelAddress ? `주소: ${hotelAddress}` : '',
      starRating ? `성급: ${starRating}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const hotelText = `${hotelInfo}${reviewsText}`;

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 호텔 정보와 고객 리뷰를 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함. 고객 리뷰에서 언급된 주요 특징이나 장점을 반영. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 호텔의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 고객 리뷰에서 언급된 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드. 고객 리뷰에서 자주 언급되는 특징이나 장점을 포함)"
}

중요: 
- seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요.
- 고객 리뷰를 반드시 참고하여 실제 고객 경험과 평가를 반영해주세요.
- 호텔의 주요 내용, 특징, 장점, 추천 포인트를 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.
- 리뷰에서 언급된 구체적인 특징(예: 위치, 시설, 서비스, 음식 등)을 활용해주세요.`;

    const userMessage = `다음 호텔 정보와 고객 리뷰를 분석하여 SEO 메타데이터를 생성해주세요:

${hotelText}

위 호텔 정보와 고객 리뷰를 읽고, 이 호텔을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 
- 고객 리뷰에서 언급된 호텔의 주요 특징, 장점, 추천 포인트를 반드시 반영해주세요.
- seoTitle은 고객 리뷰에서 자주 언급되는 키워드나 특징을 포함하여 작성해주세요. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요.
- seoDescription은 270~330자 정도로 적절한 길이로 작성하여 호텔의 핵심 내용과 매력을 잘 전달해주세요.
- seoKeywords는 고객 리뷰에서 언급된 특징이나 장점을 포함해주세요.`;

    try {
      const apiKey = getOpenAIApiKey();
      const result = await callOpenAI({
        config: {
          ...DEFAULT_CONFIG,
          responseFormat: { type: 'json_object' },
          maxTokens: 1000,
        },
        systemMessage,
        userMessage,
        apiKey,
        enableWebSearch: false,
      });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      // Canonical URL 생성 (region_slug + hotel_slug)
      const baseUrl = 'https://allstay.com';
      const regionId = String((hotel as { region_id: string | null }).region_id ?? '').trim();
      const hotelSlug = String((hotel as { hotel_slug: string | null }).hotel_slug ?? '').trim();
      const hotelIdStr = String(hotel.hotel_id ?? '').trim();

      let canonicalUrl: string | null = null;

      if (hotelSlug) {
        if (regionId) {
          // region_slug 조회
          const { data: region } = await supabaseServer
            .from('allstay_regions')
            .select('region_slug')
            .eq('region_id', regionId)
            .single();

          const regionSlug = region?.region_slug ? String(region.region_slug).trim() : null;
          if (regionSlug) {
            canonicalUrl = `${baseUrl}/${regionSlug}/${hotelSlug}`;
          } else {
            // region_slug가 없으면 hotel_slug만 사용
            canonicalUrl = `${baseUrl}/${hotelSlug}`;
          }
        } else {
          // region_id가 없으면 hotel_slug만 사용
          canonicalUrl = `${baseUrl}/${hotelSlug}`;
        }
      } else if (hotelIdStr) {
        // hotel_slug가 없으면 hotel_id 사용
        canonicalUrl = `${baseUrl}/hotel/${hotelIdStr}`;
      }

      const seoTitle = parsed.seoTitle?.trim() || null;
      const seoDescription = parsed.seoDescription?.trim() || null;
      const seoKeywords = parsed.seoKeywords?.trim() || null;

      // DB에 저장 (SEO + Canonical URL 모두)
      const updateData: Record<string, unknown> = {
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      };

      // seo_keywords 컬럼이 있는 경우에만 추가
      if (seoKeywords !== null && seoKeywords !== '') {
        updateData.seo_keywords = seoKeywords;
      }

      // canonical_url 추가
      if (canonicalUrl !== null) {
        updateData.canonical_url = canonicalUrl;
      }

      const { error: updateError } = await supabaseServer
        .from('allstay_hotels')
        .update(updateData)
        .eq('id', hotelId);

      if (updateError) {
        // seo_keywords 또는 canonical_url 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도
        if (
          updateError.message.includes('seo_keywords') ||
          updateError.message.includes('canonical_url') ||
          updateError.message.includes('column')
        ) {
          const updateDataMinimal: Record<string, unknown> = {
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString(),
          };
          // canonical_url이 있고 컬럼이 존재하는 경우에만 추가
          if (canonicalUrl !== null) {
            try {
              updateDataMinimal.canonical_url = canonicalUrl;
            } catch {
              // 컬럼이 없으면 제외
            }
          }
          const { error: retryError } = await supabaseServer
            .from('allstay_hotels')
            .update(updateDataMinimal)
            .eq('id', hotelId);

          if (retryError) {
            return {
              status: 'error',
              message: `저장 실패: ${retryError.message}`,
            };
          }
        } else {
          return {
            status: 'error',
            message: `저장 실패: ${updateError.message}`,
          };
        }
      }

      return {
        status: 'success',
        message: 'AI SEO와 Canonical URL이 생성되어 저장되었습니다.',
        details: {
          hotelId,
          seoTitle,
          seoDescription,
          seoKeywords,
          canonicalUrl,
        },
      };
    } catch (aiError) {
      return {
        status: 'error',
        message: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO & Canonical URL 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function generateBulkHotelSeoAction(
  _prevState: HotelSeoBulkGenerateState,
  formData: FormData,
): Promise<HotelSeoBulkGenerateState> {
  'use server';

  try {
    const hotelIdsRaw = formData
      .getAll('hotelIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const hotelIds = Array.from(new Set(hotelIdsRaw));

    if (hotelIds.length === 0) {
      return { status: 'error', message: '선택된 호텔이 없습니다.' };
    }

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ hotelId: string; error: string }> = [];

    // 선택된 호텔들을 조회
    const { data: hotels, error: fetchError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, star_rating, hotel_address')
      .in('id', hotelIds);

    if (fetchError) {
      return { status: 'error', message: `호텔 조회 실패: ${fetchError.message}` };
    }

    if (!hotels || hotels.length === 0) {
      return { status: 'error', message: '선택된 호텔을 찾을 수 없습니다.' };
    }

    const apiKey = getOpenAIApiKey();

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 호텔 정보와 고객 리뷰를 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함. 고객 리뷰에서 언급된 주요 특징이나 장점을 반영. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 호텔의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 고객 리뷰에서 언급된 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드. 고객 리뷰에서 자주 언급되는 특징이나 장점을 포함)"
}

중요: 
- seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요.
- 고객 리뷰를 반드시 참고하여 실제 고객 경험과 평가를 반영해주세요.
- 호텔의 주요 내용, 특징, 장점, 추천 포인트를 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.
- 리뷰에서 언급된 구체적인 특징(예: 위치, 시설, 서비스, 음식 등)을 활용해주세요.`;

    // 각 호텔에 대해 순차적으로 AI SEO 생성 및 저장
    for (const hotel of hotels) {
      const hotelId = String(hotel.id);
      const hotelIdStr = String(hotel.hotel_id ?? '').trim();
      const hotelNameKo = String((hotel as { hotel_name_ko: string | null }).hotel_name_ko ?? '').trim();
      const hotelNameEn = String((hotel as { hotel_name_en: string | null }).hotel_name_en ?? '').trim();
      const regionNameKo = String((hotel as { region_name_ko: string | null }).region_name_ko ?? '').trim();
      const starRating = String((hotel as { star_rating: string | null }).star_rating ?? '').trim();
      const hotelAddress = String((hotel as { hotel_address: string | null }).hotel_address ?? '').trim();

      if (!hotelNameKo && !hotelNameEn) {
        skipped += 1;
        errors.push({ hotelId, error: '호텔명이 없어 SEO를 생성할 수 없습니다.' });
        continue;
      }

      try {
        // 호텔 리뷰 조회 (hotel_id 기준으로 모든 리뷰 조회)
        const { data: reviews } = await supabaseServer
          .from('allstay_hotel_reviews')
          .select('hotel_review, hotel_review_summary')
          .eq('hotel_id', hotelIdStr)
          .order('created_at', { ascending: false });

        // 리뷰 텍스트 수집 (hotel_review와 hotel_review_summary 모두 활용)
        const reviewTexts = (reviews ?? [])
          .map((r, index) => {
            const review = String((r as { hotel_review: string | null }).hotel_review ?? '').trim();
            const summary = String((r as { hotel_review_summary: string | null }).hotel_review_summary ?? '').trim();
            
            if (review && summary) {
              return `리뷰 ${index + 1}:\n요약: ${summary}\n상세: ${review}`;
            } else if (review) {
              return `리뷰 ${index + 1}: ${review}`;
            } else if (summary) {
              return `리뷰 ${index + 1}: ${summary}`;
            }
            return null;
          })
          .filter((text): text is string => Boolean(text));

        // 리뷰 텍스트를 합쳐서 최대 5000자까지 사용
        const combinedReviews = reviewTexts.join('\n\n');
        const reviewsText = combinedReviews.length > 0 
          ? `\n\n고객 리뷰 (총 ${reviewTexts.length}개):\n${combinedReviews.slice(0, 5000)}` 
          : '';

        const hotelInfo = [
          hotelNameKo ? `호텔명 (한글): ${hotelNameKo}` : '',
          hotelNameEn ? `호텔명 (영문): ${hotelNameEn}` : '',
          regionNameKo ? `지역: ${regionNameKo}` : '',
          hotelAddress ? `주소: ${hotelAddress}` : '',
          starRating ? `성급: ${starRating}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const hotelText = `${hotelInfo}${reviewsText}`;

        const userMessage = `다음 호텔 정보와 고객 리뷰를 분석하여 SEO 메타데이터를 생성해주세요:

${hotelText}

위 호텔 정보와 고객 리뷰를 읽고, 이 호텔을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 
- 고객 리뷰에서 언급된 호텔의 주요 특징, 장점, 추천 포인트를 반드시 반영해주세요.
- seoTitle은 고객 리뷰에서 자주 언급되는 키워드나 특징을 포함하여 작성해주세요. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요.
- seoDescription은 270~330자 정도로 적절한 길이로 작성하여 호텔의 핵심 내용과 매력을 잘 전달해주세요.
- seoKeywords는 고객 리뷰에서 언급된 특징이나 장점을 포함해주세요.`;

        const result = await callOpenAI({
          config: {
            ...DEFAULT_CONFIG,
            responseFormat: { type: 'json_object' },
            maxTokens: 1000,
          },
          systemMessage,
          userMessage,
          apiKey,
          enableWebSearch: false,
        });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      console.log('AI SEO 생성 결과 (generateBulkHotelSeoAction):', {
        hotelId,
        rawParsed: parsed,
        seoTitle: parsed.seoTitle,
        seoTitleTrimmed: parsed.seoTitle?.trim(),
      });

      // seoTitle이 빈 문자열이거나 undefined/null이면 null로 처리
      const seoTitle = parsed.seoTitle?.trim() && parsed.seoTitle.trim() !== '' ? parsed.seoTitle.trim() : null;
      const seoDescription = parsed.seoDescription?.trim() && parsed.seoDescription.trim() !== '' ? parsed.seoDescription.trim() : null;
      const seoKeywords = parsed.seoKeywords?.trim() && parsed.seoKeywords.trim() !== '' ? parsed.seoKeywords.trim() : null;

        // DB에 저장
        const updateData: Record<string, unknown> = {
          seo_title: seoTitle,
          seo_description: seoDescription,
          updated_at: new Date().toISOString(),
        };

        // seo_keywords 컬럼이 있는 경우에만 추가
        if (seoKeywords !== null && seoKeywords !== '') {
          updateData.seo_keywords = seoKeywords;
        }

        const { error: updateError } = await supabaseServer
          .from('allstay_hotels')
          .update(updateData)
          .eq('id', hotelId);

        if (updateError) {
          // seo_keywords 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도 (seo_keywords 제외)
          if (updateError.message.includes('seo_keywords') || updateError.message.includes('column')) {
            const updateDataWithoutKeywords: Record<string, unknown> = {
              seo_title: seoTitle,
              seo_description: seoDescription,
              updated_at: new Date().toISOString(),
            };
            const { error: retryError } = await supabaseServer
              .from('allstay_hotels')
              .update(updateDataWithoutKeywords)
              .eq('id', hotelId);

            if (retryError) {
              errors.push({ hotelId, error: `저장 실패: ${retryError.message}` });
              skipped += 1;
            } else {
              generated += 1;
            }
          } else {
            errors.push({ hotelId, error: `저장 실패: ${updateError.message}` });
            skipped += 1;
          }
        } else {
          generated += 1;
        }
      } catch (aiError) {
        errors.push({
          hotelId,
          error: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
        });
        skipped += 1;
      }
    }

    const summary = `완료: 총 ${hotelIds.length}개 중 ${generated}개 생성 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 && generated === 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: hotelIds.length,
        generated,
        skipped,
        errors: errors.slice(0, 50), // 최대 50개만 표시
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 SEO 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        generated: 0,
        skipped: 0,
        errors: [{ hotelId: '', error: String(error) }],
      },
    };
  }
}

export async function extractHotelCanonicalUrlAction(
  _prevState: { status: 'idle' | 'success' | 'error'; message: string; canonicalUrl?: string | null; hotelId?: string },
  formData: FormData,
): Promise<{ status: 'idle' | 'success' | 'error'; message: string; canonicalUrl?: string | null; hotelId?: string }> {
  'use server';

  try {
    const hotelId = String(formData.get('hotelId') ?? '').trim();
    if (!hotelId) {
      return { status: 'error', message: 'hotelId가 필요합니다.' };
    }

    // 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id')
      .eq('id', hotelId)
      .single();

    if (hotelError || !hotel) {
      return { status: 'error', message: `호텔 조회 실패: ${hotelError?.message ?? 'not found'}` };
    }

    const baseUrl = 'https://allstay.com';
    const hotelIdStr = String(hotel.hotel_id ?? '').trim();
    const hotelSlug = String((hotel as { hotel_slug: string | null }).hotel_slug ?? '').trim();
    const regionId = String((hotel as { region_id: string | null }).region_id ?? '').trim();

    if (!hotelSlug && !hotelIdStr) {
      return { status: 'error', message: 'hotel_slug와 hotel_id가 모두 없어 Canonical URL을 생성할 수 없습니다.' };
    }

    let canonicalUrl: string | null = null;

    if (hotelSlug) {
      if (regionId) {
        // region_slug 조회
        const { data: region } = await supabaseServer
          .from('allstay_regions')
          .select('region_slug')
          .eq('region_id', regionId)
          .single();

        const regionSlug = region?.region_slug ? String(region.region_slug).trim() : null;
        if (regionSlug) {
          canonicalUrl = `${baseUrl}/${regionSlug}/${hotelSlug}`;
        } else {
          // region_slug가 없으면 hotel_slug만 사용
          canonicalUrl = `${baseUrl}/${hotelSlug}`;
        }
      } else {
        // region_id가 없으면 hotel_slug만 사용
        canonicalUrl = `${baseUrl}/${hotelSlug}`;
      }
    } else if (hotelIdStr) {
      // hotel_slug가 없으면 hotel_id 사용
      canonicalUrl = `${baseUrl}/hotel/${hotelIdStr}`;
    }

    return {
      status: 'success',
      message: 'Canonical URL이 추출되었습니다.',
      canonicalUrl,
      hotelId,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Canonical URL 추출 중 오류가 발생했습니다.',
      hotelId: undefined,
    };
  }
}

export async function generateBulkHotelCanonicalUrlAction(
  _prevState: HotelCanonicalUrlBulkGenerateState,
  formData: FormData,
): Promise<HotelCanonicalUrlBulkGenerateState> {
  'use server';

  try {
    const hotelIdsRaw = formData
      .getAll('hotelIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const hotelIds = Array.from(new Set(hotelIdsRaw));

    if (hotelIds.length === 0) {
      return { status: 'error', message: '선택된 호텔이 없습니다.' };
    }

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ hotelId: string; error: string }> = [];

    // 선택된 호텔들을 조회
    const { data: hotels, error: fetchError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id')
      .in('id', hotelIds);

    if (fetchError) {
      return { status: 'error', message: `호텔 조회 실패: ${fetchError.message}` };
    }

    if (!hotels || hotels.length === 0) {
      return { status: 'error', message: '선택된 호텔을 찾을 수 없습니다.' };
    }

    const baseUrl = 'https://allstay.com';

    // 각 호텔에 대해 Canonical URL 생성 및 저장
    for (const hotel of hotels) {
      const hotelId = String(hotel.id);
      const hotelIdStr = String(hotel.hotel_id ?? '').trim();
      const hotelSlug = String((hotel as { hotel_slug: string | null }).hotel_slug ?? '').trim();
      const regionId = String((hotel as { region_id: string | null }).region_id ?? '').trim();

      if (!hotelSlug && !hotelIdStr) {
        skipped += 1;
        errors.push({ hotelId, error: 'hotel_slug와 hotel_id가 모두 없어 Canonical URL을 생성할 수 없습니다.' });
        continue;
      }

      try {
        let canonicalUrl: string | null = null;

        if (hotelSlug) {
          if (regionId) {
            // region_slug 조회
            const { data: region } = await supabaseServer
              .from('allstay_regions')
              .select('region_slug')
              .eq('region_id', regionId)
              .single();

            const regionSlug = region?.region_slug ? String(region.region_slug).trim() : null;
            if (regionSlug) {
              canonicalUrl = `${baseUrl}/${regionSlug}/${hotelSlug}`;
            } else {
              // region_slug가 없으면 hotel_slug만 사용
              canonicalUrl = `${baseUrl}/${hotelSlug}`;
            }
          } else {
            // region_id가 없으면 hotel_slug만 사용
            canonicalUrl = `${baseUrl}/${hotelSlug}`;
          }
        } else if (hotelIdStr) {
          // hotel_slug가 없으면 hotel_id 사용
          canonicalUrl = `${baseUrl}/hotel/${hotelIdStr}`;
        }

        // DB에 저장
        const updateData: Record<string, unknown> = {
          canonical_url: canonicalUrl,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabaseServer
          .from('allstay_hotels')
          .update(updateData)
          .eq('id', hotelId);

        if (updateError) {
          // canonical_url 컬럼이 없어서 발생한 에러일 수 있음
          if (updateError.message.includes('canonical_url') || updateError.message.includes('column')) {
            errors.push({
              hotelId,
              error: `canonical_url 컬럼이 없습니다. 데이터베이스에 컬럼을 추가해주세요.`,
            });
            skipped += 1;
          } else {
            errors.push({ hotelId, error: `저장 실패: ${updateError.message}` });
            skipped += 1;
          }
        } else {
          generated += 1;
        }
      } catch (e) {
        errors.push({
          hotelId,
          error: `처리 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`,
        });
        skipped += 1;
      }
    }

    const summary = `완료: 총 ${hotelIds.length}개 중 ${generated}개 생성 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 && generated === 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: hotelIds.length,
        generated,
        skipped,
        errors: errors.slice(0, 50),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 Canonical URL 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        generated: 0,
        skipped: 0,
        errors: [{ hotelId: '', error: String(error) }],
      },
    };
  }
}

export async function generateBulkHotelSeoAndCanonicalAction(
  _prevState: HotelSeoAndCanonicalBulkGenerateState,
  formData: FormData,
): Promise<HotelSeoAndCanonicalBulkGenerateState> {
  'use server';

  try {
    const hotelIdsRaw = formData
      .getAll('hotelIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const hotelIds = Array.from(new Set(hotelIdsRaw));

    if (hotelIds.length === 0) {
      return { status: 'error', message: '선택된 호텔이 없습니다.' };
    }

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ hotelId: string; error: string }> = [];

    // 선택된 호텔들을 조회
    const { data: hotels, error: fetchError } = await supabaseServer
      .from('allstay_hotels')
      .select('id, hotel_id, hotel_slug, region_id, hotel_name_ko, hotel_name_en, region_name_ko, star_rating, hotel_address')
      .in('id', hotelIds);

    if (fetchError) {
      return { status: 'error', message: `호텔 조회 실패: ${fetchError.message}` };
    }

    if (!hotels || hotels.length === 0) {
      return { status: 'error', message: '선택된 호텔을 찾을 수 없습니다.' };
    }

    const apiKey = getOpenAIApiKey();
    const baseUrl = 'https://allstay.com';

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 호텔 정보를 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 호텔의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 호텔의 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드)"
}

중요: seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요. 호텔의 주요 내용, 특징, 장점, 추천 포인트 등을 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.`;

    // 각 호텔에 대해 순차적으로 AI SEO + Canonical URL 생성 및 저장
    for (const hotel of hotels) {
      const hotelId = String(hotel.id);
      const hotelIdStr = String(hotel.hotel_id ?? '').trim();
      const hotelSlug = String((hotel as { hotel_slug: string | null }).hotel_slug ?? '').trim();
      const regionId = String((hotel as { region_id: string | null }).region_id ?? '').trim();
      const hotelNameKo = String((hotel as { hotel_name_ko: string | null }).hotel_name_ko ?? '').trim();
      const hotelNameEn = String((hotel as { hotel_name_en: string | null }).hotel_name_en ?? '').trim();
      const regionNameKo = String((hotel as { region_name_ko: string | null }).region_name_ko ?? '').trim();
      const starRating = String((hotel as { star_rating: string | null }).star_rating ?? '').trim();
      const hotelAddress = String((hotel as { hotel_address: string | null }).hotel_address ?? '').trim();

      if (!hotelNameKo && !hotelNameEn) {
        skipped += 1;
        errors.push({ hotelId, error: '호텔명이 없어 SEO를 생성할 수 없습니다.' });
        continue;
      }

      try {
        // 호텔 리뷰 조회 (hotel_id 기준으로 모든 리뷰 조회)
        const { data: reviews } = await supabaseServer
          .from('allstay_hotel_reviews')
          .select('hotel_review, hotel_review_summary')
          .eq('hotel_id', hotelIdStr)
          .order('created_at', { ascending: false });

        // 리뷰 텍스트 수집 (hotel_review와 hotel_review_summary 모두 활용)
        const reviewTexts = (reviews ?? [])
          .map((r, index) => {
            const review = String((r as { hotel_review: string | null }).hotel_review ?? '').trim();
            const summary = String((r as { hotel_review_summary: string | null }).hotel_review_summary ?? '').trim();
            
            if (review && summary) {
              return `리뷰 ${index + 1}:\n요약: ${summary}\n상세: ${review}`;
            } else if (review) {
              return `리뷰 ${index + 1}: ${review}`;
            } else if (summary) {
              return `리뷰 ${index + 1}: ${summary}`;
            }
            return null;
          })
          .filter((text): text is string => Boolean(text));

        // 리뷰 텍스트를 합쳐서 최대 5000자까지 사용
        const combinedReviews = reviewTexts.join('\n\n');
        const reviewsText = combinedReviews.length > 0 
          ? `\n\n고객 리뷰 (총 ${reviewTexts.length}개):\n${combinedReviews.slice(0, 5000)}` 
          : '';

        const hotelInfo = [
          hotelNameKo ? `호텔명 (한글): ${hotelNameKo}` : '',
          hotelNameEn ? `호텔명 (영문): ${hotelNameEn}` : '',
          regionNameKo ? `지역: ${regionNameKo}` : '',
          hotelAddress ? `주소: ${hotelAddress}` : '',
          starRating ? `성급: ${starRating}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const hotelText = `${hotelInfo}${reviewsText}`;

        const userMessage = `다음 호텔 정보와 고객 리뷰를 분석하여 SEO 메타데이터를 생성해주세요:

${hotelText}

위 호텔 정보와 고객 리뷰를 읽고, 이 호텔을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 
- 고객 리뷰에서 언급된 호텔의 주요 특징, 장점, 추천 포인트를 반드시 반영해주세요.
- seoTitle은 고객 리뷰에서 자주 언급되는 키워드나 특징을 포함하여 작성해주세요. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요.
- seoDescription은 270~330자 정도로 적절한 길이로 작성하여 호텔의 핵심 내용과 매력을 잘 전달해주세요.
- seoKeywords는 고객 리뷰에서 언급된 특징이나 장점을 포함해주세요.`;

        const result = await callOpenAI({
          config: {
            ...DEFAULT_CONFIG,
            responseFormat: { type: 'json_object' },
            maxTokens: 1000,
          },
          systemMessage,
          userMessage,
          apiKey,
          enableWebSearch: false,
        });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      console.log('AI SEO 생성 결과 (generateBulkHotelSeoAction):', {
        hotelId,
        rawParsed: parsed,
        seoTitle: parsed.seoTitle,
        seoTitleTrimmed: parsed.seoTitle?.trim(),
      });

      // seoTitle이 빈 문자열이거나 undefined/null이면 null로 처리
      const seoTitle = parsed.seoTitle?.trim() && parsed.seoTitle.trim() !== '' ? parsed.seoTitle.trim() : null;
      const seoDescription = parsed.seoDescription?.trim() && parsed.seoDescription.trim() !== '' ? parsed.seoDescription.trim() : null;
      const seoKeywords = parsed.seoKeywords?.trim() && parsed.seoKeywords.trim() !== '' ? parsed.seoKeywords.trim() : null;

        // Canonical URL 생성 (region_slug + hotel_slug)
        let canonicalUrl: string | null = null;

        if (hotelSlug) {
          if (regionId) {
            // region_slug 조회
            const { data: region } = await supabaseServer
              .from('allstay_regions')
              .select('region_slug')
              .eq('region_id', regionId)
              .single();

            const regionSlug = region?.region_slug ? String(region.region_slug).trim() : null;
            if (regionSlug) {
              canonicalUrl = `${baseUrl}/${regionSlug}/${hotelSlug}`;
            } else {
              // region_slug가 없으면 hotel_slug만 사용
              canonicalUrl = `${baseUrl}/${hotelSlug}`;
            }
          } else {
            // region_id가 없으면 hotel_slug만 사용
            canonicalUrl = `${baseUrl}/${hotelSlug}`;
          }
        } else if (hotelIdStr) {
          // hotel_slug가 없으면 hotel_id 사용
          canonicalUrl = `${baseUrl}/hotel/${hotelIdStr}`;
        }

        // DB에 저장 (SEO + Canonical URL 모두)
        const updateData: Record<string, unknown> = {
          seo_title: seoTitle,
          seo_description: seoDescription,
          updated_at: new Date().toISOString(),
        };

        // seo_keywords 컬럼이 있는 경우에만 추가
        if (seoKeywords !== null && seoKeywords !== '') {
          updateData.seo_keywords = seoKeywords;
        }

        // canonical_url 추가
        if (canonicalUrl !== null) {
          updateData.canonical_url = canonicalUrl;
        }

        const { error: updateError } = await supabaseServer
          .from('allstay_hotels')
          .update(updateData)
          .eq('id', hotelId);

        if (updateError) {
          // seo_keywords 또는 canonical_url 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도
          if (updateError.message.includes('seo_keywords') || updateError.message.includes('canonical_url') || updateError.message.includes('column')) {
            const updateDataMinimal: Record<string, unknown> = {
              seo_title: seoTitle,
              seo_description: seoDescription,
              updated_at: new Date().toISOString(),
            };
            // canonical_url이 있고 컬럼이 존재하는 경우에만 추가
            if (canonicalUrl !== null) {
              try {
                updateDataMinimal.canonical_url = canonicalUrl;
              } catch {
                // 컬럼이 없으면 제외
              }
            }
            const { error: retryError } = await supabaseServer
              .from('allstay_hotels')
              .update(updateDataMinimal)
              .eq('id', hotelId);

            if (retryError) {
              errors.push({ hotelId, error: `저장 실패: ${retryError.message}` });
              skipped += 1;
            } else {
              generated += 1;
            }
          } else {
            errors.push({ hotelId, error: `저장 실패: ${updateError.message}` });
            skipped += 1;
          }
        } else {
          generated += 1;
        }
      } catch (aiError) {
        errors.push({
          hotelId,
          error: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
        });
        skipped += 1;
      }
    }

    const summary = `완료: 총 ${hotelIds.length}개 중 ${generated}개 생성 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 && generated === 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: hotelIds.length,
        generated,
        skipped,
        errors: errors.slice(0, 50),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 SEO & Canonical URL 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        generated: 0,
        skipped: 0,
        errors: [{ hotelId: '', error: String(error) }],
      },
    };
  }
}

export default function HotelSeoPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>호텔 페이지 SEO 관리</CardTitle>
            <CardDescription>
              `allstay_hotels` 테이블의 호텔에 대한 SEO 메타데이터(제목, 설명, 키워드, Canonical URL)를 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              - <span className="font-medium text-foreground">호텔명 (hotel_name_ko/en)</span>: 호텔의 실제 이름
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 제목 (seo_title)</span>: 검색 결과에 표시될 제목 (호텔명과 별도)
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 설명 (seo_description)</span>: 검색 결과에 표시될 설명
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 키워드 (seo_keywords)</span>: 검색 엔진 최적화를 위한 키워드
            </p>
            <p>
              - <span className="font-medium text-foreground">Canonical URL (canonical_url)</span>: 검색 엔진에 표시할 정규화된 URL (비워두면 기본 URL 사용)
            </p>
          </CardContent>
        </Card>

        <HotelSeoManagementForm
          scanAction={scanHotelSeoAction}
          initialScanState={initialScanState}
          updateAction={updateHotelSeoAction}
          initialUpdateState={initialUpdateState}
          generateAction={generateHotelSeoAction}
          initialGenerateState={{ status: 'idle', message: '' }}
          bulkGenerateAction={generateBulkHotelSeoAction}
          initialBulkGenerateState={{ status: 'idle', message: '' }}
          bulkGenerateCanonicalUrlAction={generateBulkHotelCanonicalUrlAction}
          initialBulkGenerateCanonicalUrlState={{ status: 'idle', message: '' }}
          bulkGenerateSeoAndCanonicalAction={generateBulkHotelSeoAndCanonicalAction}
          initialBulkGenerateSeoAndCanonicalState={{ status: 'idle', message: '' }}
          extractCanonicalUrlAction={extractHotelCanonicalUrlAction}
          initialExtractCanonicalUrlState={{ status: 'idle', message: '', hotelId: undefined }}
          generateSeoAndCanonicalAction={generateHotelSeoAndCanonicalAction}
          initialGenerateSeoAndCanonicalState={{ status: 'idle', message: '' }}
        />
      </div>
    </div>
  );
}
