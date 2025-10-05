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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    hotels: any[];
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

  // 전체 마이그레이션 시작
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

  // 컴포넌트 마운트 시 통계 조회
  useEffect(() => {
    fetchHotelStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* 설정 섹션 */}
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

      {/* 에러 목록 */}
      {migrationStatus.errors && migrationStatus.errors.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">오류 목록</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {migrationStatus.errors.map((error, index) => (
              <div
                key={index}
                className="text-sm text-red-700 bg-white p-2 rounded border"
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
