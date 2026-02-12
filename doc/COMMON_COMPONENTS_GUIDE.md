# 공통 컴포넌트 & 라이브러리 가이드

프로젝트 전체에서 재사용 가능한 공통 컴포넌트와 유틸리티를 정리한 가이드입니다.

## 📦 공통 컴포넌트

### 1. Modal (모달)

```tsx
import { Modal, ConfirmModal } from '@/components/shared'

// 기본 모달
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="모달 제목"
  size="md" // sm, md, lg, xl, full
  footer={<Button>확인</Button>}
>
  모달 내용
</Modal>

// 확인 모달
<ConfirmModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleConfirm}
  title="삭제 확인"
  message="정말 삭제하시겠습니까?"
  variant="destructive" // default, destructive
  confirmText="삭제"
  cancelText="취소"
/>
```

### 2. Alert (알림)

```tsx
import { Alert, StatusIndicator } from '@/components/shared'

// 알림 메시지
<Alert 
  variant="success" // success, error, warning, info
  message="저장되었습니다."
  onClose={handleClose}
/>

// 상태 인디케이터
<StatusIndicator variant="success" />
```

### 3. Loading (로딩)

```tsx
import { LoadingSpinner, LoadingOverlay, LoadingContainer, Skeleton } from '@/components/shared'

// 스피너
<LoadingSpinner size="md" text="로딩 중..." />

// 전체 화면 오버레이
<LoadingOverlay message="데이터를 불러오는 중..." />

// 컨테이너 로딩
<LoadingContainer message="처리 중..." />

// 스켈레톤
<Skeleton variant="text" width="100%" height={20} />
```

### 4. Table (테이블)

```tsx
import { Table, Pagination } from '@/components/shared'

const columns = [
  { key: 'id', label: 'ID', width: '80px', sortable: true },
  { 
    key: 'name', 
    label: '이름', 
    render: (row) => <strong>{row.name}</strong> 
  },
]

<Table
  columns={columns}
  data={data}
  keyExtractor={(row) => row.id}
  onRowClick={handleRowClick}
  sortColumn={sortColumn}
  sortDirection={sortDirection}
  onSort={handleSort}
  emptyMessage="데이터가 없습니다"
/>

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setPage}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
/>
```

### 5. EmptyState (빈 상태)

```tsx
import { EmptyState, NoSearchResults, ErrorState } from '@/components/shared'

// 일반 빈 상태
<EmptyState
  title="데이터가 없습니다"
  description="새 항목을 추가해주세요"
  action={{
    label: '추가하기',
    onClick: handleAdd
  }}
/>

// 검색 결과 없음
<NoSearchResults 
  searchTerm="검색어" 
  onClear={handleClear} 
/>

// 에러 상태
<ErrorState 
  message="데이터를 불러올 수 없습니다" 
  onRetry={handleRetry} 
/>
```

## 🪝 공통 Hooks

### 1. useApi (API 호출)

```tsx
import { useApi, useFetch, useMutation } from '@/hooks'

// 일반 API 호출
const { data, loading, error, execute } = useApi({
  onSuccess: (data) => console.log('성공:', data),
  onError: (error) => console.error('오류:', error),
})

const handleLoad = async () => {
  await execute(async () => {
    const response = await fetch('/api/data')
    return response.json()
  })
}

// Fetch 래퍼
const { data, loading, error, fetch } = useFetch('/api/data')

useEffect(() => {
  fetch()
}, [])

// Mutation (POST/PUT/DELETE)
const { mutate, loading } = useMutation(
  async (variables) => {
    const response = await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(variables),
    })
    return response.json()
  },
  {
    onSuccess: () => alert('저장되었습니다'),
  }
)

const handleSave = () => mutate({ name: 'test' })
```

### 2. useDisclosure (모달/토글 관리)

```tsx
import { useDisclosure, useMultipleDisclosure } from '@/hooks'

// 단일 상태
const { isOpen, open, close, toggle } = useDisclosure()

// 여러 상태 관리
const { states, open, close, toggle } = useMultipleDisclosure(
  ['modal1', 'modal2', 'modal3']
)

<Modal isOpen={states.modal1} onClose={() => close('modal1')} />
```

### 3. useTable (테이블 관리)

```tsx
import { useTable, usePagination, useSort } from '@/hooks'

// 전체 테이블 기능 (페이지네이션 + 정렬 + 검색)
const table = useTable({
  data: allData,
  initialPage: 1,
  initialPageSize: 20,
  initialSortColumn: 'createdAt',
  initialSortDirection: 'desc',
})

<Table
  data={table.data}
  columns={columns}
  sortColumn={table.sortColumn}
  sortDirection={table.sortDirection}
  onSort={table.handleSort}
/>

<Pagination
  currentPage={table.currentPage}
  totalPages={table.totalPages}
  onPageChange={table.goToPage}
/>

// 개별 사용
const pagination = usePagination({ initialPage: 1, initialPageSize: 20 })
const sort = useSort({ initialColumn: 'name', initialDirection: 'asc' })
```

