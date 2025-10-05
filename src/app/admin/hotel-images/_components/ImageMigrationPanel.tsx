"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HotelSearchWidget from "@/components/shared/hotel-search-widget";
import {
  buildOriginalFilename,
  buildPublicFilename,
  buildOriginalPath,
  buildPublicPath,
} from "@/lib/media-naming";

interface MigrationFile {
  column: string;
  originalUrl: string;
  originalPath: string;
  publicPath: string;
  seq: number;
  filename: string;
  fileSize: number;
  uploaded: boolean;
  skipReason: string | null;
  publicUploaded: boolean;
  publicSkipReason: string | null;
}

interface MigrationStatus {
  status: "idle" | "fetching" | "migrating" | "completed" | "error";
  message?: string;
  progress?: number;
  statistics?: {
    uploadedCount: number;
    skippedCount: number;
    publicUploadedCount: number;
    publicSkippedCount: number;
  };
  migratedImages?: {
    column: string;
    originalUrl: string;
    newUrl: string;
    seq: number;
  }[];
}

interface HotelImage {
  column: string;
  url: string;
  seq: number;
  checked: boolean;
}

interface HotelInfo {
  sabreId: string;
  nameKr: string;
  nameEn: string;
  slug: string;
}

export function ImageMigrationPanel() {
  const [selectedHotel, setSelectedHotel] = useState<HotelInfo | null>(null);
  const [hotelImages, setHotelImages] = useState<HotelImage[]>([]);
  const [hotelSlug, setHotelSlug] = useState("");
  const [_shotDate, _setShotDate] = useState("");
  const [_sourceId, _setSourceId] = useState("hotel");
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    status: "idle",
  });
  const [previewPaths, setPreviewPaths] = useState<
    { original: string; public: string }[]
  >([]);

  // 호텔 선택 핸들러
  const handleHotelSelect = (sabreId: string | null, hotelInfo?: {
    sabre_id: string;
    property_name_ko: string | null;
    property_name_en: string | null;
    slug?: string;
  }) => {
    if (!sabreId || !hotelInfo) return;

    // 임시로 기본 슬러그 설정 (API에서 실제 slug를 받아올 때까지)
    const tempSlug = `hotel-${sabreId}`;

    setSelectedHotel({
      sabreId: hotelInfo.sabre_id,
      nameKr: hotelInfo.property_name_ko || '',
      nameEn: hotelInfo.property_name_en || '',
      slug: tempSlug,
    });
    setHotelSlug(tempSlug);
    fetchHotelImages(hotelInfo.sabre_id);
  };

  // 호텔 이미지 URL 조회
  const fetchHotelImages = async (sabreId: string) => {
    setMigrationStatus({
      status: "fetching",
      message: "호텔 이미지 정보를 조회하는 중...",
    });

    try {
      const response = await fetch(`/api/hotel-images/list?sabreId=${sabreId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "이미지 조회 실패");
      }

      const images = result.data.images.map((img: {
        column: string;
        url: string;
        seq: number;
      }) => ({
        column: img.column,
        url: img.url,
        seq: img.seq,
        checked: true, // 기본적으로 모두 선택
      }));

      // 호텔 슬러그 업데이트
      if (result.data.hotel?.slug) {
        setHotelSlug(result.data.hotel.slug);
        setSelectedHotel((prev) =>
          prev ? { ...prev, slug: result.data.hotel.slug } : null,
        );
      }

      setHotelImages(images);
      setMigrationStatus({ status: "idle" });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "이미지 조회 중 오류가 발생했습니다.",
      });
    }
  };

  // 미리보기 경로 생성
  const generatePreviewPaths = (images: HotelImage[]) => {
    if (!hotelSlug || !selectedHotel) return;

    const paths = images
      .filter((img) => img.checked)
      .map(({ seq }) => {
        const originalFilename = buildOriginalFilename({
          hotelSlug,
          sabreId: selectedHotel.sabreId,
          seq,
          ext: "jpg",
        });

        const publicFilename = buildPublicFilename({
          hotelSlug,
          sabreId: selectedHotel.sabreId,
          seq,
          width: 1600,
          format: "avif",
        });

        return {
          original: buildOriginalPath(hotelSlug, originalFilename),
          public: buildPublicPath(hotelSlug, publicFilename),
        };
      });

    setPreviewPaths(paths);
  };

  // 호텔 이미지 변경 시 미리보기 업데이트
  useEffect(() => {
    if (hotelImages.length > 0) {
      generatePreviewPaths(hotelImages);
    }
  }, [hotelImages, hotelSlug, selectedHotel]);

  // 이미지 선택 토글
  const toggleImageSelection = (column: string) => {
    setHotelImages((prev) =>
      prev.map((img) =>
        img.column === column ? { ...img, checked: !img.checked } : img,
      ),
    );
  };

  // 마이그레이션 실행
  const handleMigration = async () => {
    if (!selectedHotel || !hotelSlug) {
      setMigrationStatus({
        status: "error",
        message: "호텔을 선택하고 슬러그를 입력해주세요.",
      });
      return;
    }

    const selectedImages = hotelImages.filter((img) => img.checked);
    if (selectedImages.length === 0) {
      setMigrationStatus({
        status: "error",
        message: "마이그레이션할 이미지를 선택해주세요.",
      });
      return;
    }

    setMigrationStatus({
      status: "migrating",
      message: "이미지 마이그레이션 중...",
      progress: 0,
    });

    try {
      const response = await fetch("/api/hotel-images/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hotelSlug,
          sabreId: selectedHotel.sabreId,
          images: selectedImages.map((img) => ({
            column: img.column,
            url: img.url,
            seq: img.seq,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "마이그레이션 실패");
      }

      const statistics = result.data.statistics;
      const migratedFiles = result.data.migratedFiles || [];
      const detailedMessage =
        result.message ||
        `마이그레이션 완료: 업로드 ${statistics?.uploadedCount || 0}개, 스킵 ${statistics?.skippedCount || 0}개`;

      // 마이그레이션된 이미지 URL 생성
      const migratedImages = (migratedFiles as MigrationFile[])
        .filter((file) => file.uploaded)
        .map((file) => {
          const publicFilename = buildPublicFilename({
            hotelSlug,
            sabreId: selectedHotel.sabreId,
            seq: file.seq,
            width: 1600,
            format: "avif",
          });
          const publicPath = buildPublicPath(hotelSlug, publicFilename);

          return {
            column: file.column,
            originalUrl: file.originalUrl,
            newUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/hotel-media/${publicPath}`,
            seq: file.seq,
          };
        });

      setMigrationStatus({
        status: "completed",
        message: detailedMessage,
        statistics: statistics,
        migratedImages: migratedImages,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "마이그레이션 중 오류가 발생했습니다.",
      });
    }
  };

  // 파일명 템플릿 생성
  const generateFilenameTemplate = () => {
    if (!hotelSlug || !selectedHotel) return;

    const templates = [];
    for (let i = 1; i <= 5; i++) {
      const originalFilename = buildOriginalFilename({
        hotelSlug,
        sabreId: selectedHotel.sabreId,
        seq: i,
        ext: "jpg",
      });

      const publicFilename = buildPublicFilename({
        hotelSlug,
        sabreId: selectedHotel.sabreId,
        seq: i,
        width: 1600,
        format: "avif",
      });

      templates.push({
        seq: i,
        original: originalFilename,
        public: publicFilename,
      });
    }

    console.log("파일명 템플릿:", templates);

    setMigrationStatus({
      status: "completed",
      message: "파일명 템플릿이 콘솔에 출력되었습니다.",
    });
  };

  // 이미지 경로 마이그레이션
  const handlePathMigration = async () => {
    if (!selectedHotel || !hotelSlug) {
      setMigrationStatus({
        status: "error",
        message: "호텔을 선택하고 슬러그를 입력해주세요.",
      });
      return;
    }

    setMigrationStatus({
      status: "migrating",
      message: "이미지 경로 마이그레이션 중...",
    });

    try {
      const response = await fetch("/api/hotel-images/migrate-paths", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sabreId: selectedHotel.sabreId,
          hotelSlug,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "경로 마이그레이션 실패");
      }

      // 경로 마이그레이션된 이미지 URL 생성
      const newUrls = result.data.newUrls || [];
      const migratedImages = newUrls.map((url: string, index: number) => ({
        column: `image_${index + 1}`,
        originalUrl: hotelImages[index]?.url || "",
        newUrl: url,
        seq: index + 1,
      }));

      setMigrationStatus({
        status: "completed",
        message:
          result.message || "이미지 경로가 성공적으로 마이그레이션되었습니다.",
        migratedImages: migratedImages,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "경로 마이그레이션 중 오류가 발생했습니다.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 호텔 검색 */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">호텔 선택</h3>
        <HotelSearchWidget
          title="마이그레이션할 호텔 선택"
          description="이미지 URL이 있는 호텔을 검색하고 선택하세요"
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
            </div>
          </div>
        )}
      </div>

      {/* 기본 정보 입력 */}
      {selectedHotel && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">마이그레이션 설정</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                호텔 슬러그
              </label>
              <Input
                value={hotelSlug}
                onChange={(e) => setHotelSlug(e.target.value)}
                placeholder="capella-bangkok"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sabre ID
              </label>
              <Input
                value={selectedHotel.sabreId}
                disabled
                className="w-full bg-gray-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* 호텔 이미지 목록 */}
      {hotelImages.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">호텔 이미지 목록</h3>
          <div className="space-y-4">
            {hotelImages.map((image) => (
              <div
                key={image.column}
                className="flex items-start gap-4 p-4 border rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={image.checked}
                  onChange={() => toggleImageSelection(image.column)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />

                {/* 이미지 미리보기 */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                    <img
                      src={image.url}
                      alt={`${image.column} 미리보기`}
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
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {String(image.seq).padStart(2, "0")}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {image.column}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 break-all mb-2">
                    {image.url}
                  </div>
                  <div className="text-xs text-gray-500">원본 이미지 URL</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 파일 경로 미리보기 */}
      {previewPaths.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">생성될 파일 경로</h3>
          <div className="space-y-3">
            {previewPaths.map((path, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded">
                <div className="text-sm">
                  <div className="font-medium text-gray-700 mb-1">원본:</div>
                  <div className="text-xs font-mono text-gray-600 break-all">
                    hotel-media/{path.original}
                  </div>
                  <div className="font-medium text-gray-700 mb-1 mt-2">
                    공개:
                  </div>
                  <div className="text-xs font-mono text-gray-600 break-all">
                    hotel-media/{path.public}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {selectedHotel && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex gap-4">
            <Button
              onClick={handleMigration}
              disabled={
                !hotelSlug ||
                hotelImages.filter((img) => img.checked).length === 0 ||
                migrationStatus.status === "migrating"
              }
              className="flex items-center gap-2"
            >
              {migrationStatus.status === "migrating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              이미지 마이그레이션 실행
            </Button>

            <Button
              onClick={generateFilenameTemplate}
              disabled={!hotelSlug}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              파일명 템플릿 생성
            </Button>

            <Button
              onClick={handlePathMigration}
              disabled={!hotelSlug || migrationStatus.status === "migrating"}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {migrationStatus.status === "migrating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              이미지 경로 마이그레이션
            </Button>
          </div>
        </div>
      )}

      {/* 상태 표시 */}
      {migrationStatus.message && (
        <div
          className={`p-4 rounded-lg ${
            migrationStatus.status === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : migrationStatus.status === "completed"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {migrationStatus.status === "error" ? (
              <AlertCircle className="h-5 w-5" />
            ) : migrationStatus.status === "completed" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            <span className="font-medium">{migrationStatus.message}</span>
          </div>

          {/* 상세 통계 표시 */}
          {migrationStatus.status === "completed" &&
            migrationStatus.statistics && (
              <div className="mt-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-medium text-gray-700 mb-1">
                      원본 파일
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>업로드:</span>
                        <span className="font-medium text-green-600">
                          {migrationStatus.statistics.uploadedCount}개
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>스킵:</span>
                        <span className="font-medium text-yellow-600">
                          {migrationStatus.statistics.skippedCount}개
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700 mb-1">
                      공개 파일
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>업로드:</span>
                        <span className="font-medium text-green-600">
                          {migrationStatus.statistics.publicUploadedCount}개
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>스킵:</span>
                        <span className="font-medium text-yellow-600">
                          {migrationStatus.statistics.publicSkippedCount}개
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* 마이그레이션 결과 이미지 */}
      {migrationStatus.status === "completed" &&
        migrationStatus.migratedImages &&
        migrationStatus.migratedImages.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              마이그레이션 결과 이미지
            </h3>
            <div className="space-y-4">
              {migrationStatus.migratedImages.map((image) => (
                <div
                  key={image.column}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-green-50"
                >
                  {/* 마이그레이션된 이미지 미리보기 */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border">
                      <img
                        src={image.newUrl}
                        alt={`${image.column} 마이그레이션 결과`}
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
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <span className="text-xs font-medium text-green-600">
                          {String(image.seq).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {image.column}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        마이그레이션 완료
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          새로운 Supabase Storage URL:
                        </div>
                        <div className="text-sm text-gray-700 break-all bg-white p-2 rounded border">
                          {image.newUrl}
                        </div>
                      </div>

                      {image.originalUrl && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">
                            기존 URL:
                          </div>
                          <div className="text-sm text-gray-500 break-all line-through">
                            {image.originalUrl}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
