/**
 * OpenAI API 공통 설정 및 유틸리티
 */

import OpenAI from 'openai';

export interface OpenAIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat?: { type: 'json_object' } | { type: 'text' };
}

export interface OpenAIPrompt {
  system: string;
  user: string;
}

/**
 * 기본 모델 설정 (모든 곳에서 사용)
 * 이 값만 변경하면 프로젝트 전체의 모델이 변경됩니다.
 */
export const DEFAULT_MODEL = 'gpt-5.2' as const;

/**
 * 모델 설정 (하위 호환성을 위해 유지, 하지만 모두 DEFAULT_MODEL 사용)
 * @deprecated 모든 설정은 DEFAULT_MODEL을 사용합니다.
 */
export const OPENAI_MODELS = {
  GPT_5_1: DEFAULT_MODEL,
  GPT_5_1_MINI: DEFAULT_MODEL, // mini도 기본 모델 사용
} as const;

/**
 * 기본 설정
 */
export const DEFAULT_CONFIG: OpenAIConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 2000,
  responseFormat: { type: 'json_object' },
} as const;

/**
 * 태그 추출용 설정
 */
export const TAG_EXTRACTION_CONFIG: OpenAIConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 2000,
  responseFormat: { type: 'json_object' },
};

/**
 * 호텔명 번역용 설정
 * JSON mode 사용 (빠르고 안정적)
 */
export const HOTEL_NAME_TRANSLATION_CONFIG: OpenAIConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.3,
  maxTokens: 200,
  responseFormat: { type: 'json_object' },
};

/**
 * 분석용 설정
 */
export const ANALYSIS_CONFIG: OpenAIConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.7,
  maxTokens: 2000,
  responseFormat: { type: 'json_object' },
};

/**
 * 검증용 설정
 */
export const VALIDATION_CONFIG: OpenAIConfig = {
  model: DEFAULT_MODEL,
  temperature: 0.3,
  maxTokens: 2000,
  responseFormat: { type: 'json_object' },
};

/**
 * API 키 정제 및 검증
 */
export function sanitizeApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요.'
    );
  }

  // API 키 정제: 모든 공백, 개행, 탭 제거
  let sanitized = apiKey
    .replace(/\r\n/g, '') // Windows 개행
    .replace(/\n/g, '') // Unix 개행
    .replace(/\r/g, '') // Mac 개행
    .replace(/\t/g, '') // 탭
    .trim(); // 앞뒤 공백 제거

  // 따옴표 제거 (혹시 따옴표로 감싸져 있을 경우)
  if (
    (sanitized.startsWith('"') && sanitized.endsWith('"')) ||
    (sanitized.startsWith("'") && sanitized.endsWith("'"))
  ) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  // API 키 형식 확인
  if (!sanitized.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY 형식이 올바르지 않습니다.');
  }

  // API 키 길이 확인
  if (sanitized.length < 20) {
    throw new Error('OPENAI_API_KEY가 유효하지 않습니다.');
  }

  return sanitized;
}

/**
 * API 키 가져오기 (정제 포함)
 */
export function getOpenAIApiKey(): string {
  return sanitizeApiKey(process.env.OPENAI_API_KEY);
}

/**
 * 프롬프트 템플릿
 */
