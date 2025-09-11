'use client';

import React from 'react';
import { Building } from 'lucide-react';
import SabreIdManager from './_components/SabreIdManager';
import { AuthGuard } from '@/components/shared/auth-guard';

export default function AdminSabreIdPage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh]">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <Building className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sabre ID 검색</h1>
            <p className="text-sm text-gray-600 mt-1">Sabre ID를 입력하여 호텔 정보를 직접 조회하세요</p>
          </div>
        </div>

        <SabreIdManager />
      </div>
    </AuthGuard>
  );
}
