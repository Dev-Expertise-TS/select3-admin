'use client';

import React from 'react';
import { Building } from 'lucide-react';
import SabreIdManager from './_components/SabreIdManager';
// import { AppShell } from '@/components/shared/app-shell';

export default function AdminSabreIdPage() {
  return (
    <div className="min-h-[60vh]">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <Building className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sabre Hotel Code 확인</h1>
          <p className="text-sm text-gray-600 mt-1">호텔 영문명을 검색하여 Sabre Hotel Code를 조회하세요</p>
        </div>
      </div>

      <SabreIdManager />
    </div>
  );
}
