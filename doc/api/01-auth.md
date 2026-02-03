# 인증 API 상세 명세

## 1. 로그인

### `POST /api/auth/login`

이메일·비밀번호로 Supabase `signInWithPassword` 호출 후 사용자 정보를 반환합니다.

---

#### 요청

**Headers**

| 이름 | 필수 | 설명 |
|------|------|------|
| Content-Type | O | application/json |

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 로그인 이메일 (trim 적용) |
| password | string | O | 비밀번호 (trim 적용) |

**검증**

- Body가 유효한 JSON이어야 함.
- email, password trim 후 빈 값이면 400.
- Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 없으면 500.

---

#### 응답

**200 OK — 성공**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "ISO8601",
    "last_sign_in_at": "ISO8601",
    "email_confirmed_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

**400 Bad Request**

- 잘못된 요청 형식(JSON 파싱 실패)
- 이메일 또는 비밀번호 누락

```json
{
  "success": false,
  "error": "이메일과 비밀번호를 입력해주세요."
}
```

**401 Unauthorized**

- 인증 실패 시 상세 code 반환 가능

| code | 의미 |
|------|------|
| INVALID_CREDENTIALS | 이메일 또는 비밀번호 불일치 |
| INVALID_PASSWORD | 비밀번호 불일치 |
| EMAIL_NOT_CONFIRMED | 이메일 미인증 |
| TOO_MANY_REQUESTS | 로그인 시도 과다 |
| USER_NOT_FOUND | 미등록 이메일 |

```json
{
  "success": false,
  "error": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "code": "INVALID_CREDENTIALS"
}
```

**404 Not Found** — 사용자 정보 없음  
**500 Internal Server Error** — 서버/환경 변수 오류

---

#### 예시

**요청**

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{"email":"admin@example.com","password":"secret"}
```

**응답 (200)**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00.000Z",
    "last_sign_in_at": "2024-06-01T12:00:00.000Z",
    "email_confirmed_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-06-01T12:00:00.000Z"
  }
}
```

---

## 2. 로그아웃

### `POST /api/auth/logout`

Supabase `signOut` 호출로 세션을 종료합니다.

---

#### 요청

- Body 없음.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "로그아웃 중 오류가 발생했습니다."
}
```

---

## 3. 회원가입

### `POST /api/auth/signup`

Supabase Admin `createUser`로 계정을 생성하고, 메타데이터에 `role`을 설정합니다. 이메일 확인은 자동 완료(`email_confirm: true`)입니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 이메일 (trim) |
| password | string | O | 비밀번호 (trim, 최소 6자) |
| role | string | X | 기본값 `"user"` |

**검증**

- email, password trim 후 빈 값 → 400.
- password 길이 < 6 → 400.

---

#### 응답

**201 Created**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "new@example.com",
    "role": "user",
    "created_at": "ISO8601",
    "last_sign_in_at": null,
    "email_confirmed_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

**400 Bad Request** — 이메일/비밀번호 누락, 비밀번호 6자 미만, 사용자 생성 실패  
**409 Conflict** — 이미 등록된 이메일

```json
{
  "success": false,
  "error": "이미 등록된 이메일입니다."
}
```

**500 Internal Server Error** — 사용자 생성 실패, 역할 설정 실패(이 경우 계정 롤백 후 500)

---

## 4. 비밀번호 변경

### `POST /api/auth/change-password`

로그인된 사용자의 비밀번호를 변경합니다. **세션(쿠키) 필요.** 현재 비밀번호로 재로그인 검증 후 `updateUser({ password })` 호출합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| currentPassword | string | O | 현재 비밀번호 (trim) |
| newPassword | string | O | 새 비밀번호 (trim, 최소 6자) |

**검증**

- currentPassword, newPassword trim 후 빈 값 → 400.
- newPassword 길이 < 6 → 400.
- currentPassword === newPassword → 400.
- 세션 없음 → 401.
- 현재 비밀번호 불일치 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "ISO8601",
    "last_sign_in_at": "ISO8601",
    "email_confirmed_at": "ISO8601",
    "updated_at": "ISO8601"
  }
}
```

