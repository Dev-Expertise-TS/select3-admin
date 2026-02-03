# Select3 Admin 문서

이 폴더는 Select3 Admin 프로젝트의 **API 명세**, **API별 상세 명세**, **비즈니스 로직** 문서를 담습니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [API-SPEC.md](./API-SPEC.md) | **API 명세서 (요약)** — 전체 API 경로·메서드·요청/응답·상태 코드 요약 |
| [api/README.md](./api/README.md) | **API별 상세 명세 인덱스** — 도메인별 상세 명세 문서 목록 |
| [api/01-auth.md](./api/01-auth.md) | 인증 API 상세 (로그인, 로그아웃, 회원가입, 비밀번호 변경/재설정, 테스트 로그인) |
| [api/02-hotel.md](./api/02-hotel.md) | 호텔 API 상세 (조회/검색/제안, 생성, 업데이트, 혜택·브랜드·지역·요금코드, 이미지 등) |
| [api/03-benefits.md](./api/03-benefits.md) | 혜택 API 상세 (마스터 목록) |
| [api/04-regions.md](./api/04-regions.md) | 지역 API 상세 (목록/생성/수정/삭제) |
| [api/05-hotel-images.md](./api/05-hotel-images.md) | 호텔 이미지 API 상세 (목록, 업로드, 삭제, 재정렬, 동기화, 마이그레이션, bulk) |
| [api/06-hotel-articles.md](./api/06-hotel-articles.md) | 호텔 아티클(블로그) API 상세 (CRUD, 브랜드, 호텔 정보, 메인 이미지) |
| [api/07-sabre.md](./api/07-sabre.md) | Sabre/요금 API 상세 (토큰, 호텔 상세, 요금 조회, DB 검색, sabre-id 검색, select-hotel-price) |
| [api/08-dashboard-promo.md](./api/08-dashboard-promo.md) | 대시보드·프로모션·기타 API 상세 (통계, 배너, 슬롯, 만족도 설문, 이미지, 공항, 시설 제안, OpenAI, 사용자) |
| [api/09-data-migration.md](./api/09-data-migration.md) | 데이터 마이그레이션 API 상세 (호텔 upsert, CSV, 임포트/내보내기, 지역, 블로그 이미지) |
| [api/10-hashtags-content-test.md](./api/10-hashtags-content-test.md) | 해시태그·호텔 콘텐츠·테스트·유틸 API 상세 |
| [BUSINESS-LOGIC.md](./BUSINESS-LOGIC.md) | **비즈니스 로직 설명서** — 도메인 용어, 불변식, UX 규칙, 데이터 처리·검증, 핵심 플로우, 레포지토리/기능 레이어 로직 |

## 참고

- API 구현: `src/app/api/**/route.ts`
- 비즈니스 규칙·컨텍스트: `.cursor/rules/business-context.mdc`
- 공통 API 규칙: `.cursor/rules/api-contracts.mdc`
