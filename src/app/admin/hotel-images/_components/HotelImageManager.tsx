"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Database,
  Settings,
  Users,
  FileText,
} from "lucide-react";
import HotelSearchWidget from "@/components/shared/hotel-search-widget";
import { ImageMigrationPanel } from "./ImageMigrationPanel";
import { BulkImageMigrationPanel } from "./BulkImageMigrationPanel";
import { ContentImageMigrationPanel } from "./ContentImageMigrationPanel";

export function HotelImageManager() {
  const [activeTab, setActiveTab] = useState<
    | "management"
    | "individual-migration"
    | "gallery-migration"
    | "content-migration"
  >("management");

  return (
    <div className="min-h-[60vh]">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <ImageIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            호텔 이미지 관리
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            호텔을 검색하고 선택하여 이미지 URL을 관리하세요
          </p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("management")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "management"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              이미지 관리
            </div>
          </button>
          <button
            onClick={() => setActiveTab("individual-migration")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "individual-migration"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              개별 호텔 이미지 마이그레이션
            </div>
          </button>
          <button
            onClick={() => setActiveTab("gallery-migration")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "gallery-migration"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              전체 호텔 갤러리 이미지 마이그레이션
            </div>
          </button>
          <button
            onClick={() => setActiveTab("content-migration")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "content-migration"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              전체 호텔 본문 이미지 마이그레이션
            </div>
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "management" && (
        <HotelSearchWidget
          title="호텔 이미지 관리"
          description="호텔을 검색하고 선택하여 이미지를 관리하세요"
          hideHeader={true}
          enableHotelEdit={false}
          showInitialHotels={false}
          enableImageManagement={true}
        />
      )}

      {activeTab === "individual-migration" && <ImageMigrationPanel />}
      {activeTab === "gallery-migration" && <BulkImageMigrationPanel />}
      {activeTab === "content-migration" && <ContentImageMigrationPanel />}
    </div>
  );
}