## 🛠️ 공통 유틸리티

### 1. Validation (검증)

```tsx
import { validators, validate, validateForm } from '@/lib/common'

// 개별 검증
validators.required(value)
validators.email(email)
validators.minLength(password, 8)
validators.url(url)

// 규칙 기반 검증
const error = validate(value, [
  { validator: validators.required, message: '필수 항목입니다' },
  { validator: (v) => validators.minLength(v, 8), message: '8자 이상이어야 합니다' },
])

// 폼 전체 검증
const errors = validateForm(formValues, {
  email: [
    { validator: validators.required, message: '이메일을 입력하세요' },
    { validator: validators.email, message: '유효한 이메일을 입력하세요' },
  ],
  password: [
    { validator: validators.required, message: '비밀번호를 입력하세요' },
    { validator: (v) => validators.minLength(v, 8), message: '8자 이상' },
  ],
})
```

### 2. Format (포맷팅)

```tsx
import { 
  formatDate, 
  formatDateTime, 
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  formatFileSize,
  formatPercent,
  formatPhoneNumber,
  truncate,
  slugify,
  humanize
} from '@/lib/common'

// 날짜
formatDate(new Date(), 'short') // "2025.01.15"
formatDateTime(new Date()) // "2025.01.15 14:30"
formatRelativeTime(new Date()) // "3시간 전"

// 숫자
formatNumber(1234567) // "1,234,567"
formatCurrency(50000) // "₩50,000"
formatFileSize(1024 * 1024) // "1 MB"
formatPercent(0.75) // "75.0%"

// 텍스트
formatPhoneNumber('01012345678') // "010-1234-5678"
truncate('긴 텍스트입니다...', 10) // "긴 텍스트입..."
slugify('Hello World!') // "hello-world"
humanize('userName') // "User Name"
```

## 📖 사용 예시

### 완전한 CRUD 페이지 예시

```tsx
'use client'

import { useState } from 'react'
import { 
  Modal, 
  Alert, 
  Table, 
  Pagination, 
  LoadingContainer,
  EmptyState 
} from '@/components/shared'
import { useDisclosure, useTable, useMutation } from '@/hooks'
import { validateForm, validators } from '@/lib/common'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const modal = useDisclosure()
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const table = useTable({
    data: users,
    initialPageSize: 20,
    initialSortColumn: 'createdAt',
  })

  const { mutate: createUser, loading } = useMutation(
    async (data) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return res.json()
    },
    {
      onSuccess: () => {
        setAlert({ variant: 'success', message: '사용자가 생성되었습니다' })
        modal.close()
      },
      onError: (error) => {
        setAlert({ variant: 'error', message: error })
      },
    }
  )

  const columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: '이름', sortable: true },
    { key: 'email', label: '이메일' },
  ]

  return (
    <div className="space-y-4">
      <h1>사용자 관리</h1>

      {alert && (
        <Alert
          variant={alert.variant}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <button onClick={modal.open}>새 사용자</button>

      {table.data.length === 0 ? (
        <EmptyState
          title="사용자가 없습니다"
          action={{ label: '추가하기', onClick: modal.open }}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={table.data}
            keyExtractor={(row) => row.id}
            sortColumn={table.sortColumn}
            sortDirection={table.sortDirection}
            onSort={table.handleSort}
          />
          
          <Pagination
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.goToPage}
          />
        </>
      )}

      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="새 사용자 추가"
      >
        {/* 폼 내용 */}
      </Modal>
    </div>
  )
}
```

## ✅ 마이그레이션 가이드

기존 코드를 공통 컴포넌트로 마이그레이션할 때:

1. **모달 패턴** → `<Modal>` 또는 `<ConfirmModal>` 사용
2. **로딩 스피너** → `<LoadingSpinner>` 사용
3. **알림 메시지** → `<Alert>` 사용
4. **테이블** → `<Table>` + `<Pagination>` 사용
5. **API 호출** → `useApi`, `useFetch`, `useMutation` 사용
6. **모달 상태** → `useDisclosure` 사용
7. **검증 로직** → `validators`, `validateForm` 사용
8. **포맷팅** → `format*` 함수들 사용

이를 통해 코드 중복을 줄이고 일관성 있는 UX를 제공할 수 있습니다.