**400 Bad Request** — 필드 누락, 새 비밀번호 6자 미만, 현재=새 비밀번호, 현재 비밀번호 불일치  
**401 Unauthorized** — 세션 없음  
**500 Internal Server Error**

---

## 5. 비밀번호 재설정 요청

### `POST /api/auth/reset-password`

비밀번호 재설정 링크를 이메일로 발송합니다. `resetPasswordForEmail` 호출.  
보안상 이메일 존재 여부를 노출하지 않기 위해, 오류 시에도 사용자에게는 성공 메시지를 반환할 수 있습니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | 이메일 (trim) |

**검증**

- email trim 후 빈 값 → 400.
- 이메일 형식 정규식 검증 실패 → 400.

---

#### 응답

**200 OK** (실제 전송 실패 시에도 200으로 성공 메시지 반환 가능)

```json
{
  "success": true,
  "message": "비밀번호 재설정 링크가 전송되었습니다. 이메일을 확인해주세요."
}
```

**400 Bad Request** — 이메일 누락, 형식 오류

---

## 6. 비밀번호 재설정 링크 검증

### `GET /api/auth/reset-password/verify`

이메일 링크의 `code`, `token_hash`, `type` 쿼리로 재설정 세션을 검증합니다.  
`token_hash` + `type=recovery`이면 `verifyOtp`, 없으면 `exchangeCodeForSession` 시도. 성공 시 `/auth/reset-password?verified=true`로 리다이렉트(302).

---

#### 요청

**Query**

| 이름 | 필수 | 설명 |
|------|------|------|
| code | 조건부 | PKCE 코드 교환용 |
| token_hash | 조건부 | recovery OTP 검증용 |
| type | 조건부 | `recovery` 등 |

**검증**

- code·token_hash 둘 다 없으면 400.
- OTP/코드 만료·유효하지 않음 → 400 (PKCE 오류 시 별도 안내 메시지).

---

#### 응답

**302 Redirect** — `Location: /auth/reset-password?verified=true`  
**400 Bad Request** — 토큰/코드 유효하지 않음 또는 만료  
**500 Internal Server Error**

---

## 7. 비밀번호 재설정 업데이트

### `POST /api/auth/reset-password/update`

재설정 링크로 진입한 **세션(쿠키)**이 있을 때, 새 비밀번호로 변경합니다.  
쿠키를 포함한 Supabase 클라이언트로 세션 확인 후 `updateUser({ password })` 호출합니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| password | string | O | 새 비밀번호 (trim, 최소 6자) |

**검증**

- password trim 후 빈 값 → 400.
- password 길이 < 6 → 400.
- 세션 없음 → 401.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "message": "비밀번호가 성공적으로 변경되었습니다."
}
```

**400 Bad Request** — 비밀번호 누락/6자 미만  
**401 Unauthorized** — 세션 없음(재설정 링크 만료 등)  
**500 Internal Server Error**

---

## 8. 테스트 로그인

### `POST /api/auth/test-login`

테스트용 로그인. **Anon 키** Supabase 클라이언트로 `signInWithPassword` 호출합니다.  
운영 환경에서는 노출을 제한하는 것이 좋습니다.

---

#### 요청

**Body (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| email | string | O | trim |
| password | string | O | trim |

**검증**

- email 또는 password 누락 → 400.

---

#### 응답

**200 OK**

```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "user",
    "hasSession": true
  }
}
```

**400 Bad Request** — 이메일/비밀번호 누락  
**그 외** — `success: false`, `error`, `details` (Supabase 에러 메시지 등)

---

이 문서는 `src/app/api/auth/**/route.ts` 구현을 기준으로 작성되었습니다.
