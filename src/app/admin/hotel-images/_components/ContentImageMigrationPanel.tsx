"use client";

import React, { useState } from "react";
import {
  Database,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HotelSearchWidget from "@/components/shared/hotel-search-widget";

interface ContentMigrationStatus {
  status:
    | "idle"
    | "searching"
    | "extracting"
    | "migrating"
    | "completed"
    | "error";
  message?: string;
  extractedImages?: {
    source: "property_details" | "property_location";
    url: string;
    context?: string;
  }[];
  migratedImages?: {
    originalUrl: string;
    newUrl: string;
    seq: number;
    source: "property_details" | "property_location";
  }[];
  statistics?: {
    totalImages: number;
    successfulMigrations: number;
    failedMigrations: number;
    skippedImages: number;
  };
}

export function ContentImageMigrationPanel() {
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [migrationStatus, setMigrationStatus] =
    useState<ContentMigrationStatus>({ status: "idle" });

  // 호텔 선택 핸들러
  const handleHotelSelect = (sabreId: string | null, hotelInfo?: any) => {
    if (!sabreId || !hotelInfo) {
      setSelectedHotel(null);
      return;
    }

    setSelectedHotel({
      sabreId: hotelInfo.sabre_id,
      nameKr: hotelInfo.property_name_ko,
      nameEn: hotelInfo.property_name_en,
      slug: hotelInfo.slug,
    });
  };

  // 호텔 본문 이미지 추출 및 마이그레이션
  const handleContentMigration = async () => {
    if (!selectedHotel) {
      setMigrationStatus({
        status: "error",
        message: "호텔을 선택해주세요.",
      });
      return;
    }

    setMigrationStatus({
      status: "searching",
      message: "호텔 정보를 조회하는 중...",
    });

    try {
      // 1단계: 호텔 정보 조회 및 이미지 URL 추출
      const extractResponse = await fetch("/api/hotel-images/content/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sabreId: selectedHotel.sabreId }),
      });

      const extractResult = await extractResponse.json();

      if (!extractResponse.ok) {
        throw new Error(extractResult.error || "이미지 추출 실패");
      }

      setMigrationStatus({
        status: "extracting",
        message: `${extractResult.data.extractedImages.length}개의 이미지를 발견했습니다. 마이그레이션을 시작합니다...`,
        extractedImages: extractResult.data.extractedImages,
      });

      // 2단계: 이미지 마이그레이션
      const migrateResponse = await fetch("/api/hotel-images/content/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sabreId: selectedHotel.sabreId,
          images: extractResult.data.extractedImages,
        }),
      });

      const migrateResult = await migrateResponse.json();

      if (!migrateResponse.ok) {
        throw new Error(migrateResult.error || "마이그레이션 실패");
      }

      setMigrationStatus({
        status: "completed",
        message:
          migrateResult.message || "본문 이미지 마이그레이션이 완료되었습니다.",
        extractedImages: extractResult.data.extractedImages,
        migratedImages: migrateResult.data.migratedImages,
        statistics: migrateResult.data.statistics,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "본문 이미지 마이그레이션 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 호텔 검색 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">호텔 선택</h3>
        <HotelSearchWidget
          title="본문 이미지 마이그레이션할 호텔 선택"
          description="호텔명 또는 Sabre ID로 검색하여 선택하세요"
          hideHeader={true}
          enableHotelEdit={false}
          showInitialHotels={false}
          enableImageManagement={false}
          onHotelSelect={handleHotelSelect}
        />

        {selectedHotel && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">선택된 호텔</span>
            </div>
            <div className="text-sm text-blue-800">
              <div>
                <strong>Sabre ID:</strong> {selectedHotel.sabreId}
              </div>
              <div>
                <strong>한글명:</strong> {selectedHotel.nameKr}
              </div>
              <div>
                <strong>영문명:</strong> {selectedHotel.nameEn}
              </div>
              <div>
                <strong>슬러그:</strong> {selectedHotel.slug}
              </div>
            </div>
          </div>
        )}

        {/* 마이그레이션 버튼 */}
        {selectedHotel && (
          <div className="mt-4">
            <Button
              onClick={handleContentMigration}
              disabled={
                migrationStatus.status === "searching" ||
                migrationStatus.status === "extracting" ||
                migrationStatus.status === "migrating"
              }
              className="flex items-center gap-2 w-full"
            >
              {migrationStatus.status === "searching" ||
              migrationStatus.status === "extracting" ||
              migrationStatus.status === "migrating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              본문 이미지 마이그레이션 시작
            </Button>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p>
            • <code>property_details</code>와 <code>property_location</code>{" "}
            컬럼에서 이미지 URL을 추출합니다
          </p>
          <p>• 기존 갤러리 이미지 다음 순번으로 저장됩니다</p>
          <p>• 중복 이미지는 자동으로 스킵됩니다</p>
        </div>
      </div>

      {/* 추출된 이미지 목록 */}
      {migrationStatus.extractedImages &&
        migrationStatus.extractedImages.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">추출된 본문 이미지</h3>
            <div className="space-y-3">
              {migrationStatus.extractedImages.map((image, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 border rounded-lg"
                >
                  {/* 이미지 미리보기 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border">
                      <img
                        src={image.url}
                        alt={`본문 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-xs">이미지 로드 실패</span></div>';
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {image.source}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        이미지 {index + 1}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 break-all mb-1">
                      {image.url}
                    </div>

                    {image.context && (
                      <div className="text-xs text-gray-500">
                        컨텍스트: {image.context.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 마이그레이션 결과 */}
      {migrationStatus.migratedImages &&
        migrationStatus.migratedImages.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">마이그레이션 결과</h3>
            <div className="space-y-3">
              {migrationStatus.migratedImages.map((image, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 border rounded-lg bg-green-50"
                >
                  {/* 마이그레이션된 이미지 미리보기 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border">
                      <img
                        src={image.newUrl}
                        alt={`마이그레이션된 이미지 ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML =
                            '<div class="w-full h-full flex items-center justify-center text-gray-400"><span class="text-xs">이미지 로드 실패</span></div>';
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        완료
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {image.source}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        순번: {image.seq}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          새로운 Supabase Storage URL:
                        </div>
                        <div className="text-sm text-gray-700 break-all bg-white p-2 rounded border">
                          {image.newUrl}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          기존 URL:
                        </div>
                        <div className="text-sm text-gray-500 break-all line-through">
                          {image.originalUrl}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 통계 정보 */}
      {migrationStatus.statistics && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">마이그레이션 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {migrationStatus.statistics.totalImages}
              </div>
              <div className="text-sm text-gray-600">총 이미지</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {migrationStatus.statistics.successfulMigrations}
              </div>
              <div className="text-sm text-gray-600">성공</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {migrationStatus.statistics.failedMigrations}
              </div>
              <div className="text-sm text-gray-600">실패</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {migrationStatus.statistics.skippedImages}
              </div>
              <div className="text-sm text-gray-600">스킵</div>
            </div>
          </div>
        </div>
      )}

      {/* 상태 표시 */}
      {migrationStatus.message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            migrationStatus.status === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : migrationStatus.status === "completed"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          {migrationStatus.status === "error" ? (
            <AlertCircle className="h-5 w-5" />
          ) : migrationStatus.status === "completed" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin" />
          )}
          <span>{migrationStatus.message}</span>
        </div>
      )}
    </div>
  );
}
