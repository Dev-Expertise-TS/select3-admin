'use client'

import React, { useEffect, useState } from 'react'
import { 
  Building2, 
  GitBranch, 
  AlertTriangle, 
  FileText, 
  DollarSign,
  Gift,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardStats {
  totalHotels: number
  chainCount: number
  brandCount: number
  missingSabreId: number
  missingChainBrand: number
  missingBenefits: number
  missingIntroArticle: number
  missingBlogArticle: number
}

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  variant?: 'default' | 'warning' | 'danger'
  description?: string
}

function StatCard({ title, value, icon, variant = 'default', description }: StatCardProps) {
  const variants = {
    default: 'bg-blue-50 border-blue-200 text-blue-600',
    warning: 'bg-orange-50 border-orange-200 text-orange-600',
    danger: 'bg-red-50 border-red-200 text-red-600'
  }

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-500 mb-1">{title}</div>
          <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
          {description && (
            <div className="text-xs text-gray-400 mt-1">{description}</div>
          )}
        </div>
        <div className={cn('rounded-lg p-3', variants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          cache: 'no-store'
        })

        if (!response.ok) {
          const errorText = await response.text()
          setError(`통계 데이터를 불러올 수 없습니다. (${response.status}): ${errorText}`)
          return
        }

        const data = await response.json().catch(() => {
          setError('서버 응답을 파싱할 수 없습니다.')
          return null
        })

        if (!data) return
        
        if (data.success) {
          setStats(data.data)
        } else {
          setError(data.error || '데이터를 불러올 수 없습니다.')
        }
      } catch (err) {
        setError('네트워크 오류가 발생했습니다.')
        console.error('Stats fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-lg border bg-white p-5 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border bg-red-50 p-4 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{error || '데이터를 불러올 수 없습니다.'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 기본 통계 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 통계</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="전체 호텔"
            value={stats.totalHotels}
            icon={<Building2 className="h-6 w-6" />}
            description="등록된 총 호텔 수"
          />
          <StatCard
            title="호텔 체인"
            value={stats.chainCount}
            icon={<GitBranch className="h-6 w-6" />}
            description="등록된 체인 수"
          />
          <StatCard
            title="호텔 브랜드"
            value={stats.brandCount}
            icon={<Building2 className="h-6 w-6" />}
            description="등록된 브랜드 수"
          />
        </div>
      </div>

      {/* 누락 데이터 통계 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">데이터 품질 체크</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title="Sabre ID 누락"
            value={stats.missingSabreId}
            icon={<DollarSign className="h-6 w-6" />}
            variant={stats.missingSabreId > 0 ? 'danger' : 'default'}
            description="Sabre ID가 없는 호텔"
          />
          <StatCard
            title="체인/브랜드 누락"
            value={stats.missingChainBrand}
            icon={<GitBranch className="h-6 w-6" />}
            variant={stats.missingChainBrand > 0 ? 'warning' : 'default'}
            description="브랜드 연결이 없는 호텔"
          />
          <StatCard
            title="혜택 누락"
            value={stats.missingBenefits}
            icon={<Gift className="h-6 w-6" />}
            variant={stats.missingBenefits > 0 ? 'warning' : 'default'}
            description="혜택이 연결되지 않은 호텔"
          />
          <StatCard
            title="소개 아티클 누락"
            value={stats.missingIntroArticle}
            icon={<FileText className="h-6 w-6" />}
            variant={stats.missingIntroArticle > 0 ? 'warning' : 'default'}
            description="소개 글이 없는 호텔"
          />
          <StatCard
            title="블로그 아티클 누락"
            value={stats.missingBlogArticle}
            icon={<BookOpen className="h-6 w-6" />}
            variant={stats.missingBlogArticle > 0 ? 'warning' : 'default'}
            description="블로그 글이 없는 호텔"
          />
        </div>
      </div>
    </div>
  )
}