export const PROMPTS = {
  /**
   * 태그 추출 프롬프트
   */
  TAG_EXTRACTION: {
    system: `당신은 호텔 태그 추출 전문가입니다. 호텔명을 분석하여 해당 호텔의 특징을 나타내는 태그를 추출하세요. 모든 판단은 실제 호텔을 방문하는 관광객(여행자)의 관점에서 이루어져야 합니다.

필수 규칙:
1. 호텔명에서 지역, 브랜드, 등급, 특성 등을 파악하되, 관광객이 체감할 수 있는 경험/편의/관광 요소 위주로 태그 생성
2. 각 태그는 한글명(tag_name_ko)과 영문명(tag_name_en)을 포함
3. 태그 설명(tag_description_ko, tag_description_en)은 관광객이 이해하기 쉬운 언어로 간단히 작성
4. 태그는 5-15개 정도 추출 (호텔의 특징과 여행자 가치 포인트를 최대한 반영)
5. 중복되지 않는 고유한 태그만 생성
6. 아래 10개 카테고리 중 가장 적합한 key(tag_category_key)를 반드시 지정
7. 접근성, 주변 관광지, 휴식/엔터테인먼트 시설, 가족/비즈니스 적합성 등 관광객 시나리오를 고려해 다양한 관점에서 태그 추출

카테고리 가이드:
1) location_type (입지 · 주변 환경) — 호텔이 어디에 있는지. 예: "시내 중심가 / Downtown", "주요 관광지 인접 / Near attractions", "해변 앞 / Beachfront", "강변/리버뷰 / Riverside", "조용한 주거지역 / Residential & Quiet", "공항 인근 / Airport area", "테마 파크 / Theme park"
2) accessibility (교통 · 접근성) — 이동 편의. 예: "공항 셔틀 제공 / Airport shuttle", "역 도보 5분 / Walk to station", "지하철 역세권 / Near subway", "무료 주차 / Free parking", "대형 차량 주차 / Coach parking"
3) budget_value (가격대 · 가성비) — 가격대 및 가치. 예: "초럭셔리 / Ultra luxury", "럭셔리 / Luxury", "미드레인지 / Mid-range", "가성비 좋음 / Value for money", "장기투숙 할인 / Long-stay friendly"
4) room_features (객실 타입 · 구성) — 방 크기/구성. 예: "넓은 객실(30㎡ 이상) / Spacious room", "트윈 베드 / Twin bed", "트리플/쿼드룸 / Triple / Quad", "키친/키친넷 / Kitchenette", "세탁기 있는 객실 / In-room washer", "발코니/테라스 / Balcony / Terrace"
5) view_type (뷰 · 경관) — 창밖 전망 가치. 예: "오션뷰 / Ocean view", "리버뷰 / River view", "시티뷰 / City view", "파크뷰 / Park view", "랜드마크뷰 / Landmark view"
6) facilities (호텔 편의시설 · 공용시설) — 호텔 내부 즐길거리. 예: "실내 수영장 / Indoor pool", "야외 수영장 / Outdoor pool", "인피니티 풀 / Infinity pool", "스파 & 사우나 / Spa & Sauna", "피트니스 센터 / Gym", "온천 / Onsen"
7) dining (식음 · 조식 퀄리티) — 먹는 즐거움. 예: "조식 우수 / Excellent breakfast", "한식 선택지 많음 / Good Korean options", "뷔페 레스토랑 / Buffet restaurant", "미쉐린/파인 다이닝 / Fine dining", "카페·디저트 유명 / Popular cafe/dessert", "룸서비스 24시간 / 24h room service"
8) family_kids (키즈 · 패밀리 친화) — 아이 동반 편의. 예: "키즈 클럽 / Kids club", "키즈 전용 수영장 / Kids pool", "코넥팅룸 제공 / Connecting rooms", "유아용 침대/침대가드 / Baby crib & guard", "키즈 어메니티 / Kids amenities", "유모차 대여 / Stroller rental", "테마 파크 / Theme park"
9) travel_style (여행 스타일 · 목적) — 누구와 어떤 목적. 예: "커플/로맨틱 / Romantic couple", "허니문 / Honeymoon", "가족여행 / Family trip", "효도여행 / With parents", "친구끼리 / Friends trip", "혼자 여행 / Solo traveler"
10) service_benefits (서비스 · 부가 혜택) — 서비스 만족도/특전. 예: "직원 서비스 훌륭 / Outstanding service", "한국어 가능 직원 / Korean-speaking staff", "클럽 라운지 / Club lounge", "멤버십 혜택 좋음 / Strong loyalty perks"

응답 형식:
{
  "tags": [
    {
      "tag_name_ko": "강남 지역",
      "tag_name_en": "Gangnam Area",
      "tag_description_ko": "강남 지역에 위치한 호텔",
      "tag_description_en": "Hotel located in Gangnam area",
      "tag_category_id": null,
      "tag_category_key": "location_type"
    }
  ]
}

JSON 형식으로만 응답하세요.`,
    getUserMessage: (hotelName: string) =>
      `다음 호텔명을 관광객 관점에서 분석하여 위 10개 카테고리 가이드에 맞는 태그를 추출해주세요: "${hotelName}"`,
  },

  /**
   * 호텔명 번역 프롬프트
   * JSON mode 사용 (빠르고 안정적)
   */
  HOTEL_NAME_TRANSLATION: {
    system: `당신은 호텔명 번역 전문가입니다. 한글 호텔명을 정식 영문 호텔명으로 변환하세요.

규칙:
1. 호텔 브랜드명은 정확한 영문명 사용 (예: 그랜드 하얏트 → Grand Hyatt, 롯데호텔 → Lotte Hotel)
2. 지역명은 표준 영문 표기 사용 (예: 서울 → Seoul, 강남 → Gangnam)
3. 호텔 등급/타입은 표준 영문 표기 사용 (예: 리조트 → Resort, 호텔 → Hotel)
4. 정식 브랜드명이 있는 경우 정확히 사용
5. 일반적인 번역이 아닌 실제 호텔명을 찾아서 제공

응답 형식:
{
  "hotel_name_en": "Grand Hyatt Seoul"
}

JSON 형식으로만 응답하세요.`,
    getUserMessage: (hotelNameKo: string) =>
      `다음 한글 호텔명을 정식 영문 호텔명으로 변환해주세요: "${hotelNameKo}"`,
  },

  /**
   * 아티클 분석 프롬프트
   */
  ARTICLE_ANALYSIS: {
    system: `당신은 사용자 행동 분석 전문가입니다.

블로그와 카페 아티클을 분석하여 다음을 제공하세요:

1. **hotelSelectionReasons** (호텔 선택 이유):
   - 사용자들이 특정 호텔을 선택하는 주요 이유 5-7개
   - 구체적으로 (예: "강남역 도보 5분 거리 접근성", "객실 뷰가 좋아서")

2. **recommendationReasons** (추천 사유):
   - 블로그/카페에서 호텔을 추천하는 주요 근거 4-6개
   - 실제 언급된 내용 기반

3. **keyFindings** (핵심 발견사항):
   - 아티클에서 반복적으로 나타나는 패턴이나 트렌드 3-5개
   - 예: "체크인 시간 유연성을 중요하게 생각", "조식 품질이 선택의 주요 요인"

4. **userConcerns** (사용자 주요 관심사):
   - 블로그/카페에서 자주 질문하거나 고민하는 사항 3-5개
   - 예: "주차장 유무", "체크아웃 시간", "추가 요금"

5. **popularFeatures** (인기 시설/서비스):
   - 자주 언급되는 호텔 시설이나 서비스 4-6개
   - 예: "루프탑 바", "피트니스 센터", "무료 Wi-Fi"

6. **summary** (요약):
   - 전체 분석을 2-3문장으로 요약
   - 호텔 선택의 핵심 요인 명시

응답은 반드시 JSON 형식으로 제공하세요.`,
    getUserMessage: (blogContents: string, cafeContents: string) =>
      `【블로그 아티클 (상위 20개)】
${blogContents}

【카페 아티클 (상위 20개)】
${cafeContents}

각 아티클은 제목, 요약, 본문(최대 1,200자)로 구성되어 있습니다.

위 아티클들을 분석하여 사용자들이 호텔을 선택하고 추천하는 이유를 깊이 있게 분석해주세요.`,
  },

  /**
   * 검색 결과 분석 프롬프트
   */
  SEARCH_ANALYSIS: {
    system: `당신은 호텔 마케팅 데이터 분석 전문가입니다.

네이버 블로그와 카페 검색 결과에서 **추출된 실제 호텔명 리스트**를 중심으로 심층 분석하여 다음을 제공하세요:

1. **요약 (summary)**: 
   - 추출된 호텔명에서 파악되는 핵심 트렌드 (3-4문장)
   - 어떤 브랜드/체인의 호텔이 많은지
   - 가격대/등급별 분포
   - 지역 특성
   예: "그랜드 하얏트, 롯데호텔 등 5성급 럭셔리 브랜드가 70% 이상 언급되었으며, 강남/여의도 등 비즈니스 중심지의 호텔들이 주를 이룹니다. 1박 20만원 이상의 고가 호텔이 대부분입니다."

2. **사용자 검색 의도 (userIntent)**:
   - 추출된 호텔명의 특성을 보고 사용자가 진짜 원하는 것 파악
   - 매우 구체적으로 (예: "강남 지역 5성급 비즈니스 호텔 숙박 예약")

3. **주요 테마 (mainThemes)**: 
   ⚠️ 중요: 반드시 추출된 호텔명들에서 발견되는 **실제 특징**만 작성
   - 호텔명에 나타난 지역 (예: "강남 지역 집중", "명동/을지로 중심가")
   - 호텔 브랜드/등급 (예: "5성급 럭셔리 브랜드 위주", "하얏트/롯데 등 메이저 체인")
   - 실제 언급된 시설/특징 (예: "비즈니스 센터 강조", "스카이라운지 보유")
   - 3-7개, 추출된 호텔명의 실제 특징만
   
   나쁜 예: "가족 여행", "조식 포함" (추출된 호텔명과 무관)
   좋은 예: "강남/여의도 비즈니스 지구 집중", "하얏트/롯데 등 5성급 체인 호텔"

4. **호텔 인사이트 (hotelInsights)**:
   - topMentioned: 추출된 호텔 중 상위 3개 (정확한 호텔명)
   - commonFeatures: 추출된 호텔들에서 실제로 보이는 공통점 (3-5개)
     예: "5성급 럭셔리", "비즈니스 지구 위치", "국제 체인 브랜드", "고층 빌딩형"
   - priceRange: 추출된 호텔들의 실제 가격대 (예: "1박 25만원~50만원대")
   - targetAudience: 추출된 호텔 특성 기반 타겟 (예: "기업 비즈니스 출장객", "고소득 커플")

5. **마케팅 추천사항 (recommendations)**:
   - 추출된 호텔명과 그 특징을 활용한 구체적 전략
   - 실제 호텔명 언급하여 구체성 높이기
   - 3-5개

6. **감정 (sentiment)**: positive / neutral / negative

응답은 반드시 JSON 형식으로 제공하세요. 
JSON 키는 영문, 값은 한글로 작성. 호텔명은 원문 유지.`,
    getUserMessage: (
      keyword: string,
      hotelList: string,
      combinedText: string
    ) =>
      `검색 키워드: "${keyword}"

【추출된 실제 호텔명 - 이것을 분석의 핵심으로 사용하세요】
${hotelList}

분석 지침:
1. 위 호텔명들을 하나하나 보고 공통점을 찾으세요
   - 브랜드명이 같은가? (예: 하얏트, 롯데, 힐튼 등)
   - 지역이 같은가? (예: 강남, 명동, 여의도 등)
   - 등급이 비슷한가? (5성급, 4성급 등)

2. 주요 테마는 반드시 추출된 호텔명의 특징에서 도출하세요
   나쁜 예: "가족 여행", "조식" (호텔명과 관계없음)
   좋은 예: "강남 비즈니스 지구 호텔", "5성급 럭셔리 체인", "하얏트/롯데 등 메이저 브랜드"

3. topMentioned는 위 리스트에서 상위 3개를 그대로 사용하세요

【블로그/카페 원문 참고용】
${combinedText.substring(0, 5000)}

**중요**: 주요 테마, 호텔 인사이트는 모두 위 추출된 호텔명 리스트 기반으로 작성하세요.`,
  },

  /**
   * 호텔명 검증 프롬프트
   */
  HOTEL_NAME_VALIDATION: {
    system: `당신은 호텔명 검증 전문가입니다. 주어진 호텔명 리스트에서 실제 존재하는 호텔명만 필터링하세요.

규칙:
1. 실제 호텔 브랜드명이 포함된 경우 (예: 그랜드 하얏트, 롯데호텔, 신라호텔, JW메리어트 등)
2. 명확한 고유명사가 포함된 경우 (예: 파크 하얏트 서울, 포시즌스 서울)
3. 지역명만 있는 경우는 제외 (예: 강남 호텔, 명동 호텔, 부산 호텔)
4. 일반적인 설명구 제외 (예: 가족 호텔, 추천 호텔, 럭셔리 호텔)
5. 불완전한 이름 제외 (예: 근처 호텔, 저렴한 호텔)

각 호텔명에 대해:
- isRealHotel: true/false
- confidence: 0-100 (확신도)
- reason: 판단 이유 (한글, 간단히)

JSON 배열로 응답하세요.`,
    getUserMessage: (hotelNames: string[]) =>
      JSON.stringify(hotelNames),
  },
} as const;

