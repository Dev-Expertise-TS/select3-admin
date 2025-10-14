"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Users,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Hotel {
  id_old: number;
  sabre_id: string;
  slug: string;
  property_name_ko: string;
  property_name_en: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  image_5?: string;
}

interface BulkMigrationStatus {
  status: "idle" | "fetching" | "migrating" | "paused" | "completed" | "error";
  message?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  currentBatch?: {
    startId: number;
    endId: number;
    hotels: Hotel[];
  };
  statistics?: {
    totalHotels: number;
    processedHotels: number;
    successfulMigrations: number;
    failedMigrations: number;
    skippedHotels: number;
  };
  errors?: string[];
}

export function BulkImageMigrationPanel() {
  const [batchSize, setBatchSize] = useState(50);
  const [startId, setStartId] = useState(0);
  const [maxId, setMaxId] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<BulkMigrationStatus>({
    status: "idle",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotels, setSelectedHotels] = useState<Set<string>>(new Set());
  const [isLoadingHotels, setIsLoadingHotels] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [failedHotels, setFailedHotels] = useState<Array<{ sabre_id: string; name_ko: string; name_en: string; error: string }>>([]);

  // 전체 호텔 수 및 최대 ID 조회
  const fetchHotelStats = async () => {
    setMigrationStatus({
      status: "fetching",
      message: "호텔 통계 정보를 조회하는 중...",
    });

    try {
      const response = await fetch("/api/hotel-images/bulk/stats");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "통계 조회 실패");
      }

      setMaxId(result.data.maxIdOld || 0);
      setMigrationStatus({ status: "idle" });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "통계 조회 중 오류가 발생했습니다.",
      });
    }
  };

  // 호텔 목록 조회
  const fetchHotels = async () => {
    setIsLoadingHotels(true);
    try {
      const response = await fetch("/api/hotel-images/bulk/list");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "호텔 목록 조회 실패");
      }

      // 영문 이름 순으로 정렬
      const sortedHotels = (result.data.hotels || []).sort((a: Hotel, b: Hotel) => {
        const nameA = (a.property_name_en || "").toLowerCase();
        const nameB = (b.property_name_en || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setHotels(sortedHotels);
    } catch (error) {
      console.error("호텔 목록 조회 오류:", error);
    } finally {
      setIsLoadingHotels(false);
    }
  };

  // 호텔 선택/해제
  const toggleHotelSelection = (sabreId: string) => {
    const newSelected = new Set(selectedHotels);
    if (newSelected.has(sabreId)) {
      newSelected.delete(sabreId);
    } else {
      newSelected.add(sabreId);
    }
    setSelectedHotels(newSelected);
  };

  // 현재 페이지 전체 선택/해제
  const toggleAllHotels = () => {
    const currentPageIds = paginatedHotels.map(h => h.sabre_id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedHotels.has(id));
    
    const newSelected = new Set(selectedHotels);
    
    if (allCurrentPageSelected) {
      // 현재 페이지의 모든 호텔 선택 해제
      currentPageIds.forEach(id => newSelected.delete(id));
    } else {
      // 현재 페이지의 모든 호텔 선택
      currentPageIds.forEach(id => newSelected.add(id));
    }
    
    setSelectedHotels(newSelected);
  };

  // 검색 필터링
  const filteredHotels = hotels.filter(hotel => {
    if (!searchQuery) return true;
    const query = String(searchQuery ?? '').toLowerCase();
    const nameEn = String(hotel.property_name_en ?? '').toLowerCase();
    const nameKo = String(hotel.property_name_ko ?? '').toLowerCase();
    const sabre = String(hotel.sabre_id ?? '').toLowerCase();
    return nameEn.includes(query) || nameKo.includes(query) || sabre.includes(query);
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHotels = filteredHotels.slice(startIndex, endIndex);

  // 페이지 변경 시 currentPage 리셋
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // 선택된 호텔 마이그레이션 시작
  const handleSelectedHotelsMigration = async () => {
    if (selectedHotels.size === 0) {
      setMigrationStatus({
        status: "error",
        message: "마이그레이션할 호텔을 선택해주세요.",
      });
      return;
    }

    setIsRunning(true);
    setMigrationStatus({
      status: "migrating",
      message: `선택된 ${selectedHotels.size}개 호텔의 이미지 마이그레이션을 시작합니다...`,
      progress: {
        current: 0,
        total: selectedHotels.size,
        percentage: 0,
      },
      statistics: {
        totalHotels: selectedHotels.size,
        processedHotels: 0,
        successfulMigrations: 0,
        failedMigrations: 0,
        skippedHotels: 0,
      },
    });

    try {
      const selectedSabreIds = Array.from(selectedHotels);
      
      const response = await fetch("/api/hotel-images/bulk/migrate-selected", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sabreIds: selectedSabreIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "마이그레이션 실패");
      }

      // 실패한 호텔 정보 추출
      const failed: Array<{ sabre_id: string; name_ko: string; name_en: string; error: string }> = [];
      if (result.data.failedHotels && Array.isArray(result.data.failedHotels)) {
        failed.push(...result.data.failedHotels);
      }
      setFailedHotels(failed);

      setMigrationStatus({
        status: "completed",
        message: result.message || "선택된 호텔 이미지 마이그레이션이 완료되었습니다.",
        statistics: result.data.statistics,
        errors: result.data.errors,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "마이그레이션 중 오류가 발생했습니다.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 전체 마이그레이션 시작 (ID 범위 기반)
  const handleBulkMigration = async () => {
    if (isRunning) {
      setIsRunning(false);
      setMigrationStatus((prev) => ({ ...prev, status: "paused" }));
      return;
    }

    setIsRunning(true);
    setMigrationStatus({
      status: "migrating",
      message: "전체 호텔 이미지 마이그레이션을 시작합니다...",
      progress: {
        current: 0,
        total: Math.ceil((maxId - startId + 1) / batchSize),
        percentage: 0,
      },
      statistics: {
        totalHotels: 0,
        processedHotels: 0,
        successfulMigrations: 0,
        failedMigrations: 0,
        skippedHotels: 0,
      },
    });

    try {
      const response = await fetch("/api/hotel-images/bulk/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startId,
          batchSize,
          maxId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "전체 마이그레이션 실패");
      }

      setMigrationStatus({
        status: "completed",
        message:
          result.message || "전체 호텔 이미지 마이그레이션이 완료되었습니다.",
        statistics: result.data.statistics,
      });
    } catch (error) {
      setMigrationStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "전체 마이그레이션 중 오류가 발생했습니다.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // 마이그레이션 리셋
  const handleReset = () => {
    setIsRunning(false);
    setMigrationStatus({ status: "idle" });
    setStartId(0);
  };

  // 컴포넌트 마운트 시 통계 및 호텔 목록 조회
  useEffect(() => {
    fetchHotelStats();
    fetchHotels();
  }, []);

  return (
    <div className="space-y-6">
      {/* 호텔 선택 섹션 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">호텔 선택</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedHotels.size}개 선택됨
            </span>
            <Button
              onClick={fetchHotels}
              disabled={isLoadingHotels}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingHotels ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 검색 */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="호텔명(영문/한글) 또는 Sabre ID로 검색..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* 페이지 정보 */}
        <div className="mb-2 text-sm text-gray-600">
          전체 {filteredHotels.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredHotels.length)}개 표시
        </div>

        {/* 호텔 리스트 테이블 */}
        {isLoadingHotels ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">호텔 목록을 불러오는 중...</span>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          paginatedHotels.length > 0 &&
                          paginatedHotels.every(hotel => selectedHotels.has(hotel.sabre_id))
                        }
                        onChange={toggleAllHotels}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sabre ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">호텔명 (영문)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">호텔명 (한글)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">이미지</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedHotels.map((hotel) => (
                    <tr
                      key={hotel.sabre_id}
                      className={`hover:bg-gray-50 ${selectedHotels.has(hotel.sabre_id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedHotels.has(hotel.sabre_id)}
                          onChange={() => toggleHotelSelection(hotel.sabre_id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{hotel.sabre_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{hotel.property_name_en || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{hotel.property_name_ko || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {[hotel.image_1, hotel.image_2, hotel.image_3, hotel.image_4, hotel.image_5].filter(Boolean).length}개
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginatedHotels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? '검색 결과가 없습니다.' : '호텔 목록이 없습니다.'}
              </div>
            )}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              페이지 {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                처음
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                이전
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                다음
              </Button>
              <Button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                마지막
              </Button>
            </div>
          </div>
        )}

        {/* 선택된 호텔 마이그레이션 버튼 */}
        <div className="mt-4 flex gap-4">
          <Button
            onClick={handleSelectedHotelsMigration}
            disabled={selectedHotels.size === 0 || isRunning}
            className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            전체 마이그레이션 시작 ({selectedHotels.size}개)
          </Button>
        </div>
      </div>

      {/* 설정 섹션 (ID 범위 기반) */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">전체 마이그레이션 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 ID (id_old)
            </label>
            <Input
              type="number"
              value={startId}
              onChange={(e) => setStartId(Number(e.target.value))}
              placeholder="0"
              min="0"
              className="w-full"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              배치 크기 (호텔 수)
            </label>
            <Input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              placeholder="50"
              min="1"
              max="100"
              className="w-full"
              disabled={isRunning}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 ID
            </label>
            <Input
              type="number"
              value={maxId}
              disabled
              className="w-full bg-gray-50"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            • 총 {Math.ceil((maxId - startId + 1) / batchSize)}개 배치로
            처리됩니다
          </p>
          <p>• 각 배치는 {batchSize}개 호텔씩 처리됩니다</p>
          <p>
            • id_old 기준으로 {startId}부터 {maxId}까지 처리됩니다
          </p>
        </div>
      </div>

      {/* 현재 배치 정보 */}
      {migrationStatus.currentBatch && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            현재 처리 중인 배치
          </h4>
          <div className="text-sm text-blue-800">
            <p>
              ID 범위: {migrationStatus.currentBatch.startId} ~{" "}
              {migrationStatus.currentBatch.endId}
            </p>
            <p>호텔 수: {migrationStatus.currentBatch.hotels.length}개</p>
          </div>
        </div>
      )}

      {/* 진행률 표시 */}
      {migrationStatus.progress && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">마이그레이션 진행률</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>진행률</span>
                <span>{migrationStatus.progress.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${migrationStatus.progress.percentage}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              배치 {migrationStatus.progress.current} /{" "}
              {migrationStatus.progress.total}
            </div>
          </div>
        </div>
      )}

      {/* 통계 정보 */}
      {migrationStatus.statistics && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">마이그레이션 통계</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {migrationStatus.statistics.totalHotels}
              </div>
              <div className="text-sm text-gray-600">총 호텔</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {migrationStatus.statistics.processedHotels}
              </div>
              <div className="text-sm text-gray-600">처리됨</div>
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
                {migrationStatus.statistics.skippedHotels}
              </div>
              <div className="text-sm text-gray-600">스킵</div>
            </div>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex gap-4">
          <Button
            onClick={handleBulkMigration}
            disabled={maxId === 0}
            className={`flex items-center gap-2 ${
              isRunning
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {migrationStatus.status === "migrating" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? "마이그레이션 일시정지" : "전체 마이그레이션 시작"}
          </Button>

          <Button
            onClick={handleReset}
            disabled={isRunning}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            초기화
          </Button>

          <Button
            onClick={fetchHotelStats}
            disabled={isRunning}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            통계 새로고침
          </Button>
        </div>
      </div>

      {/* 실패한 호텔 리포트 */}
      {failedHotels.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">
            실패한 호텔 목록 ({failedHotels.length}개)
          </h3>
          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-red-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">Sabre ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">호텔명 (한글)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">호텔명 (영문)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-red-900 uppercase">오류</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 bg-white">
                {failedHotels.map((hotel, index) => (
                  <tr key={`${hotel.sabre_id}-${index}`} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{hotel.sabre_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{hotel.name_ko || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{hotel.name_en || '-'}</td>
                    <td className="px-4 py-3 text-sm text-red-700">{hotel.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 에러 목록 */}
      {migrationStatus.errors && migrationStatus.errors.length > 0 && (
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
          <h3 className="text-lg font-semibold text-orange-900 mb-4">기타 오류 목록</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {migrationStatus.errors.map((error, index) => (
              <div
                key={index}
                className="text-sm text-orange-700 bg-white p-2 rounded border"
              >
                {error}
              </div>
            ))}
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
          ) : migrationStatus.status === "migrating" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Users className="h-5 w-5" />
          )}
          <span>{migrationStatus.message}</span>
        </div>
      )}
    </div>
  );
}
