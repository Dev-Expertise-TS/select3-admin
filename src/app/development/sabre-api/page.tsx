"use client";

import React, { useState } from "react";
import {
  Code,
  ExternalLink,
  Play,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Zap,
  Database,
} from "lucide-react";

interface SabreApiEndpoint {
  id: string;
  name: string;
  method: "POST" | "GET";
  url: string;
  description: string;
  category: string;
  requestBody?: object;
  responseExample?: object;
  notes?: string[];
}

const sabreApiEndpoints: SabreApiEndpoint[] = [
  {
    id: "hotel-details",
    name: "Hotel Details",
    method: "POST",
    url: "https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre/hotel-details",
    description: "특정 호텔의 상세 정보와 요금 플랜을 조회하는 API",
    category: "Hotel Information",
    requestBody: {
      RatePlanCode: ["API", "XLO"],
      ExactMatchOnly: true,
      HotelCode: "390433",
      CurrencyCode: "KRW",
      StartDate: "2025-08-22",
      EndDate: "2025-08-24",
      Adults: 2,
    },
    responseExample: {
      success: true,
      data: {
        HotelCode: "390433",
        HotelName: "Sample Hotel",
        RatePlans: [
          {
            RatePlanCode: "API",
            RatePlanName: "Best Available Rate",
            AmountAfterTax: "150000",
            CurrencyCode: "KRW",
            RateKey: "sample-rate-key-123",
          },
        ],
      },
    },
    notes: [
      "RatePlanCode가 없을 경우 RatePlanCode와 ExactMatchOnly 필드를 요청에서 제거해야 함",
      "StartDate와 EndDate는 YYYY-MM-DD 형식으로 전송",
      "Adults는 1 이상의 정수값만 허용",
      "응답 데이터는 JSON 형태이며, 파싱 실패 시 Raw 텍스트로 표시",
    ],
  },
];

const ratePlanCodes = [
  "API",
  "ZP3",
  "VMC",
  "TLC",
  "H01",
  "S72",
  "XLO",
  "PPR",
  "FAN",
  "WMP",
  "HPM",
  "TID",
  "STP",
];

const architectureComponents = [
  {
    name: "Select Admin Frontend",
    description: "호텔 관리 및 검색 인터페이스",
    type: "Next.js 15 App",
    responsibilities: [
      "호텔 검색 및 표시",
      "Rate Plan Code 관리",
      "API 테스트 인터페이스",
      "결과 데이터 시각화",
    ],
  },
  {
    name: "Sabre API Gateway",
    description: "Sabre 시스템과의 중간 게이트웨이 서버",
    type: "Node.js API Server",
    responsibilities: [
      "Sabre API 인증 관리",
      "요청/응답 변환",
      "에러 처리 및 로깅",
      "CORS 헤더 관리",
    ],
  },
  {
    name: "Sabre GDS System",
    description: "Sabre Global Distribution System",
    type: "External API",
    responsibilities: [
      "실시간 호텔 정보 제공",
      "요금 및 가용성 조회",
      "예약 시스템 연동",
      "글로벌 호텔 데이터베이스",
    ],
  },
];

