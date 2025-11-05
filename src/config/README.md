# AI Prompts Configuration

이 디렉토리는 AI 기능에 사용되는 프롬프트와 모델 설정을 중앙에서 관리합니다.

## 📁 파일 구조

```
src/config/
├── ai-prompts.ts    # AI 프롬프트 설정
└── README.md        # 이 문서
```

## 🎯 호텔 해시태그 추출 설정

### 기본 설정

`ai-prompts.ts`의 `HOTEL_HASHTAG_EXTRACTION` 객체에서 모든 설정을 관리합니다.

```typescript
export const HOTEL_HASHTAG_EXTRACTION = {
  // 모델 설정
  model: AI_MODELS.GPT_4O,      // 사용할 AI 모델
  temperature: 0.7,              // 창의성 수준 (0~1)
  maxTokens: 100,                // 최대 응답 길이
  
  // 추출 설정
  tagCount: 5,                   // 추출할 태그 개수
  language: 'ko',                // 태그 언어
  
  // 카테고리, 예시, 프롬프트...
}
```

### 설정 변경 방법

#### 1. 태그 개수 변경

```typescript
tagCount: 7,  // 5개 → 7개로 변경
```

#### 2. AI 모델 변경

```typescript
model: AI_MODELS.GPT_4O_MINI,  // 더 빠르고 저렴한 모델
// 또는
model: AI_MODELS.GPT_4_TURBO,  // 더 강력한 모델
```

#### 3. 창의성 조절

```typescript
temperature: 0.5,  // 더 일관적인 결과 (0에 가까울수록)
// 또는
temperature: 0.9,  // 더 창의적인 결과 (1에 가까울수록)
```

#### 4. 카테고리 수정

```typescript
categories: [
  '호텔 등급 (예: 5성급, 4성급, 럭셔리)',
  '위치 특성 (예: 도심, 해변, 산)',
  '주요 시설 (예: 수영장, 스파, 피트니스)',
  '서비스 타입 (예: 올인클루시브, 조식포함)',
  '특별한 특징 (예: 반려동물동반, 친환경)',
  '건축 스타일 (예: 모던, 클래식, 전통)',
  '타겟 고객 (예: 비즈니스, 가족, 커플)',
],
```

#### 5. 프롬프트 내용 변경

```typescript
systemPrompt: `당신은 호텔 마케팅 전문가입니다.
주어진 호텔 정보를 분석하여 고객이 검색할 만한 키워드를 {tagCount}개 추출해주세요.

추출 기준:
{categories}

중요: 
- 검색 최적화를 고려하여 구체적이고 명확한 단어를 사용하세요
- 너무 일반적이거나 추상적인 단어는 피하세요
- 한글로만 작성하세요

응답 형식: 쉼표로 구분
예시: {examples}`,
```

## 🔧 사용 예시

### API에서 사용

```typescript
import {
  HOTEL_HASHTAG_EXTRACTION,
  getHotelHashtagSystemPrompt,
  formatHotelInfoForPrompt,
} from '@/config/ai-prompts'

// 프롬프트 생성
const systemPrompt = getHotelHashtagSystemPrompt()
const userPrompt = formatHotelInfoForPrompt(hotelData)

// OpenAI 호출
const completion = await openai.chat.completions.create({
  model: HOTEL_HASHTAG_EXTRACTION.model,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: HOTEL_HASHTAG_EXTRACTION.temperature,
  max_tokens: HOTEL_HASHTAG_EXTRACTION.maxTokens,
})
```

### 커스텀 설정으로 호출

```typescript
const customConfig = {
  ...HOTEL_HASHTAG_EXTRACTION,
  tagCount: 10,
  temperature: 0.5,
}

const systemPrompt = getHotelHashtagSystemPrompt(customConfig)
```

## 📊 모델 비교

| 모델 | 속도 | 비용 | 품질 | 추천 용도 |
|------|------|------|------|-----------|
| gpt-4o | ⚡⚡⚡ | 💰💰 | ⭐⭐⭐⭐⭐ | **기본 권장** |
| gpt-4o-mini | ⚡⚡⚡⚡ | 💰 | ⭐⭐⭐⭐ | 빠른 응답 필요 시 |
| gpt-4-turbo | ⚡⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ | 최고 품질 필요 시 |

## 🎨 Temperature 가이드

- **0.0 - 0.3**: 매우 일관적이고 예측 가능한 결과
  - 사용 예: 데이터 분류, 형식 변환
  
- **0.4 - 0.6**: 균형잡힌 결과
  - 사용 예: 요약, 번역
  
- **0.7 - 0.9**: 창의적이고 다양한 결과 ⭐ **현재 설정**
  - 사용 예: 해시태그 생성, 콘텐츠 작성
  
- **0.9 - 1.0**: 매우 창의적이지만 일관성 낮음
  - 사용 예: 브레인스토밍, 아이디어 발상

## 🚀 향후 확장

`ai-prompts.ts` 파일에 새로운 AI 기능의 설정을 추가할 수 있습니다:

```typescript
export const HOTEL_DESCRIPTION_GENERATION = {
  model: AI_MODELS.GPT_4O,
  temperature: 0.8,
  maxTokens: 500,
  systemPrompt: `...`,
}

export const SEO_METADATA_GENERATION = {
  model: AI_MODELS.GPT_4O,
  temperature: 0.7,
  maxTokens: 200,
  systemPrompt: `...`,
}
```

## 📝 주의사항

1. **프롬프트 변경 후 테스트**: 프롬프트를 변경한 후에는 반드시 실제 호텔 데이터로 테스트하세요.

2. **비용 고려**: 모델과 maxTokens 설정은 API 비용에 직접적인 영향을 미칩니다.

3. **tagCount vs 실제 결과**: AI가 항상 정확히 지정된 개수만큼 생성하지 않을 수 있으므로, 코드에서 `.slice(0, tagCount)`로 제한합니다.

4. **언어 설정**: 현재는 한글만 지원하지만, `language: 'both'`로 변경하여 다국어 지원을 구현할 수 있습니다.

## 🔗 관련 파일

- **API 구현**: `src/app/api/hashtags/extract/route.ts`
- **UI 컴포넌트**: `src/app/admin/hashtags/page.tsx`
- **Server Actions**: `src/features/hashtags/actions.ts`

