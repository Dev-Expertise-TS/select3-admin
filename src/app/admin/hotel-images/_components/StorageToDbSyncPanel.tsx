'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SyncStatus {
  status: 'idle' | 'checking' | 'syncing' | 'completed' | 'error'
  message?: string
  data?: {
    storageFileCount: number
    dbRecordCount: number
    difference: number
    needsSync: boolean
  }
  result?: {
    totalFiles: number
    recordsProcessed: number
    insertedCount: number
    updatedCount?: number
    skippedCount: number
    errorCount: number
    errors?: string[] | Array<{ sabre_id: string; file_name: string; error: string }>
    parseErrors?: string[]
  }
}

export function StorageToDbSyncPanel() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' })
  const [dryRun, setDryRun] = useState(true)

  // 현재 상태 확인
  const handleCheckStatus = async () => {
    setSyncStatus({ status: 'checking', message: '상태 확인 중...' })

    try {
      const response = await fetch('/api/hotel-images/sync-storage-to-db', {
        method: 'GET',
      })

      const result = await response.json()

      if (result.success) {
        setSyncStatus({
          status: 'idle',
          message: result.message,
          data: result.data,
        })
      } else {
        setSyncStatus({
          status: 'error',
          message: result.error || '상태 확인 실패',
        })
      }
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: error instanceof Error ? error.message : '상태 확인 중 오류 발생',
      })
    }
  }

  // 동기화 실행
  const handleSync = async () => {
    if (!dryRun && !confirm('실제로 DB에 레코드를 생성하시겠습니까?')) {
      return
    }

    setSyncStatus({
      status: 'syncing',
      message: dryRun ? 'Dry run 실행 중...' : '동기화 실행 중...',
    })

    try {
      const response = await fetch('/api/hotel-images/sync-storage-to-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      })

      const result = await response.json()

      if (result.success) {
        setSyncStatus({
          status: 'completed',
          message: result.message,
          result: result.data,
        })
      } else {
        setSyncStatus({
          status: 'error',
          message: result.error || '동기화 실패',
        })
      }
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: error instanceof Error ? error.message : '동기화 중 오류 발생',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Database className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Storage → DB 동기화
            </h3>
            <p className="text-sm text-blue-800">
              Supabase Storage에 업로드된 이미지 파일들의 메타데이터를 select_hotel_media 테이블에 동기화합니다.
            </p>
            <ul className="mt-2 text-xs text-blue-700 space-y-1 list-disc list-inside">
              <li>Storage의 public/ 및 original/ 폴더를 스캔합니다</li>
              <li>파일명에서 sabre_id와 slug를 추출합니다</li>
              <li>중복 레코드는 자동으로 스킵됩니다</li>
              <li>Dry run으로 먼저 테스트할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 컨트롤 패널 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">동기화 설정</h3>
        
        <div className="space-y-4">
          {/* Dry Run 옵션 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Dry Run (실제 삽입하지 않고 시뮬레이션만)
              </span>
            </label>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              type="button"
              onClick={handleCheckStatus}
              disabled={syncStatus.status === 'checking' || syncStatus.status === 'syncing'}
              variant="outline"
            >
              {syncStatus.status === 'checking' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  확인 중...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  현재 상태 확인
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSync}
              disabled={syncStatus.status === 'checking' || syncStatus.status === 'syncing'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncStatus.status === 'syncing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {dryRun ? 'Dry Run 실행 중...' : '동기화 중...'}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  {dryRun ? 'Dry Run 실행' : '동기화 실행'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 상태 표시 */}
      {syncStatus.data && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">현재 상태</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Storage 파일</div>
              <div className="text-2xl font-bold text-gray-900">
                {syncStatus.data.storageFileCount}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">DB 레코드</div>
              <div className="text-2xl font-bold text-gray-900">
                {syncStatus.data.dbRecordCount}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">차이</div>
              <div className={`text-2xl font-bold ${syncStatus.data.difference > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {syncStatus.data.difference}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">동기화 필요</div>
              <div className="text-2xl font-bold">
                {syncStatus.data.needsSync ? (
                  <span className="text-orange-600">예</span>
                ) : (
                  <span className="text-green-600">아니오</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 결과 표시 */}
      {syncStatus.result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            {syncStatus.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-600" />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              {dryRun ? 'Dry Run 결과' : '동기화 결과'}
            </h3>
          </div>

          <div className="space-y-4">
            {/* 통계 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-1">처리된 파일</div>
                <div className="text-xl font-bold text-blue-900">
                  {syncStatus.result.recordsProcessed}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 mb-1">생성됨</div>
                <div className="text-xl font-bold text-green-900">
                  {syncStatus.result.insertedCount}
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-600 mb-1">업데이트됨</div>
                <div className="text-xl font-bold text-yellow-900">
                  {syncStatus.result.updatedCount || 0}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">스킵됨</div>
                <div className="text-xl font-bold text-gray-900">
                  {syncStatus.result.skippedCount}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 mb-1">오류</div>
                <div className="text-xl font-bold text-red-900">
                  {syncStatus.result.errorCount}
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {syncStatus.result.errors && syncStatus.result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-900 mb-2">
                  삽입 오류 ({syncStatus.result.errors.length}개)
                </h4>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-red-100">
                      <tr>
                        <th className="text-left p-2 font-semibold text-red-900">Sabre ID</th>
                        <th className="text-left p-2 font-semibold text-red-900">파일명</th>
                        <th className="text-left p-2 font-semibold text-red-900">오류</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncStatus.result.errors.map((error, idx) => {
                        // error가 객체인 경우와 문자열인 경우 모두 처리
                        if (typeof error === 'object' && error !== null) {
                          const errObj = error as { sabre_id: string; file_name: string; error: string }
                          return (
                            <tr key={idx} className="border-t border-red-200">
                              <td className="p-2 font-mono text-red-900">{errObj.sabre_id}</td>
                              <td className="p-2 font-mono text-red-800">{errObj.file_name}</td>
                              <td className="p-2 text-red-700">{errObj.error}</td>
                            </tr>
                          )
                        } else {
                          return (
                            <tr key={idx} className="border-t border-red-200">
                              <td colSpan={3} className="p-2 font-mono text-red-800">{String(error)}</td>
                            </tr>
                          )
                        }
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {syncStatus.result.parseErrors && syncStatus.result.parseErrors.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-900 mb-2">파싱 오류</h4>
                <div className="max-h-40 overflow-y-auto">
                  <ul className="text-xs text-orange-800 space-y-1">
                    {syncStatus.result.parseErrors.map((error, idx) => (
                      <li key={idx} className="font-mono">{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 메시지 */}
            <div className={`rounded-lg p-4 ${
              syncStatus.status === 'completed' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-orange-50 border border-orange-200'
            }`}>
              <p className={`text-sm font-medium ${
                syncStatus.status === 'completed' ? 'text-green-900' : 'text-orange-900'
              }`}>
                {syncStatus.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {syncStatus.status === 'error' && syncStatus.message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-900">{syncStatus.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