export default function SabreApiSpec() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Code className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sabre API Specification
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Sabre GDS 연동 API 구조 분석 및 사용 가이드
          </p>
        </div>
      </div>

      {/* JSON 응답 구조 분석 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          Sabre API JSON 응답 구조 분석
        </h2>

        {/* 성공 응답 구조 */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
              <Check className="h-5 w-5" />
              성공 응답 구조 (Success Response)
            </h3>
          </div>
          <div className="p-6">
            <pre className="text-sm bg-gray-50 p-4 rounded border overflow-x-auto mb-4">
              <code>
                {JSON.stringify(
                  {
                    success: true,
                    data: {
                      HotelCode: "390433",
                      HotelName: "Sample Hotel Seoul",
                      Location: {
                        Address: "123 Gangnam-gu, Seoul",
                        City: "Seoul",
                        Country: "KR",
                      },
                      RatePlans: [
                        {
                          RatePlanCode: "API",
                          RatePlanName: "Best Available Rate",
                          RatePlanDescription: "공시 요금",
                          AmountBeforeTax: "135000.00",
                          AmountAfterTax: "150000.00",
                          TaxAmount: "15000.00",
                          CurrencyCode: "KRW",
                          RateKey: "sample-rate-key-abc123",
                          Availability: "Available",
                          RoomType: "Standard Room",
                          BedType: "Double",
                          MaxOccupancy: 2,
                          Amenities: ["WiFi", "Breakfast", "Parking"],
                          CancellationPolicy: "Free cancellation until 6 PM",
                          ValidDates: {
                            CheckIn: "2025-08-22",
                            CheckOut: "2025-08-24",
                          },
                        },
                      ],
                      TotalResults: 1,
                      SearchCriteria: {
                        Adults: 2,
                        Currency: "KRW",
                        RatePlanCodes: ["API"],
                      },
                    },
                    meta: {
                      requestId: "req_12345",
                      timestamp: "2025-08-22T10:30:00Z",
                      processingTime: "1.234s",
                    },
                  },
                  null,
                  2
                )}
              </code>
            </pre>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  최상위 필드 (Root Level)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      success
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Boolean - API 호출 성공 여부
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      data
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Object - 실제 호텔 및 요금 데이터
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      meta
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Object - 요청 메타데이터 (선택적)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  data 객체 구조
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      HotelCode
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - Sabre 호텔 식별자
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      HotelName
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 호텔명
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      Location
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Object - 호텔 위치 정보
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RatePlans
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Array - 요금 플랜 목록 (핵심 데이터)
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  RatePlans 배열 항목 구조
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RatePlanCode
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 요금 플랜 코드
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      AmountAfterTax
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 세금 포함 최종 금액
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RateKey
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 예약 시 필요한 키
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      CurrencyCode
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 통화 코드 (KRW, USD 등)
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      Availability
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      String - 예약 가능 여부
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      Amenities
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      Array - 포함 서비스 목록
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 에러 응답 구조 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              에러 응답 구조 (Error Response)
            </h3>
          </div>
          <div className="p-6">
            <pre className="text-sm bg-gray-50 p-4 rounded border overflow-x-auto mb-4">
              <code>
                {JSON.stringify(
                  {
                    success: false,
                    error: {
                      code: "HOTEL_NOT_FOUND",
                      message: "Hotel with code 390433 not found",
                      details: {
                        hotelCode: "390433",
                        searchDate: "2025-08-22",
                        suggestion: "Please check hotel code and try again",
                      },
                    },
                    meta: {
                      requestId: "req_67890",
                      timestamp: "2025-08-22T10:30:00Z",
                    },
                  },
                  null,
                  2
                )}
              </code>
            </pre>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-red-50 p-3 rounded border">
                  <code className="font-mono text-sm font-semibold">
                    success
                  </code>
                  <div className="text-xs text-gray-600 mt-1">
                    Boolean - false (실패)
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded border">
                  <code className="font-mono text-sm font-semibold">
                    error.code
                  </code>
                  <div className="text-xs text-gray-600 mt-1">
                    String - 에러 코드
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded border">
                  <code className="font-mono text-sm font-semibold">
                    error.message
                  </code>
                  <div className="text-xs text-gray-600 mt-1">
                    String - 에러 메시지
                  </div>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>JSON 파싱 실패 시:</strong> 프로젝트에서는 원본
                    텍스트를 그대로 표시하여 디버깅을 지원함.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RateKey와 Room 정보 연결 구조 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          RateKey와 Room 정보 연결 구조
        </h2>

        {/* RateKey 중심 데이터 구조 */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
              <Database className="h-5 w-5" />
              RateKey 중심 데이터 구조
            </h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                RateKey는 Sabre API에서 특정 요금과 객실 조합을 고유하게
                식별하는 핵심 키. 하나의 RateKey는 특정 RatePlanCode + RoomType
                + 날짜 조합에 대응됨 .
              </p>
            </div>

            <pre className="text-sm bg-gray-50 p-4 rounded border overflow-x-auto mb-4">
              <code>
                {JSON.stringify(
                  {
                    RatePlans: [
                      {
                        RateKey: "HTL390433-API-STD-20250822-20250824-2ADT",
                        RatePlanCode: "API",
                        RatePlanName: "Best Available Rate",
                        RatePlanDescription: "공시 요금 - 최저가 보장",
                        AmountAfterTax: "150000.00",
                        CurrencyCode: "KRW",
                        RoomDetails: {
                          RoomType: "STD",
                          RoomTypeName: "Standard Room",
                          RoomName: "디럭스 더블룸",
                          Description:
                            "시티뷰가 있는 25평방미터 객실, 킹사이즈 침대 1개",
                          BedType: "King",
                          MaxOccupancy: 2,
                          RoomSize: "25 sqm",
                          ViewType: "City View",
                          FloorLevel: "High Floor Available",
                        },
                        RoomAmenities: [
                          "Free WiFi",
                          "Air Conditioning",
                          "Mini Bar",
                          "Safe Box",
                          "Hair Dryer",
                          "Bathtub",
                        ],
                        RatePlanInclusions: [
                          "Daily Breakfast for 2",
                          "Late Check-out (2PM)",
                          "Free Parking",
                        ],
                      },
                      {
                        RateKey: "HTL390433-PPR-SUP-20250822-20250824-2ADT",
                        RatePlanCode: "PPR",
                        RatePlanName: "Prepaid Rate",
                        RatePlanDescription: "선불 결제 할인 요금",
                        AmountAfterTax: "135000.00",
                        CurrencyCode: "KRW",
                        RoomDetails: {
                          RoomType: "SUP",
                          RoomTypeName: "Superior Room",
                          RoomName: "수페리어 트윈룸",
                          Description:
                            "한강뷰가 있는 30평방미터 객실, 트윈 침대 2개",
                          BedType: "Twin",
                          MaxOccupancy: 2,
                          RoomSize: "30 sqm",
                          ViewType: "River View",
                          FloorLevel: "Premium Floor",
                        },
                        RoomAmenities: [
                          "Free WiFi",
                          "Air Conditioning",
                          "Premium Mini Bar",
                          "Electronic Safe",
                          "Premium Amenities",
                          "Rainfall Shower",
                        ],
                        RatePlanInclusions: [
                          "Daily Breakfast for 2",
                          "Welcome Drink",
                          "Newspaper",
                          "Free Parking",
                        ],
                      },
                    ],
                  },
                  null,
                  2
                )}
              </code>
            </pre>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  RateKey 구성 요소 분석
                </h4>
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <div className="text-sm">
                    <div className="font-mono font-semibold text-gray-900 mb-2">
                      HTL390433-API-STD-20250822-20250824-2ADT
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-xs">
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">HTL390433</div>
                        <div className="text-gray-600">Hotel Code</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">API</div>
                        <div className="text-gray-600">Rate Plan</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">STD</div>
                        <div className="text-gray-600">Room Type</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">20250822</div>
                        <div className="text-gray-600">Check-in</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">20250824</div>
                        <div className="text-gray-600">Check-out</div>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <div className="font-semibold">2ADT</div>
                        <div className="text-gray-600">2 Adults</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Room 정보 계층 구조
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RoomType
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      코드 (STD, SUP, DLX, STE)
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RoomTypeName
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      영문 객실 유형명
                    </div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      RoomName
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      현지화된 객실명 (한글)
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      Description
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      상세 설명 (크기, 뷰, 침대)
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      BedType
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      침대 유형 (King, Queen, Twin)
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <code className="font-mono text-sm font-semibold">
                      ViewType
                    </code>
                    <div className="text-xs text-gray-600 mt-1">
                      뷰 타입 (City, Ocean, River)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 요금 코드별 Room 조합 매트릭스 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 bg-green-50 border-b border-green-200">
            <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              요금 코드별 Room 조합 매트릭스
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              각 호텔은 요금 코드(RatePlanCode)와 객실 유형(RoomType)의 조합으로
              다양한 상품을 제공함. 동일한 객실도 요금 코드에 따라 포함 혜택과
              가격이 달라짐.
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                      Rate Plan Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                      Room Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                      Room Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-300">
                      Key Features
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      RateKey Pattern
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-300">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        API
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 font-mono text-sm">
                      STD
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300">
                      디럭스 더블룸
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 text-sm">
                      조식 포함, 무료 주차, 킹 침대
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      HTL390433-API-STD-...
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-300">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        PPR
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 font-mono text-sm">
                      SUP
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300">
                      수페리어 트윈룸
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 text-sm">
                      선불할인, 조식, 웰컴드링크, 강변뷰
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      HTL390433-PPR-SUP-...
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-300">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        XLO
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 font-mono text-sm">
                      DLX
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300">
                      디럭스 스위트
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 text-sm">
                      장기할인, 거실분리, 킹 침대, 시티뷰
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      HTL390433-XLO-DLX-...
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-300">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        CORP
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 font-mono text-sm">
                      STD
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300">
                      비즈니스 더블룸
                    </td>
                    <td className="px-4 py-3 border-r border-gray-300 text-sm">
                      기업할인, 무료 WiFi, 비즈니스센터
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      HTL390433-CORP-STD-...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  조합 규칙 및 특징
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded border">
                    <h5 className="font-semibold text-blue-900 mb-2">
                      1:N 관계
                    </h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 하나의 RatePlanCode → 여러 RoomType 가능</li>
                      <li>• 하나의 RoomType → 여러 RatePlanCode 가능</li>
                      <li>• 각 조합마다 고유한 RateKey 생성</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded border">
                    <h5 className="font-semibold text-green-900 mb-2">
                      동적 가격 정책
                    </h5>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• 날짜에 따른 가격 변동</li>
                      <li>• 요금코드별 할인율 차등 적용</li>
                      <li>• 객실 유형별 기본 요금 차이</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>중요:</strong> RateKey는 예약 처리 시 필수 정보.
                    사용자가 선택한 요금과 객실 조합을 정확히 식별하여 예약
                    시스템에 전달해야 함.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 아키텍처 다이어그램 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          시스템 아키텍처
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {architectureComponents.map((component, index) => (
              <div key={index} className="relative">
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                  <div className="text-center mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {component.name}
                    </h3>
                    <div className="text-xs text-gray-500 mt-1">
                      {component.type}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 text-center">
                    {component.description}
                  </p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {component.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        {resp}
                      </li>
                    ))}
                  </ul>
                </div>
                {index < architectureComponents.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API 엔드포인트 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          API 엔드포인트
        </h2>
        <div className="space-y-4">
          {sabreApiEndpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      {endpoint.method}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {endpoint.name}
                    </h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {endpoint.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {endpoint.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded border text-gray-800">
                    {endpoint.url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(endpoint.url, endpoint.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="URL 복사"
                  >
                    {copiedId === endpoint.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Request Body */}
                {endpoint.requestBody && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Request Body
                    </h4>
                    <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto">
                      <code>
                        {JSON.stringify(endpoint.requestBody, null, 2)}
                      </code>
                    </pre>
                  </div>
                )}

                {/* Response Example */}
                {endpoint.responseExample && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Response Example
                    </h4>
                    <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto">
                      <code>
                        {JSON.stringify(endpoint.responseExample, null, 2)}
                      </code>
                    </pre>
                  </div>
                )}

                {/* Notes */}
                {endpoint.notes && endpoint.notes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      주의사항
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {endpoint.notes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Plan Codes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Rate Plan Codes
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-4">
            Sabre API에서 사용하는 요금 플랜 코드들입니다. 각 코드는 특정한 요금
            정책이나 할인 조건을 나타냄.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ratePlanCodes.map((code) => (
              <div key={code} className="text-center">
                <span className="inline-block px-3 py-2 bg-blue-100 text-blue-800 rounded-lg font-mono text-sm font-medium border border-blue-200">
                  {code}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>참고:</strong> Rate Plan Code는 데이터베이스의 enum
                타입으로 관리되며, 새로운 코드가 추가될 경우 데이터베이스 스키마
                업데이트가 필요함.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 요청 파라미터 상세 설명 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          요청 파라미터 상세
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parameter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  HotelCode
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  String
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  Sabre 시스템의 호텔 고유 식별자 (sabre_id)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  StartDate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  String
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  체크인 날짜 (YYYY-MM-DD 형식)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  EndDate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  String
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  체크아웃 날짜 (YYYY-MM-DD 형식)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  Adults
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Number
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  성인 인원 수 (1 이상의 정수)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  CurrencyCode
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  String
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Optional
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  통화 코드 (기본값: KRW)
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  RatePlanCode
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  String[]
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Optional
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  조회할 요금 플랜 코드 배열
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                  ExactMatchOnly
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Boolean
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Conditional
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  RatePlanCode가 있을 때 true, 없을 때 필드 생략
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 사용 예시 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          프로젝트 내 사용 예시
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-4">
            본 프로젝트에서는 호텔 검색 위젯에서 Sabre API를 호출하여 실시간
            요금 정보를 조회함.
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                1. 호텔 검색 및 선택
              </h4>
              <p className="text-sm text-gray-600">
                사용자가 호텔을 검색하고 목록에서 특정 호텔을 선택함.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                2. 확장 패널 표시
              </h4>
              <p className="text-sm text-gray-600">
                선택된 호텔 행이 확장되어 API 테스트 컨트롤 패널이 표시됨.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                3. 파라미터 설정
              </h4>
              <p className="text-sm text-gray-600">
                체크인/체크아웃 날짜, 인원 수, Rate Plan Code 등을 설정함.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                4. API 호출 및 결과 표시
              </h4>
              <p className="text-sm text-gray-600">
                Sabre API를 호출하고 결과를 JSON 형태로 표시함.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border rounded">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              구현 파일
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  src/components/shared/hotel-search-widget.tsx
                </code>{" "}
                - 메인 위젯 컴포넌트
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  src/app/api/rate-plan-codes/route.ts
                </code>{" "}
                - Rate Plan Code 전체 목록 조회 API
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  src/app/api/hotel/rate-plan-codes/route.ts
                </code>{" "}
                - 호텔별 Rate Plan Code 조회 API (외부 서비스용)
              </li>
              <li>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  src/app/api/hotel/update-rate-plan-codes/route.ts
                </code>{" "}
                - Rate Plan Code 저장 API
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Select Admin 내부 API (외부 서비스용) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Select Admin 내부 API (외부 서비스용)
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  GET
                </span>
                <h3 className="text-lg font-semibold text-gray-900">
                  호텔별 Rate Plan Codes 조회
                </h3>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                External API
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              특정 호텔에 설정된 Rate Plan Code 목록을 조회하는 API (외부
              서비스에서 호출)
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="text-sm font-mono bg-gray-100 px-3 py-1 rounded border text-gray-800">
                /api/hotel/rate-plan-codes?sabre_id=&#123;sabre_id&#125;
              </code>
              <button
                onClick={() =>
                  copyToClipboard(
                    "/api/hotel/rate-plan-codes",
                    "internal-api-url"
                  )
                }
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="URL 복사"
              >
                {copiedId === "internal-api-url" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* 인증 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                인증 (Authentication)
              </h4>
              <div className="bg-orange-50 p-4 rounded border border-orange-200">
                <p className="text-sm text-orange-800 mb-2">
                  <strong>Bearer 토큰 인증 필수</strong> - 환경 변수{" "}
                  <code className="bg-white px-1 rounded">API_TOKEN</code>에
                  설정된 값과 일치해야 함
                </p>
                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                  <code>{`Authorization: Bearer YOUR_API_TOKEN`}</code>
                </pre>
              </div>
            </div>

            {/* Request */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Play className="h-4 w-4" />
                Request
              </h4>
              <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto">
                <code>{`GET /api/hotel/rate-plan-codes?sabre_id=390433

Headers:
  Authorization: Bearer YOUR_API_TOKEN
  Content-Type: application/json`}</code>
              </pre>
            </div>

            {/* Query Parameters */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Query Parameters
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">
                        Parameter
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">
                        Required
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-r font-mono text-sm">
                        sabre_id
                      </td>
                      <td className="px-4 py-2 border-r text-sm">String</td>
                      <td className="px-4 py-2 border-r">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Required
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        Sabre 시스템 호텔 고유 식별자
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Response Examples */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Response Examples
              </h4>
              <div className="space-y-4">
                {/* Success */}
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      200 OK
                    </span>
                    <span className="text-sm text-green-800">성공</span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    <code>
                      {JSON.stringify(
                        {
                          success: true,
                          data: ["API", "XLO", "PPR", "TLC"],
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>

                {/* 401 */}
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                      401 Unauthorized
                    </span>
                    <span className="text-sm text-red-800">인증 실패</span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    <code>
                      {JSON.stringify(
                        {
                          success: false,
                          error: "인증 토큰이 유효하지 않습니다",
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>

                {/* 400 */}
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      400 Bad Request
                    </span>
                    <span className="text-sm text-yellow-800">
                      파라미터 누락
                    </span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    <code>
                      {JSON.stringify(
                        {
                          success: false,
                          error: "sabre_id 파라미터가 필요합니다",
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>

                {/* 404 */}
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      404 Not Found
                    </span>
                    <span className="text-sm text-gray-800">호텔 없음</span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                    <code>
                      {JSON.stringify(
                        {
                          success: false,
                          error: "해당 sabre_id의 호텔을 찾을 수 없습니다",
                        },
                        null,
                        2
                      )}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                참고사항
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                  응답 데이터는 select_hotels 테이블의 rate_plan_code 컬럼에서
                  조회됨
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                  rate_plan_code가 비어있으면 빈 배열([])이 반환됨
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                  캐시 비활성화: 항상 실시간 데이터 반환 (Cache-Control:
                  no-store)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
