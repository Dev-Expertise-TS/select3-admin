// 호텔 검색 요청 타입
export interface SearchHotelRequest {
  searching_string: string;
}

// 호텔 검색 결과 타입
export interface HotelSearchResult {
  sabre_id: string | null;
  paragon_id: string | null;
  property_name_kor: string | null;
  property_name_eng: string | null;
  rate_plan_codes: string[] | null;
  created_at: string | null;
  chain_name_kr: string | null;
  brand_name_kr: string | null;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// 호텔 검색 API 응답 타입
export type HotelSearchApiResponse = ApiResponse<HotelSearchResult[]>;

// Rate Plan Code API 응답 타입
export type RatePlanCodesApiResponse = ApiResponse<string[]>;

// 외부 API 호출 요청 타입
export interface HotelDetailsRequest {
  RatePlanCode?: string[]; // optional로 변경
  ExactMatchOnly?: boolean; // optional로 변경
  HotelCode: string;
  CurrencyCode: string;
  StartDate: string;
  EndDate: string;
  Adults: number;
}

// 확장 패널 상태 타입
export interface ExpandedRowState {
  hotelId: string;
  currencyCode: string;
  adults: number;
  startDate: string;
  endDate: string;
  selectedRatePlanCodes: string[];
  originalRatePlanCodes: string[]; // DB의 원본 값들
  isLoading: boolean;
  isSaving: boolean;
  testResult: unknown;
  error: string | null;
  saveSuccess: boolean;
}