'use client'

import React, { useState } from 'react'
import { DollarSign, Plus, Edit, Trash2, Calendar, Users, TrendingUp } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'

interface Promotion {
  id: string
  title: string
  description: string
  discountType: 'percentage' | 'fixed' | 'free'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  targetUsers: 'all' | 'members' | 'new'
  usageLimit: number
  usedCount: number
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: '1',
      title: '신규 가입자 20% 할인',
      description: '신규 회원 가입 시 모든 호텔 20% 할인 혜택',
      discountType: 'percentage',
      discountValue: 20,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: true,
      targetUsers: 'new',
      usageLimit: 1000,
      usedCount: 150
    },
    {
      id: '2',
      title: 'VIP 멤버 전용 50,000원 할인',
      description: 'VIP 멤버 전용 고정 금액 할인 혜택',
      discountType: 'fixed',
      discountValue: 50000,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      isActive: true,
      targetUsers: 'members',
      usageLimit: 500,
      usedCount: 89
    },
    {
      id: '3',
      title: '첫 예약 무료 취소',
      description: '첫 번째 예약 시 무료 취소 혜택',
      discountType: 'free',
      discountValue: 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      isActive: false,
      targetUsers: 'new',
      usageLimit: 2000,
      usedCount: 0
    }
  ])

  const togglePromotionStatus = (id: string) => {
    setPromotions(promotions.map(promo => 
      promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
    ))
  }

  const deletePromotion = (id: string) => {
    setPromotions(promotions.filter(promo => promo.id !== id))
  }

  const getDiscountText = (promotion: Promotion) => {
    switch (promotion.discountType) {
      case 'percentage':
        return `${promotion.discountValue}% 할인`
      case 'fixed':
        return `${promotion.discountValue.toLocaleString()}원 할인`
      case 'free':
        return '무료 혜택'
      default:
        return ''
    }
  }

  const getTargetUsersText = (targetUsers: string) => {
    switch (targetUsers) {
      case 'all':
        return '전체 사용자'
      case 'members':
        return '회원 전용'
      case 'new':
        return '신규 사용자'
      default:
        return ''
    }
  }

  const getUsageProgress = (usedCount: number, usageLimit: number) => {
    return Math.min((usedCount / usageLimit) * 100, 100)
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh]">
        {/* 페이지 헤더 */}
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-green-600 p-2">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">프로모션 관리</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 예약 프로모션 및 할인 혜택을 관리하세요</p>
          </div>
        </div>

        {/* 프로모션 관리 콘텐츠 */}
        <div className="space-y-6">
          {/* 새 프로모션 추가 버튼 */}
          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              <Plus className="h-4 w-4" />
              새 프로모션 추가
            </button>
          </div>

          {/* 프로모션 목록 */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">프로모션 목록</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {promotions.length > 0 ? (
                promotions.map((promotion) => (
                  <div key={promotion.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-3">
                          <h4 className="text-lg font-medium text-gray-900">{promotion.title}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            promotion.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {promotion.isActive ? '활성' : '비활성'}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getDiscountText(promotion)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {getTargetUsersText(promotion.targetUsers)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>시작: {promotion.startDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>종료: {promotion.endDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4" />
                            <span>사용: {promotion.usedCount}/{promotion.usageLimit}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            <span>진행률: {getUsageProgress(promotion.usedCount, promotion.usageLimit).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* 사용량 진행률 바 */}
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getUsageProgress(promotion.usedCount, promotion.usageLimit)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => togglePromotionStatus(promotion.id)}
                          className={`p-2 rounded-md ${
                            promotion.isActive 
                              ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
                              : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                          }`}
                          title={promotion.isActive ? '비활성화' : '활성화'}
                        >
                          {promotion.isActive ? '🟢' : '⚪'}
                        </button>
                        <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md" title="편집">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deletePromotion(promotion.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md" 
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-4">
                    <DollarSign className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-500">등록된 프로모션이 없습니다.</p>
                  <button className="mt-2 text-green-600 hover:text-green-800 text-sm">
                    첫 번째 프로모션을 추가해보세요
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
