'use client'

import React, { useState } from 'react'
import { DollarSign, Image, Sliders, Star, Megaphone, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import HeroCarouselManager from './_components/HeroCarouselManager'
import PromotionManager from './_components/PromotionManager'
import BannerManager from './_components/BannerManager'
import BrandFeaturedManager from './_components/BrandFeaturedManager'
// import { PromoBannerManager } from './_components/PromoBannerManager'

type AdType = 'promo-banner' | 'banner' | 'carousel' | 'featured' | 'promotion' | 'brand-featured'

interface AdItem {
  id: string
  title: string
  description: string
  imageUrl: string
  isActive: boolean
  priority: number
  startDate: string
  endDate: string
  type: AdType
}

export default function AdminAdvertisementsPage() {
  const [activeTab, setActiveTab] = useState<AdType>('promo-banner')
  const [ads, setAds] = useState<AdItem[]>([
    {
      id: '1',
      title: '메인 베너 광고',
      description: '홈페이지 상단에 표시되는 메인 베너',
      imageUrl: '/api/login-images',
      isActive: true,
      priority: 1,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: 'banner'
    },
    {
      id: '2',
      title: '히어로 캐러셀 1',
      description: '메인 페이지 히어로 섹션 캐러셀',
      imageUrl: '/api/login-images',
      isActive: true,
      priority: 1,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: 'carousel'
    },
    {
      id: '3',
      title: '피처드 호텔 1',
      description: '추천 호텔 피처드 섹션',
      imageUrl: '/api/login-images',
      isActive: true,
      priority: 1,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: 'featured'
    }
  ])

  const tabs = [
    { id: 'promo-banner', label: '랜딩 프로모션 띠 베너 노출 관리', icon: Megaphone },
    { id: 'carousel', label: '랜딩 히어로 캐러셀 노출 관리', icon: Sliders },
    { id: 'promotion', label: '랜딩 프로모션 노출 관리', icon: Megaphone },
    { id: 'featured', label: '랜딩 신규 등록 호텔', icon: Star },
    { id: 'brand-featured', label: '브랜드 별 피처드 호텔', icon: Star },
    { id: 'banner', label: '호텔 목록 메인 베너 노출 관리', icon: Image }
  ]

  const filteredAds = ads.filter(ad => ad.type === activeTab)

  const toggleAdStatus = (id: string) => {
    setAds(ads.map(ad => 
      ad.id === id ? { ...ad, isActive: !ad.isActive } : ad
    ))
  }

  const deleteAd = (id: string) => {
    setAds(ads.filter(ad => ad.id !== id))
  }

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh]">
        {/* 페이지 헤더 */}
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">광고 노출 관리</h1>
            <p className="text-sm text-gray-600 mt-1">호텔 광고 노출 및 프로모션을 관리하세요</p>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AdType)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* 광고 관리 콘텐츠 */}
        <div className="space-y-6">
          {activeTab === 'promo-banner' ? (
            // 랜딩 프로모션 띠 베너: 공통 컴포넌트 재사용 (surface='띠베너')
            <PromotionManager title="랜딩 프로모션 띠 베너 노출 관리" surface="띠베너" />
          ) : activeTab === 'banner' ? (
            // 상단 베너 관리 컴포넌트
            <BannerManager />
          ) : activeTab === 'carousel' ? (
            // 히어로 캐러셀 관리 컴포넌트
            <HeroCarouselManager />
          ) : activeTab === 'promotion' ? (
            // 프로모션 관리 컴포넌트
            <PromotionManager title="프로모션 관리" surface="프로모션" />
          ) : activeTab === 'featured' ? (
            // 랜딩 신규 등록 호텔: surface='신규등록' 대상
            <PromotionManager title="신규 등록 호텔 노출 관리" surface="신규등록" />
          ) : activeTab === 'brand-featured' ? (
            // 브랜드 별 피처드 호텔: surface='브랜드베너' 대상
            <BrandFeaturedManager />
          ) : (
            <>
              {/* 새 광고 추가 버튼 */}
              <div className="flex justify-end">
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  <Plus className="h-4 w-4" />
                  새 광고 추가
                </button>
              </div>

              {/* 광고 목록 */}
              <div className="bg-white rounded-lg border shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    {tabs.find(tab => tab.id === activeTab)?.label}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {filteredAds.length > 0 ? (
                    filteredAds.map((ad) => (
                      <div key={ad.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                                <Image className="h-8 w-8 text-gray-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="text-lg font-medium text-gray-900">{ad.title}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  ad.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {ad.isActive ? '활성' : '비활성'}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  우선순위 {ad.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{ad.description}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>시작일: {ad.startDate}</span>
                                <span>종료일: {ad.endDate}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleAdStatus(ad.id)}
                              className={`p-2 rounded-md ${
                                ad.isActive 
                                  ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-100' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                              }`}
                              title={ad.isActive ? '비활성화' : '활성화'}
                            >
                              {ad.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md" title="편집">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => deleteAd(ad.id)}
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
                        {activeTab === 'featured' && <Star className="h-12 w-12 mx-auto" />}
                      </div>
                      <p className="text-gray-500">등록된 광고가 없습니다.</p>
                      <button className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                        첫 번째 광고를 추가해보세요
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
