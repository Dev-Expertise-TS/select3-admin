# 혜택 API 상세 명세

## 1. 혜택 마스터 목록 조회

### `GET /api/benefits/list`  
### `GET /api/benefits/manage/list`

혜택 마스터(select_hotel_benefits) 목록을 조회합니다.  
`/api/benefits/list`는 `/api/benefits/manage/list`를 re-export합니다.  
benefit_id 오름차순 정렬.

---

#### 요청

- Query, Body 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": [
    {
      "benefit_id": "BEN001",
      "benefit": "조식 포함",
      "benefit_description": "뷔페 조식 포함",
      "start_date": null,
      "end_date": null
    }
  ]
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "데이터를 가져오는데 실패했습니다."
}
```

---

#### 비고

- 혜택 매핑(호텔↔혜택)은 **호텔 API** `POST /api/hotel/update-benefits` 또는 `POST /api/hotel/update`(FormData mapped_benefit_id)로 저장합니다.
- 마스터 목록은 읽기 전용으로, 매핑 유효성(존재하는 benefit_id만 참조)의 기준입니다.

---

이 문서는 `src/app/api/benefits/**/route.ts` 구현을 기준으로 작성되었습니다.
