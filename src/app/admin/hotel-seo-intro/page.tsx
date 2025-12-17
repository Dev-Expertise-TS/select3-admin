import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { callOpenAI, DEFAULT_CONFIG, getOpenAIApiKey } from '@/config/openai';
import { HotelSeoIntroManagementForm } from './hotel-seo-intro-form';

const initialScanState = { status: 'idle' as const, message: '' };
const initialUpdateState = { status: 'idle' as const, message: '' };

export type HotelSeoIntroScanState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    hotels: Array<{
      sabreId: string;
      propertyNameKo: string | null;
      propertyNameEn: string | null;
      slug: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string | null;
      canonicalUrl: string | null;
    }>;
  };
};

export type HotelSeoIntroGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    sabreId: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl?: string | null;
  };
};

export type HotelSeoIntroUpdateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    updated: number;
    errors: string[];
  };
};

export type HotelSeoIntroBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    success: number;
    errors: Array<{ sabreId: string; error: string }>;
  };
};

export async function scanHotelSeoIntroAction(
  _prevState: HotelSeoIntroScanState,
  formData: FormData,
): Promise<HotelSeoIntroScanState> {
  'use server';

  try {
    const searchQuery = String(formData.get('searchQuery') ?? '').trim();

    const supabase = createServiceRoleClient();
    let query = supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, slug, seo_title, seo_description, seo_keywords, canonical_url')
      .not('property_name_ko', 'is', null)
      .order('sabre_id', { ascending: true })
      .limit(100);

    // 검색어가 있으면 필터링
    if (searchQuery) {
      query = query.or(`property_name_ko.ilike.%${searchQuery}%,property_name_en.ilike.%${searchQuery}%,sabre_id.eq.${searchQuery}`);
    }

    const { data, error } = await query;

    if (error) {
      return { status: 'error', message: `호텔 조회 실패: ${error.message}` };
    }

    const hotels =
      data?.map((row) => ({
        sabreId: String(row.sabre_id),
        propertyNameKo: row.property_name_ko ?? null,
        propertyNameEn: row.property_name_en ?? null,
        slug: row.slug ?? null,
        seoTitle: row.seo_title ?? null,
        seoDescription: row.seo_description ?? null,
        seoKeywords: row.seo_keywords ?? null,
        canonicalUrl: row.canonical_url ?? null,
      })) ?? [];

    return {
      status: 'success',
      message: `조회 완료: ${hotels.length.toLocaleString()}개 호텔`,
      details: {
        hotels,
      },
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : '스캔 중 알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateHotelSeoIntroAction(
  _prevState: HotelSeoIntroUpdateState,
  formData: FormData,
): Promise<HotelSeoIntroUpdateState> {
  'use server';

  try {
    const sabreId = String(formData.get('sabreId') ?? '').trim();
    if (!sabreId) {
      return { status: 'error', message: '업데이트할 호텔을 선택해주세요.' };
    }

    // 기존 호텔 데이터 조회
    const supabase = createServiceRoleClient();
    const { data: existingHotel, error: fetchError } = await supabase
      .from('select_hotels')
      .select('seo_title, seo_description, seo_keywords, canonical_url')
      .eq('sabre_id', sabreId)
      .single();

    if (fetchError) {
      return { status: 'error', message: `호텔 조회 실패: ${fetchError.message}` };
    }

    // 폼에서 받은 값
    const formSeoTitle = formData.get(`seoTitle_${sabreId}`)?.toString().trim() || null;
    const formSeoDescription = formData.get(`seoDescription_${sabreId}`)?.toString().trim() || null;
    const formSeoKeywords = formData.get(`seoKeywords_${sabreId}`)?.toString().trim() || null;
    const formCanonicalUrl = formData.get(`canonicalUrl_${sabreId}`)?.toString().trim() || null;

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

      const { error: updateError } = await supabase
        .from('select_hotels')
        .update(updateData)
        .eq('sabre_id', sabreId);

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
          const { error: retryError } = await supabase
            .from('select_hotels')
            .update(updateDataMinimal)
            .eq('sabre_id', sabreId);

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

export async function generateHotelSeoIntroAction(
  _prevState: HotelSeoIntroGenerateState,
  formData: FormData,
): Promise<HotelSeoIntroGenerateState> {
  'use server';

  try {
    const sabreId = String(formData.get('sabreId') ?? '').trim();
    if (!sabreId) return { status: 'error', message: 'sabreId가 필요합니다.' };

    // 호텔 정보 조회
    const supabase = createServiceRoleClient();
    const { data: hotel, error: hotelError } = await supabase
      .from('select_hotels')
      .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko, slug, property_details')
      .eq('sabre_id', sabreId)
      .single();

    if (hotelError || !hotel) {
      return { status: 'error', message: `호텔 조회 실패: ${hotelError?.message ?? 'not found'}` };
    }

    const propertyNameKo = String(hotel.property_name_ko ?? '').trim();
    const propertyNameEn = String(hotel.property_name_en ?? '').trim();
    const cityKo = String(hotel.city_ko ?? '').trim();
    const countryKo = String(hotel.country_ko ?? '').trim();
    const propertyAddress = String(hotel.property_address ?? '').trim();
    const propertyDetails = hotel.property_details;

    if (!propertyNameKo && !propertyNameEn) {
      return { status: 'error', message: '호텔명이 없어 SEO를 생성할 수 없습니다.' };
    }

    // property_details 처리 (HTML이거나 객체일 수 있음)
    let propertyDetailsText = '';
    if (propertyDetails) {
      if (typeof propertyDetails === 'string') {
        // HTML 태그 제거 (간단한 정규식)
        propertyDetailsText = propertyDetails
          .replace(/<[^>]*>/g, ' ') // HTML 태그 제거
          .replace(/\s+/g, ' ') // 연속된 공백 제거
          .trim();
      } else if (typeof propertyDetails === 'object') {
        // 객체인 경우 JSON 문자열로 변환
        try {
          propertyDetailsText = JSON.stringify(propertyDetails);
        } catch {
          propertyDetailsText = String(propertyDetails);
        }
      } else {
        propertyDetailsText = String(propertyDetails);
      }
    }

    const hotelInfo = [
      propertyNameKo ? `호텔명 (한글): ${propertyNameKo}` : '',
      propertyNameEn ? `호텔명 (영문): ${propertyNameEn}` : '',
      cityKo ? `도시: ${cityKo}` : '',
      countryKo ? `국가: ${countryKo}` : '',
      propertyAddress ? `주소: ${propertyAddress}` : '',
      propertyDetailsText ? `호텔 소개: ${propertyDetailsText.slice(0, 2000)}` : '', // 최대 2000자까지만
    ]
      .filter(Boolean)
      .join('\n');

    // AI 프롬프트 생성 - 고객 Intent 중심
    const systemMessage = `당신은 SEO 및 고객 행동 분석 전문가입니다. 호텔을 찾는 고객들의 검색 의도(Intent)를 깊이 있게 분석하여, 실제 고객이 검색할 때 클릭하고 싶어지는 SEO 메타데이터를 생성해주세요.

고객 검색 Intent 유형:
1. **정보 수집 Intent**: 호텔 정보, 위치, 시설, 서비스에 대한 정보를 찾는 고객
2. **비교 검색 Intent**: 여러 호텔을 비교하여 최적의 선택을 찾는 고객
3. **예약 의도 Intent**: 구체적인 예약을 위해 호텔을 검색하는 고객
4. **리뷰 확인 Intent**: 다른 고객의 경험과 평가를 확인하려는 고객
5. **특정 니즈 Intent**: 특정 시설(수영장, 피트니스, 레스토랑 등)이나 위치를 찾는 고객

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 고객이 실제로 검색할 키워드 포함. 예약 의도와 정보 수집 의도를 모두 반영. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요. **중요: 제목은 반드시 완성된 문장이나 명사구로 끝나야 합니다. 형용사(예: '럭셔리', '프리미엄')나 불완전한 단어로 끝나지 않도록 주의하세요. 예: '럭셔리 호텔', '프리미엄 호텔 예약', '최고급 호텔 추천' 등 완성된 형태로 작성해주세요.** **한글 문장 자연스러움: 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함한 자연스러운 한글 문장 구조로 작성해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 고객이 찾는 핵심 정보(위치, 시설, 가격, 특징)를 포함하고, 클릭하고 싶게 만드는 매력적인 내용. 예약 전환을 유도하는 요소 포함)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 고객이 실제로 검색할 키워드. 호텔명, 지역, 시설, 특징 등 검색 의도와 관련된 키워드)"
}

중요: 
- seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요.
- 고객이 실제로 검색할 키워드(예: "서울 호텔 예약", "제주 리조트 추천", "프리미엄 호텔 비교" 등)를 자연스럽게 포함해주세요.
- 고객이 가장 관심 있어 하는 정보(위치, 가격, 시설, 서비스, 리뷰)를 우선적으로 언급해주세요.
- 호텔 소개 내용(property_details)과 웹 검색 결과를 활용하여 고객의 실제 니즈를 반영해주세요.
- 예약 전환을 유도하는 요소(특가, 프로모션, 특별 서비스 등)가 있다면 포함해주세요.
- 고객이 "이 호텔이 내가 찾던 호텔이다"라고 느낄 수 있도록 구체적이고 매력적인 내용으로 작성해주세요.
- **한글 문장 자연스러움: seoTitle은 한글 문법에 맞는 자연스러운 문장 구조로 작성해주세요. 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함하여 문장이 완성되도록 해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**`;

    // 영문명이 있으면 웹 검색을 위한 메시지 추가
    const webSearchInstruction = propertyNameEn 
      ? `\n\n참고: 이 호텔의 영문명 "${propertyNameEn}"을 웹에서 검색하여 다음 정보를 수집해주세요:
- 고객들이 이 호텔을 검색할 때 사용하는 실제 키워드와 검색 쿼리 패턴
- 호텔의 실제 특징, 시설, 서비스, 위치, 평판
- 경쟁 호텔 대비 차별화 포인트
- 고객 리뷰에서 자주 언급되는 장점과 특징
이러한 정보를 바탕으로 고객의 실제 검색 의도를 반영한 SEO 메타데이터를 생성해주세요.`
      : '';

    const userMessage = `다음 호텔 정보와 호텔 소개 내용을 분석하여, **호텔을 찾는 고객들의 실제 검색 의도(Intent)**를 반영한 SEO 메타데이터를 생성해주세요:

${hotelInfo}${webSearchInstruction}

**고객 Intent 분석 관점:**
1. 이 호텔을 찾는 고객은 어떤 검색어를 사용할까요? (예: "서울 프리미엄 호텔", "제주 리조트 예약", "명동 호텔 추천")
2. 고객이 이 호텔을 검색할 때 가장 관심 있어 하는 정보는 무엇일까요? (위치, 가격, 시설, 서비스, 리뷰 등)
3. 고객이 이 호텔을 선택하는 이유는 무엇일까요? (차별화 포인트, 특별한 시설, 위치의 장점 등)
4. 고객이 예약하기 전에 확인하고 싶은 정보는 무엇일까요?

위 질문들을 바탕으로:
- seoTitle: 고객이 실제로 검색할 키워드를 포함하고, 호텔의 핵심 가치를 간결하게 전달하며, 클릭하고 싶게 만드는 제목 (구분자는 반드시 콜론(:) 사용, 파이프(|) 사용 금지). **반드시 완성된 문장이나 명사구로 끝나야 하며, 형용사나 불완전한 단어로 끝나지 않도록 주의하세요. 예: '럭셔리 호텔', '프리미엄 호텔 예약', '최고급 호텔 추천' 등 완성된 형태로 작성해주세요.** **한글 문장 자연스러움: 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함한 자연스러운 한글 문장 구조로 작성해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**
- seoDescription: 고객이 찾는 핵심 정보를 포함하고, 호텔의 매력을 구체적으로 서술하며, 예약 전환을 유도하는 설명 (270~330자)
- seoKeywords: 고객이 실제로 검색할 키워드와 호텔의 특징을 반영한 키워드 (5-10개)

호텔 소개 내용과 웹 검색 결과를 모두 활용하여, 고객의 실제 검색 의도와 니즈를 정확히 반영한 SEO 메타데이터를 생성해주세요.`;

    try {
      const apiKey = getOpenAIApiKey();
      // 영문명이 있으면 웹 검색 활성화
      const enableWebSearch = Boolean(propertyNameEn && propertyNameEn.trim().length > 0);
      
      const result = await callOpenAI({
        config: {
          ...DEFAULT_CONFIG,
          responseFormat: { type: 'json_object' },
          maxTokens: 1000,
        },
        systemMessage,
        userMessage,
        apiKey,
        enableWebSearch,
      });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      // Canonical URL 생성 (slug 기반)
      const baseUrl = 'https://luxury-select.co.kr';
      const slug = String((hotel as { slug?: string | null }).slug ?? '').trim();
      let canonicalUrl: string | null = null;

      if (slug) {
        canonicalUrl = `${baseUrl}/hotel/${slug}`;
      } else {
        canonicalUrl = `${baseUrl}/hotel/${sabreId}`;
      }

      const seoTitle = parsed.seoTitle?.trim() || null;
      const seoDescription = parsed.seoDescription?.trim() || null;
      const seoKeywords = parsed.seoKeywords?.trim() || null;

      return {
        status: 'success',
        message: 'SEO 메타데이터가 생성되었습니다.',
        details: {
          sabreId,
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

export async function bulkGenerateHotelSeoIntroAction(
  _prevState: HotelSeoIntroBulkGenerateState,
  formData: FormData,
): Promise<HotelSeoIntroBulkGenerateState> {
  'use server';

  try {
    const sabreIdsStr = String(formData.get('sabreIds') ?? '').trim();
    if (!sabreIdsStr) {
      return { status: 'error', message: '호텔을 선택해주세요.' };
    }

    const sabreIds = sabreIdsStr.split(',').map(id => id.trim()).filter(Boolean);
    if (sabreIds.length === 0) {
      return { status: 'error', message: '호텔을 선택해주세요.' };
    }

    const supabase = createServiceRoleClient();
    const errors: Array<{ sabreId: string; error: string }> = [];
    let successCount = 0;

    // 각 호텔에 대해 SEO 생성 및 저장
    for (const sabreId of sabreIds) {
      try {
        // 호텔 정보 조회
        const { data: hotel, error: hotelError } = await supabase
          .from('select_hotels')
          .select('sabre_id, property_name_ko, property_name_en, property_address, city_ko, country_ko, slug, property_details')
          .eq('sabre_id', sabreId)
          .single();

        if (hotelError || !hotel) {
          errors.push({ sabreId, error: `호텔 조회 실패: ${hotelError?.message ?? 'not found'}` });
          continue;
        }

        const propertyNameKo = String(hotel.property_name_ko ?? '').trim();
        const propertyNameEn = String(hotel.property_name_en ?? '').trim();
        const cityKo = String(hotel.city_ko ?? '').trim();
        const countryKo = String(hotel.country_ko ?? '').trim();
        const propertyAddress = String(hotel.property_address ?? '').trim();
        const propertyDetails = hotel.property_details;

        if (!propertyNameKo && !propertyNameEn) {
          errors.push({ sabreId, error: '호텔명이 없어 SEO를 생성할 수 없습니다.' });
          continue;
        }

        // property_details 처리
        let propertyDetailsText = '';
        if (propertyDetails) {
          if (typeof propertyDetails === 'string') {
            propertyDetailsText = propertyDetails
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          } else if (typeof propertyDetails === 'object') {
            try {
              propertyDetailsText = JSON.stringify(propertyDetails);
            } catch {
              propertyDetailsText = String(propertyDetails);
            }
          } else {
            propertyDetailsText = String(propertyDetails);
          }
        }

        const hotelInfo = [
          propertyNameKo ? `호텔명 (한글): ${propertyNameKo}` : '',
          propertyNameEn ? `호텔명 (영문): ${propertyNameEn}` : '',
          cityKo ? `도시: ${cityKo}` : '',
          countryKo ? `국가: ${countryKo}` : '',
          propertyAddress ? `주소: ${propertyAddress}` : '',
          propertyDetailsText ? `호텔 소개: ${propertyDetailsText.slice(0, 2000)}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        // AI 프롬프트 생성 (generateHotelSeoIntroAction과 동일)
        const systemMessage = `당신은 SEO 및 고객 행동 분석 전문가입니다. 호텔을 찾는 고객들의 검색 의도(Intent)를 깊이 있게 분석하여, 실제 고객이 검색할 때 클릭하고 싶어지는 SEO 메타데이터를 생성해주세요.

고객 검색 Intent 유형:
1. **정보 수집 Intent**: 호텔 정보, 위치, 시설, 서비스에 대한 정보를 찾는 고객
2. **비교 검색 Intent**: 여러 호텔을 비교하여 최적의 선택을 찾는 고객
3. **예약 의도 Intent**: 구체적인 예약을 위해 호텔을 검색하는 고객
4. **리뷰 확인 Intent**: 다른 고객의 경험과 평가를 확인하려는 고객
5. **특정 니즈 Intent**: 특정 시설(수영장, 피트니스, 레스토랑 등)이나 위치를 찾는 고객

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 고객이 실제로 검색할 키워드 포함. 예약 의도와 정보 수집 의도를 모두 반영. 제목의 구분자는 반드시 콜론(:)을 사용하고, 파이프(|)는 사용하지 마세요. **중요: 제목은 반드시 완성된 문장이나 명사구로 끝나야 합니다. 형용사(예: '럭셔리', '프리미엄')나 불완전한 단어로 끝나지 않도록 주의하세요. 예: '럭셔리 호텔', '프리미엄 호텔 예약', '최고급 호텔 추천' 등 완성된 형태로 작성해주세요.** **한글 문장 자연스러움: 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함한 자연스러운 한글 문장 구조로 작성해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**)",
  "seoDescription": "검색 결과에 표시될 설명 (270~330자, 고객이 찾는 핵심 정보(위치, 시설, 가격, 특징)를 포함하고, 클릭하고 싶게 만드는 매력적인 내용. 예약 전환을 유도하는 요소 포함)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 고객이 실제로 검색할 키워드. 호텔명, 지역, 시설, 특징 등 검색 의도와 관련된 키워드)"
}

중요: 
- seoDescription은 반드시 270~330자 정도로 적절한 길이로 작성해주세요.
- 고객이 실제로 검색할 키워드(예: "서울 호텔 예약", "제주 리조트 추천", "프리미엄 호텔 비교" 등)를 자연스럽게 포함해주세요.
- 고객이 가장 관심 있어 하는 정보(위치, 가격, 시설, 서비스, 리뷰)를 우선적으로 언급해주세요.
- 호텔 소개 내용(property_details)과 웹 검색 결과를 활용하여 고객의 실제 니즈를 반영해주세요.
- 예약 전환을 유도하는 요소(특가, 프로모션, 특별 서비스 등)가 있다면 포함해주세요.
- 고객이 "이 호텔이 내가 찾던 호텔이다"라고 느낄 수 있도록 구체적이고 매력적인 내용으로 작성해주세요.
- **한글 문장 자연스러움: seoTitle은 한글 문법에 맞는 자연스러운 문장 구조로 작성해주세요. 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함하여 문장이 완성되도록 해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**`;

        const webSearchInstruction = propertyNameEn 
          ? `\n\n참고: 이 호텔의 영문명 "${propertyNameEn}"을 웹에서 검색하여 다음 정보를 수집해주세요:
- 고객들이 이 호텔을 검색할 때 사용하는 실제 키워드와 검색 쿼리 패턴
- 호텔의 실제 특징, 시설, 서비스, 위치, 평판
- 경쟁 호텔 대비 차별화 포인트
- 고객 리뷰에서 자주 언급되는 장점과 특징
이러한 정보를 바탕으로 고객의 실제 검색 의도를 반영한 SEO 메타데이터를 생성해주세요.`
          : '';

        const userMessage = `다음 호텔 정보와 호텔 소개 내용을 분석하여, **호텔을 찾는 고객들의 실제 검색 의도(Intent)**를 반영한 SEO 메타데이터를 생성해주세요:

${hotelInfo}${webSearchInstruction}

**고객 Intent 분석 관점:**
1. 이 호텔을 찾는 고객은 어떤 검색어를 사용할까요? (예: "서울 프리미엄 호텔", "제주 리조트 예약", "명동 호텔 추천")
2. 고객이 이 호텔을 검색할 때 가장 관심 있어 하는 정보는 무엇일까요? (위치, 가격, 시설, 서비스, 리뷰 등)
3. 고객이 이 호텔을 선택하는 이유는 무엇일까요? (차별화 포인트, 특별한 시설, 위치의 장점 등)
4. 고객이 예약하기 전에 확인하고 싶은 정보는 무엇일까요?

위 질문들을 바탕으로:
- seoTitle: 고객이 실제로 검색할 키워드를 포함하고, 호텔의 핵심 가치를 간결하게 전달하며, 클릭하고 싶게 만드는 제목 (구분자는 반드시 콜론(:) 사용, 파이프(|) 사용 금지). **반드시 완성된 문장이나 명사구로 끝나야 하며, 형용사나 불완전한 단어로 끝나지 않도록 주의하세요. 예: '럭셔리 호텔', '프리미엄 호텔 예약', '최고급 호텔 추천' 등 완성된 형태로 작성해주세요.** **한글 문장 자연스러움: 명사만 나열하거나 '~와/과' 같은 접속사로 단순 나열하지 말고, 형용사나 서술어를 포함한 자연스러운 한글 문장 구조로 작성해주세요. 예: '수영장·워터파크 시설이 훌륭한 두바이 리조트형 호텔 예약' (O), '두바이 리조트형 호텔 예약과 수영장·워터파크' (X)**
- seoDescription: 고객이 찾는 핵심 정보를 포함하고, 호텔의 매력을 구체적으로 서술하며, 예약 전환을 유도하는 설명 (270~330자)
- seoKeywords: 고객이 실제로 검색할 키워드와 호텔의 특징을 반영한 키워드 (5-10개)

호텔 소개 내용과 웹 검색 결과를 모두 활용하여, 고객의 실제 검색 의도와 니즈를 정확히 반영한 SEO 메타데이터를 생성해주세요.`;

        const apiKey = getOpenAIApiKey();
        const enableWebSearch = Boolean(propertyNameEn && propertyNameEn.trim().length > 0);
        
        const result = await callOpenAI({
          config: {
            ...DEFAULT_CONFIG,
            responseFormat: { type: 'json_object' },
            maxTokens: 1000,
          },
          systemMessage,
          userMessage,
          apiKey,
          enableWebSearch,
        });

        const parsed = JSON.parse(result.content) as {
          seoTitle?: string;
          seoDescription?: string;
          seoKeywords?: string;
        };

        const baseUrl = 'https://luxury-select.co.kr';
        const slug = String((hotel as { slug?: string | null }).slug ?? '').trim();
        let canonicalUrl: string | null = null;

        if (slug) {
          canonicalUrl = `${baseUrl}/hotel/${slug}`;
        } else {
          canonicalUrl = `${baseUrl}/hotel/${sabreId}`;
        }

        const seoTitle = parsed.seoTitle?.trim() || null;
        const seoDescription = parsed.seoDescription?.trim() || null;
        const seoKeywords = parsed.seoKeywords?.trim() || null;

        // DB에 저장
        const updateData: Record<string, unknown> = {
          seo_title: seoTitle,
          seo_description: seoDescription,
          updated_at: new Date().toISOString(),
        };

        if (canonicalUrl !== null && canonicalUrl !== '') {
          updateData.canonical_url = canonicalUrl;
        }

        if (seoKeywords !== null && seoKeywords !== '') {
          updateData.seo_keywords = seoKeywords;
        }

        const { error: updateError } = await supabase
          .from('select_hotels')
          .update(updateData)
          .eq('sabre_id', sabreId);

        if (updateError) {
          errors.push({ sabreId, error: `저장 실패: ${updateError.message}` });
        } else {
          successCount += 1;
        }
      } catch (error) {
        errors.push({ 
          sabreId, 
          error: error instanceof Error ? error.message : '알 수 없는 오류' 
        });
      }
    }

    const message = `완료: ${successCount}개 성공 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 ? (successCount > 0 ? 'success' : 'error') : 'success',
      message,
      details: {
        total: sabreIds.length,
        success: successCount,
        errors,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 SEO 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        success: 0,
        errors: [{ sabreId: '', error: String(error) }],
      },
    };
  }
}

export default function HotelSeoIntroPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>호텔 소개 SEO 관리</CardTitle>
            <CardDescription>
              `select_hotels` 테이블의 호텔에 대한 SEO 메타데이터(제목, 설명, 키워드, Canonical URL)를 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              - <span className="font-medium text-foreground">호텔명 (property_name_ko/en)</span>: 호텔의 실제 이름
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

        <HotelSeoIntroManagementForm
          scanAction={scanHotelSeoIntroAction}
          initialScanState={initialScanState}
          updateAction={updateHotelSeoIntroAction}
          initialUpdateState={initialUpdateState}
          generateAction={generateHotelSeoIntroAction}
          initialGenerateState={{ status: 'idle', message: '' }}
          bulkGenerateAction={bulkGenerateHotelSeoIntroAction}
          initialBulkGenerateState={{ status: 'idle', message: '' }}
        />
      </div>
    </div>
  );
}