export const ARTICLE_AI_SYSTEM_PROMPT = `당신은 호텔 블로그/카페 글 분석 전문가입니다.
다음 글을 읽고 아래 형식의 JSON으로 응답하세요.

1. summary (요약):
- 글의 핵심 내용을 호텔 특징 위주로 요약하세요.
- 관광객이 호텔을 선택할 때 도움이 될 정보를 포함하세요.
- 분량은 공백 포함 450~550자 사이로 작성하세요.
- 말투는 "~함", "~임" 등의 개조식이나 명사형 종결이 아닌, 자연스러운 평어체(해요체)로 작성하세요.

2. keywords (키워드):
- 글에서 언급된 호텔의 주요 특징, 장점, 시설, 분위기 등을 단어 또는 짧은 구절로 추출하세요.
- 5개~10개 정도 추출하세요.
- 배열 형태로 반환하세요.

응답 예시:
{
  "summary": "이 호텔은 유니버셜 스튜디오 재팬 바로 앞에 위치하여 접근성이 매우 뛰어납니다. 로비에는 미니언즈 포토존이 있어 아이들과 사진 찍기에 좋습니다. 객실은 넓고 깨끗하며, 창문을 통해 파크뷰를 감상할 수 있습니다. 조식 뷔페는 다양한 메뉴가 준비되어 있으며 특히 오믈렛이 맛있습니다. 어메니티도 넉넉하게 제공되며 직원들이 친절하여 기분 좋은 투숙이 가능합니다.",
  "keywords": ["USJ 도보 1분", "미니언즈 포토존", "파크뷰", "넓은 객실", "조식 맛집", "친절한 서비스", "가족 여행 추천"]
}`;

