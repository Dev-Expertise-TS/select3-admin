# API 별 상세 명세서

이 폴더는 Select3 Admin 프로젝트의 **API별 상세 명세서**를 담습니다.  
각 문서는 요청/응답 형식, 검증 규칙, 상태 코드, 예시를 포함합니다.

## 문서 목록

| 문서 | 설명 |
|------|------|
| [01-auth.md](./01-auth.md) | 인증: 로그인, 로그아웃, 회원가입, 비밀번호 변경/재설정, 테스트 로그인 |
| [02-hotel.md](./02-hotel.md) | 호텔: 조회/검색/제안, 생성, 업데이트(기본·혜택·브랜드·지역·요금코드), Sabre ID 확인, slug, 이미지 등 |
| [03-benefits.md](./03-benefits.md) | 혜택: 마스터 목록 조회 |
| [04-regions.md](./04-regions.md) | 지역: 목록/생성/수정/삭제 |
| [05-hotel-images.md](./05-hotel-images.md) | 호텔 이미지: 목록, 업로드, 삭제, 재정렬, 동기화, 마이그레이션, bulk |
| [06-hotel-articles.md](./06-hotel-articles.md) | 호텔 아티클: CRUD, 브랜드, 호텔 정보, 메인 이미지 업로드 |
| [07-sabre.md](./07-sabre.md) | Sabre/요금: 토큰, 호텔 상세, 요금 조회, DB 검색, sabre-id 검색, select-hotel-price |
| [08-dashboard-promo.md](./08-dashboard-promo.md) | 대시보드, 프로모션, 피처 슬롯, 만족도 설문, 로그인/도시/브랜드 이미지, 공항, 시설 제안, OpenAI, 사용자 |
| [09-data-migration.md](./09-data-migration.md) | 데이터 마이그레이션: 호텔 upsert, CSV, 임포트/내보내기, 지역, 블로그 이미지 |
| [10-hashtags-content-test.md](./10-hashtags-content-test.md) | 해시태그, 호텔 콘텐츠, 테스트/유틸 API |

## 공통 규칙

- **성공 응답**: `{ success: true, data?: T, meta?: { count?, page?, pageSize?, totalPages? } }`
- **에러 응답**: `{ success: false, error: string, code?: string, details?: object }`
- **Content-Type**: 요청/응답 모두 `application/json` (파일 업로드 시 `multipart/form-data`)
