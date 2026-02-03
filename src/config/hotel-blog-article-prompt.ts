// --- Topic, Hotels 기반 아티클 기본 데이터(제목/부제목/slug) AI 생성 프롬프트 셋팅 ---

export const HOTEL_BLOG_ARTICLE_BASIC_DATA_SYSTEM_PROMPT = `당신은 블로그 에디터입니다.
주어진 Topic과 Hotels 정보만을 이용하여 블로그 아티클의 기본 메타데이터를 생성합니다.

응답은 반드시 아래 JSON 형식만 출력합니다. 다른 설명이나 마크다운 코드 블록 없이 순수 JSON만 출력하세요.
{
  "main_title": "제목 50자 이내",
  "sub_title": "부제목 50자 이내",
  "slug": "english-slug-format"
}

규칙:
- main_title: 블로그 아티클 제목, 50자 이내 (한글 가능)
- sub_title: 블로그 아티클 부제목, 50자 이내 (한글 가능)
- slug: 제목을 반영한 영문 URL 슬러그. 소문자, 단어는 하이픈(-)으로 구분, 특수문자 없음. 예: best-hotels-in-seoul-2024` as const

/**
 * Topic, Hotels를 활용한 아티클 기본 데이터 AI 생성용 User 메시지
 */
export function getHotelBlogArticleBasicDataUserMessage(topic: string, hotels: string): string {
  const safeTopic = topic.trim() || '(없음)'
  const safeHotels = hotels.trim() || '(없음)'

  return `다음 정보를 바탕으로 블로그 아티클의 제목(main_title), 부제목(sub_title), 영문 slug를 생성해주세요.
각각 50자 이내로 작성하고, slug는 영문 소문자와 하이픈만 사용하는 URL 형식으로 만들어주세요.

Topic:
${safeTopic}

Hotels:
${safeHotels}

위 규칙에 맞는 JSON만 출력하세요.`
}

// --- 블로그 아티클 각 호텔 상세 콘텐츠 AI 생성 프롬프트 셋팅---

/**
 * 호텔 블로그 아티클 작성 설정
 *
 * 블로그 섹션(섹션 1~12)에 들어갈 호텔 소개/특징 아티클을 별도 프롬프트로 관리합니다.
 * 호텔 기본 소개 관리(Property Details)와는 다른 톤/구성을 사용합니다.
 */

export const HOTEL_BLOG_ARTICLE_SYSTEM_PROMPT = `당신은 호텔 정보를 전문적으로 다루는 호텔 전문 에디터입니다.
선택된 호텔을 소개하는 블로그 아티클을 HTML로 작성합니다.

요구사항:
- 출력은 순수 HTML만 사용합니다. 마크다운이나 설명 텍스트, \`\`\`html 코드 블록은 사용하지 않습니다.
- 호텔명을 언급할 때마다 반드시 "호텔한글명(호텔영문명)" 형식을 사용합니다.
- 괄호 앞 "호텔한글명"에는 한글만 사용하고, 괄호 안 "호텔영문명"에는 영문만 사용합니다.
` as const

/**
 * 블로그 아티클 User 메시지
 * - 호텔 타이틀 + 특징1~3을 순서대로 작성
 */
export function getHotelBlogArticleUserMessage(propertyNameKo: string, propertyNameEn: string): string {
  const safeKo = propertyNameKo.trim() || '호텔한글명'
  const safeEn = propertyNameEn.trim() || 'Hotel English Name'

  return `다음 호텔에 대한 블로그용 소개 아티클을 작성해주세요.

호텔 한글명: ${safeKo}
호텔 영문명: ${safeEn}

호텔명을 언급할 때는 항상 "호텔한글명(호텔영문명)" 형식으로 작성합니다.

** 호텔 타이틀 작성 **
#1 해당 호텔을 대표하는 특징 한 가지만 20자 이내로 작성합니다.
#2 위 문장을 기반으로 마지막에 ":" 문자를 붙이고 전체를 <h3> 태그로 처리합니다.
#3 바로 아래 줄에 해당 호텔의 "호텔한글명(호텔영문명)"을 <h2><b>호텔한글명(호텔영문명)</b></h2> 형식으로 작성합니다.

** 호텔 특징1 작성 **
#1 해당 호텔의 주요 특징 포인트 한 가지를 50자 이내로 작성하고 <h3><b> 태그로 처리합니다.
#2 위 문단 아래에, 방금 언급한 특징 포인트에 대한 상세 설명을 800자 내외로 작성합니다.
#3 호텔 명칭을 언급할 때는 항상 "호텔한글명(호텔영문명)" 형식으로 작성합니다.

** 호텔 특징2 작성 **
#1 앞서 작성한 호텔 특징1과 다른 특징 포인트 한 가지를 50자 이내로 작성하고 <h3><b> 태그로 처리합니다.
#2 위 문단 아래에, 방금 언급한 특징 포인트에 대한 상세 설명을 800자 내외로 작성합니다.
#3 호텔 명칭을 언급할 때는 항상 "호텔한글명(호텔영문명)" 형식으로 작성합니다.

** 호텔 특징3 작성 **
#1 앞서 작성한 호텔 특징1, 특징2와 서로 다른 특징 포인트 한 가지를 50자 이내로 작성하고 <h3><b> 태그로 처리합니다.
#2 위 문단 아래에, 방금 언급한 특징 포인트에 대한 상세 설명을 800자 내외로 작성합니다.
#3 호텔 명칭을 언급할 때는 항상 "호텔한글명(호텔영문명)" 형식으로 작성합니다.

위 네 블록(타이틀, 특징1, 특징2, 특징3)을 순서대로 모두 포함하여 HTML만 출력해주세요.
`
}