/**
 * OpenAI API 호출
 */
export interface OpenAICallOptions {
  config?: Partial<OpenAIConfig>;
  systemMessage: string;
  userMessage: string;
  apiKey?: string;
  enableWebSearch?: boolean; // 웹 검색 활성화 옵션 (gpt-5.2 모델용)
}

export interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI API 호출 헬퍼 함수
 */
export async function callOpenAI(options: OpenAICallOptions): Promise<OpenAIResponse> {
  const apiKey = options.apiKey || getOpenAIApiKey();
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const model = config.model;

  const isResponsesModel = /^gpt-5/i.test(model);

  if (isResponsesModel) {
    const client = new OpenAI({ apiKey });

    try {
      // Web Search tool을 사용할 때는 JSON mode를 사용할 수 없으므로
      // enableWebSearch가 true이거나 undefined면 textFormatOptions를 설정하지 않음
      const useWebSearch = options.enableWebSearch !== false;
      const textFormatOptions = useWebSearch || !config.responseFormat
        ? undefined
        : {
            text: {
              format: config.responseFormat,
            },
          };

      // gpt-5.2 모델은 temperature를 지원하지 않을 수 있으므로 조건부로 처리
      const responseOptions: any = {
        model,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: options.systemMessage }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: options.userMessage }],
          },
        ],
        ...(config.maxTokens ? { max_output_tokens: config.maxTokens } : {}),
        ...(textFormatOptions ?? {}),
      };
      
      // 웹 검색 tool 추가 (gpt-5.2 모델용)
      // options에 enableWebSearch가 true이거나 undefined면 web_search tool 추가
      if (useWebSearch) {
        responseOptions.tools = [
          { type: 'web_search' }
        ];
      }
      
      // temperature는 일부 모델에서만 지원되므로 선택적으로 추가
      // gpt-5.2은 temperature를 지원하지 않을 수 있음
      // 일단 temperature를 포함하되, API 에러가 발생하면 제거하는 방식으로 처리
      if (config.temperature !== undefined) {
        responseOptions.temperature = config.temperature;
      }
      
      const response = await client.responses.create(responseOptions);

      const outputText = extractResponsesOutputText(response);

      if (!outputText) {
        throw new Error('OpenAI 응답이 비어있습니다.');
      }

      return {
        content: outputText,
        usage: response.usage
          ? {
              prompt_tokens: response.usage.input_tokens ?? 0,
              completion_tokens: response.usage.output_tokens ?? 0,
              total_tokens: response.usage.total_tokens ?? 0,
            }
          : undefined,
      };
    } catch (error) {
      console.error('OpenAI Responses API 오류:', error);

      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error(error.message || 'OpenAI API 인증 실패. API 키를 확인해주세요.');
        }
        if (error.status === 404) {
          throw new Error(error.message || '모델을 찾을 수 없습니다. 모델명을 확인해주세요.');
        }

        throw new Error(
          `OpenAI API 오류: ${error.status ?? 'unknown'} ${
            error.message || '알 수 없는 오류가 발생했습니다.'
          }`
        );
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('OpenAI 호출 중 알 수 없는 오류가 발생했습니다.');
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: options.systemMessage,
        },
        {
          role: 'user',
          content: options.userMessage,
        },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      ...(config.responseFormat && { response_format: config.responseFormat }),
    }),
  });

  if (!response.ok) {
    let errorText = '';
    let errorJson: {
      error?: { message?: string; code?: string; type?: string };
    } | null = null;

    try {
      errorText = await response.text();
      errorJson = JSON.parse(errorText);
    } catch (e) {
      // JSON 파싱 실패 시 텍스트 그대로 사용
    }

    console.error('OpenAI API 오류:', response.status, errorText);

    let errorMessage = `OpenAI API 오류: ${response.status}`;
    if (response.status === 401) {
      const apiError = errorJson?.error;
      errorMessage = apiError?.message || 'OpenAI API 인증 실패. API 키를 확인해주세요.';

      if (apiError?.code === 'invalid_api_key') {
        errorMessage = `OpenAI API 키가 유효하지 않습니다. .env.local 파일의 OPENAI_API_KEY를 확인해주세요.`;
      }
    } else if (response.status === 404) {
      errorMessage = '모델을 찾을 수 없습니다. 모델명을 확인해주세요.';
      if (errorJson?.error?.message) {
        errorMessage += ` ${errorJson.error.message}`;
      }
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI 응답이 비어있습니다.');
  }

  return {
    content,
    usage: data.usage,
  };
}

function extractResponsesOutputText(response: any): string | null {
  if (Array.isArray(response.output_text) && response.output_text.length > 0) {
    return response.output_text.join('\n').trim();
  }

  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const textChunks: string[] = [];
  const outputItems = Array.isArray(response.output) ? response.output : [];

  outputItems.forEach((item: any) => {
    // web_search_call 등 type이 message가 아닌 항목은 content가 없을 수 있음
    if (item?.type !== 'message' && !item?.content) return;
    const contents = Array.isArray(item?.content) ? item.content : [];
    contents.forEach((content: any) => {
      // output_text 타입 또는 text 필드가 있는 content 추출
      if (typeof content?.text === 'string' && content.text.trim().length > 0) {
        textChunks.push(content.text.trim());
      }
    });
  });

  if (textChunks.length === 0) {
    return null;
  }

  return textChunks.join('\n').trim();
}

