'use client'

import React, { useEffect, useState } from 'react'
import { 
  Building2, 
  Image as ImageIcon,
  FileText,
  Globe,
  TrendingUp,
  Eye,
  Calendar,
  Gift,
  Users,
  BarChart3,
  CheckCircle2,
  Star,
  MapPin,
  Network,
  BarChart3 as PresentationChart,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  Clock,
  MousePointerClick,
  FileDown,
  Trophy,
  Languages
} from 'lucide-react'
import { cn } from '@/lib/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface FacilityProposalStats {
  totalHotels: number
  chainCount: number
  brandCount: number
  imageCount: number
  hotelsWithBenefits: number
  articleCount: number
  recommendationPageCount: number
  benefitCount: number
  regionCount: number
}

interface BrandTrafficData {
  brand_id: number
  brand_name_kr: string | null
  brand_name_en: string | null
  total_page_views: number
  total_users: number
  hotel_count: number
  article_count: number
  avg_time_on_page: number
  percentage: number
}

interface GoogleAnalyticsData {
  pageViews: {
    total: number
    last30Days: number
    last7Days: number
    today: number
    growth: number
  }
  users: {
    total: number
    last30Days: number
    last7Days: number
    newUsers: number
    returningUsers: number
  }
  sessions: {
    total: number
    last30Days: number
    avgSessionDuration: number
    bounceRate: number
  }
  trafficSources: {
    organic: number
    direct: number
    referral: number
    social: number
    paid: number
  }
  devices: {
    desktop: number
    mobile: number
    tablet: number
  }
  topCountries: Array<{
    country: string
    users: number
    percentage: number
  }>
  topPages: Array<{
    page: string
    views: number
    percentage: number
  }>
  hotelPages: {
    totalViews: number
    avgTimeOnPage: number
    hotelsViewed: number
  }
  pagesByCategory: {
    hotel: Array<{
      page: string
      views: number
      percentage: number
      hotelName?: string
    }>
    blog: Array<{
      page: string
      views: number
      percentage: number
      title?: string
    }>
    region: Array<{
      page: string
      views: number
      percentage: number
      regionName?: string
    }>
    recommendation: Array<{
      page: string
      views: number
      percentage: number
      title?: string
    }>
    other: Array<{
      page: string
      views: number
      percentage: number
    }>
  }
  pagesByPeriod: {
    today: {
      hotel: number
      blog: number
      region: number
      recommendation: number
      other: number
    }
    last7Days: {
      hotel: number
      blog: number
      region: number
      recommendation: number
      other: number
    }
    last30Days: {
      hotel: number
      blog: number
      region: number
      recommendation: number
      other: number
    }
    last90Days: {
      hotel: number
      blog: number
      region: number
      recommendation: number
      other: number
    }
  }
  monthlyTrend: Array<{
    month: string
    pageViews: number
    users: number
    conversions: number
  }>
  monthlyKpiTrend?: Array<{
    month: string
    pageViews: number
    users: number
    impressions: number
    clicks: number
  }>
  monthlyKpiTrendSource?: 'search-console' | 'estimated'
  seoRanking: {
    totalKeywords: number
    top10Keywords: number
    top20Keywords: number
    top50Keywords: number
    avgPosition: number
    totalImpressions: number
    totalClicks: number
    avgCTR: number
    topKeywords: Array<{
      keyword: string
      position: number
      impressions: number
      clicks: number
      ctr: number
    }>
  }
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  variant?: 'default' | 'primary' | 'success'
  trend?: {
    value: number
    label: string
  }
}

function StatCard({ title, value, icon, description, variant = 'default', trend }: StatCardProps) {
  const variants = {
    default: 'bg-white border-gray-200',
    primary: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200'
  }

  const iconVariants = {
    default: 'bg-gray-100 text-gray-600',
    primary: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600'
  }

  return (
    <div className={cn('rounded-lg border p-6 shadow-sm hover:shadow-md transition-shadow', variants[variant])}>
      <div className="flex items-center justify-between mb-4">
        <div className={cn('rounded-lg p-3', iconVariants[variant])}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-600 mt-1">{title}</div>
          {trend && (
            <div className={cn(
              'text-xs mt-1 flex items-center gap-1 justify-end',
              trend.value > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <ArrowUpRight className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')} />
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
      </div>
      {description && (
        <div className="text-xs text-gray-500 mt-2">{description}</div>
      )}
    </div>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  items: string[]
}

function FeatureCard({ title, description, icon, items }: FeatureCardProps) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="rounded-lg bg-blue-100 p-3 text-blue-600 shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FacilityProposalPage() {
  const [stats, setStats] = useState<FacilityProposalStats | null>(null)
  const [analytics, setAnalytics] = useState<GoogleAnalyticsData | null>(null)
  const [brandTraffic, setBrandTraffic] = useState<BrandTrafficData[] | null>(null)
  const [brandTrafficRaw, setBrandTrafficRaw] = useState<BrandTrafficData[] | null>(null) // 정규화 전 원본 데이터
  const [brandTrafficMeta, setBrandTrafficMeta] = useState<{ articlesWithoutBrand?: number; hotelsWithoutBrand?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 번역 객체
  const t = {
    ko: {
      title: 'About Tourvis Select',
      subtitle: '대한민국 No.1 프리미엄 호텔 예약 플랫폼',
      pngDownload: 'PNG 다운로드',
      pdfDownload: 'PDF 다운로드',
      markdownDownload: 'Markdown 다운로드',
      rapidGrowth: '최근 1년간 급성장',
      rapidGrowthDesc: '최근 1년간 유입 트래픽 및 예약 전환이 10배 이상 상승하여 플랫폼의 성장세와 고객 관심도가 지속적으로 증가하고 있습니다.',
      trafficAndStats: '유입 트래픽 및 조회 통계',
      monthlyMetrics: '월간 핵심 지표',
      last30Days: '최근 30일 기준',
      monthlyPageViews: '월간 페이지뷰',
      monthlyUsers: '월간 사용자수',
      monthlySessions: '월간 세션',
      bounceRate: '이탈률',
      monthOverMonth: '전월 대비',
      avgSessionTime: '평균 세션 시간',
      userEngagement: '사용자 참여도',
      monthlyClicks: '월간 클릭수',
      searchClicks: '검색 클릭',
      monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      year: '년',
      month: '월',
      trendSinceJuly: '2024년 7월 이후 추이 (월별)',
      monthlyTrendDesc: '월간 페이지뷰의 추이를 확인합니다.',
      registeredHotels: '등록 호텔 시설',
      totalHotels: '등록 호텔 수',
      hotelChains: '호텔 체인',
      hotelBrands: '호텔 브랜드',
      premiumHotels: '전 세계 프리미엄 호텔',
      globalChains: '글로벌 호텔 체인',
      premiumBrands: '프리미엄 브랜드',
      hotelImages: '호텔 이미지',
      hotelArticles: '호텔 아티클',
      highQualityPhotos: '고품질 호텔 사진',
      detailedContent: '상세 호텔 소개 콘텐츠',
      recommendationPages: '추천 페이지',
      themeRecommendations: '테마별 추천 페이지',
      contentAndFacilities: '콘텐츠 및 시설 정보',
      userStats: '사용자 통계',
      newUsers: '신규 사용자',
      returningUsers: '재방문 사용자',
      trafficSources: '트래픽 소스',
      searchEngine: '검색 엔진',
      directVisit: '직접 방문',
      referralSite: '레퍼럴 사이트',
      socialMedia: '소셜 미디어',
      paidAds: '유료 광고',
      devices: '디바이스별 접속',
      desktop: '데스크톱',
      mobile: '모바일',
      tablet: '태블릿',
      topCountries: '주요 접속 국가',
      platformCompetitiveness: '투어비스 셀렉트 플랫폼 경쟁력',
      no1Platform: '대한민국 No.1 프리미엄 호텔 플랫폼',
      targetCustomers: '타겟 고객',
      marketingEffect: '마케팅 효과',
      brandStrengthening: '브랜드 강화',
      partnerCompetitiveness: '투어비스 셀렉트의 프리미엄 호텔 파트너로서의 경쟁력',
      mainProposals: '주요 제안 사항:',
      gaIntegration: 'Google Analytics 연동',
      ga4Data: 'GA4 실데이터',
      searchConsoleData: 'Search Console 실데이터',
      no1PlatformDesc: '한국 최고의 프리미엄 호텔 전문 플랫폼으로 글로벌 브랜드와 긴밀한 파튼너쉽 확보',
      targetCustomersDesc: '프리미엄 여행을 선호하는 고객층에게 직접 노출되어 브랜드 인지도 향상 및 예약 전환율 증가',
      marketingEffectDesc: '테마별 추천 페이지를 통한 타겟팅 마케팅으로 고객 유입 및 예약 확대',
      brandStrengtheningDesc: '고품질 콘텐츠와 이미지를 통한 브랜드 이미지 강화 및 프리미엄 포지셔닝',
      platformIntro: '투어비스 셀렉트는 한국 최고의 프리미엄 호텔 전문 플랫폼으로, 엄선된 초상위 호텔 브랜드 {brandCount}개를 포함하여 {totalHotels}개 이상의 호텔을 보유하고 있습니다.',
      platformBenefits: '본 플랫폼을 통해 호텔 시설사는 고품질 콘텐츠와 다양한 마케팅 채널을 통해 타겟 고객에게 효과적으로 노출될 수 있으며, 호텔 컨시어지 전문가에 의한 상담을 통한 호텔 예약 전환을 기대할 수 있습니다.',
      proposal1: '호텔 정보를 고객의 예약 의도와 호텔 특징을 반영한 소개로 예약 전환율 향상',
      proposal2: '프리미엄 호텔의 테마를 정확히 해석한 소개로 차별화된 콘텐츠 마케팅',
      proposal3: '프리미엄 혜택 제공을 통한 브랜드 차별화',
      proposal4: '한국 최고 프리미엄 호텔 컨시어지 전문가의 전문 예약 상담 서비스 제공',
      brandTrafficTitle: '브랜드별 호텔 등록 보유 개수 및 트래픽 지표',
      totalHotelsCount: '총 호텔 수',
      registeredHotelsLabel: '등록 호텔',
      pageViews: '페이지뷰',
      users: '사용자',
      percentage: '비율',
      articles: '아티클',
      hotelContent: '호텔 콘텐츠',
      variousHotelInfo: '다양한 형태의 호텔 정보 제공',
      hotelsDetailedInfo: '개 호텔 상세 정보 제공',
      hotelArticlesBlogs: '개 호텔 아티클 및 블로그',
      bilingualSupport: '한국어/영어 이중 언어 지원',
      detailedLocationFacilities: '호텔 위치, 시설, 객실 정보 상세 제공',
      hotelFacilitiesBenefits: '호텔 시설 및 혜택',
      premiumBenefitsInfo: '프리미엄 호텔 혜택 정보',
      benefitCategories: '개 혜택 카테고리',
      hotelsWithBenefits: '개 호텔에 혜택 연결',
      variousBenefits: '조식, 업그레이드, 레이트 체크아웃 등 다양한 혜택',
      vipServices: 'VIP 서비스 및 특별 프로모션 정보',
      chartDesc: '(각 막대는 해당 월의 실제 페이지뷰 수를 나타냅니다. 누적값이 아닙니다.)',
      seoRanking: '국내 검색 SEO 순위 지표',
      totalKeywords: '총 키워드 수',
      top10Keywords: '상위 10위 키워드',
      top20Keywords: '상위 20위 키워드',
      top50Keywords: '상위 50위 키워드',
      avgSearchRank: '평균 검색 순위',
      avgCTR: '평균 클릭률 (CTR)',
      keywordDistribution: '순위별 키워드 분포',
      top10Rank: '상위 10위',
      top20Rank: '상위 20위',
      top50Rank: '상위 50위',
      southKorea: '대한민국',
      usa: '미국',
      japan: '일본',
      china: '중국',
      other: '기타',
      people: '명',
      imagesMedia: '이미지 및 미디어',
      highQualityImages: '고품질 호텔 이미지 제공',
      hotelImagesCount: '개 호텔 이미지',
      variousImages: '객실, 시설, 외관 등 다양한 이미지',
      highResPhotos: '고해상도 사진으로 호텔 경험 전달',
      imageGallery: '이미지 갤러리 및 슬라이더 제공',
      representativeImages: '호텔별 대표 이미지 관리',
      regionLocation: '지역 및 위치 정보',
      accurateRegionInfo: '정확한 지역 정보 제공',
      regionMapping: '개 지역 매핑',
      cityCountryClassification: '도시별, 국가별 호텔 분류',
      mapBasedLocation: '지도 기반 위치 정보',
      nearbyAttractions: '주변 관광지 및 교통 정보',
      regionalRecommendations: '지역별 추천 호텔 제공',
      countryKoToEn: {
        '대한민국': 'South Korea',
        '미국': 'USA',
        '일본': 'Japan',
        '중국': 'China',
        '기타': 'Other',
      },
    },
    en: {
      title: 'About Tourvis Select',
      subtitle: 'South Korea\'s NO.1 Premium Hotel Booking Platform',
      pngDownload: 'Download PNG',
      pdfDownload: 'Download PDF',
      markdownDownload: 'Download Markdown',
      rapidGrowth: 'Rapid Growth Over the Past Year',
      rapidGrowthDesc: 'Over the past year, traffic and booking conversions have increased more than 10-fold, demonstrating continuous growth and increasing customer interest in the platform.',
      trafficAndStats: 'Traffic & Statistics',
      monthlyMetrics: 'Monthly Key Metrics',
      last30Days: 'Last 30 Days',
      monthlyPageViews: 'Monthly Page Views',
      monthlyUsers: 'Monthly Users',
      monthlySessions: 'Monthly Sessions',
      bounceRate: 'Bounce Rate',
      monthOverMonth: 'vs Previous Month',
      avgSessionTime: 'Average Session Duration',
      userEngagement: 'User Engagement',
      monthlyClicks: 'Monthly Clicks',
      searchClicks: 'Search Clicks',
      monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      year: '',
      month: '',
      trendSinceJuly: 'Trend Since July 2024 (Monthly)',
      monthlyTrendDesc: 'View monthly page view trends.',
      registeredHotels: 'Registered Hotel Facilities',
      totalHotels: 'Total Hotels',
      hotelChains: 'Hotel Chains',
      hotelBrands: 'Hotel Brands',
      premiumHotels: 'Premium Hotels Worldwide',
      globalChains: 'Global Hotel Chains',
      premiumBrands: 'Premium Brands',
      hotelImages: 'Hotel Images',
      hotelArticles: 'Hotel Articles',
      highQualityPhotos: 'High Quality Hotel Photos',
      detailedContent: 'Detailed Hotel Introduction Content',
      recommendationPages: 'Recommendation Pages',
      themeRecommendations: 'Theme-based Recommendation Pages',
      contentAndFacilities: 'Content & Facility Information',
      userStats: 'User Statistics',
      newUsers: 'New Users',
      returningUsers: 'Returning Users',
      trafficSources: 'Traffic Sources',
      searchEngine: 'Search Engine',
      directVisit: 'Direct Visit',
      referralSite: 'Referral Site',
      socialMedia: 'Social Media',
      paidAds: 'Paid Ads',
      devices: 'Device Access',
      desktop: 'Desktop',
      mobile: 'Mobile',
      tablet: 'Tablet',
      topCountries: 'Top Countries',
      platformCompetitiveness: 'Tourvis Select Platform Competitiveness',
      no1Platform: 'South Korea\'s No.1 Premium Hotel Platform',
      targetCustomers: 'Target Customers',
      marketingEffect: 'Marketing Effect',
      brandStrengthening: 'Brand Strengthening',
      partnerCompetitiveness: 'Competitiveness as a Premium Hotel Partner of Tourvis Select',
      mainProposals: 'Main Proposals:',
      gaIntegration: 'Google Analytics Integration',
      ga4Data: 'GA4 Real Data',
      searchConsoleData: 'Search Console Real Data',
      no1PlatformDesc: 'South Korea\'s No.1 premium hotel platform with strong partnerships with global brands',
      targetCustomersDesc: 'Direct exposure to customers who prefer premium travel, enhancing brand awareness and increasing booking conversion rates',
      marketingEffectDesc: 'Targeted marketing through theme-based recommendation pages to expand customer reach and bookings',
      brandStrengtheningDesc: 'Enhanced brand image and premium positioning through high-quality content and images',
      platformIntro: 'Tourvis Select is South Korea\'s No.1 premium hotel platform, featuring {totalHotels} hotels including {brandCount} carefully selected top-tier hotel brands.',
      platformBenefits: 'Through this platform, hotel facilities can effectively reach target customers through high-quality content and diverse marketing channels, and can expect hotel booking conversions through consultations by hotel concierge experts.',
      proposal1: 'Improve booking conversion rates by introducing hotel information that reflects customer booking intentions and hotel characteristics',
      proposal2: 'Differentiated content marketing through accurate interpretation of premium hotel themes',
      proposal3: 'Brand differentiation through premium benefits',
      proposal4: 'Professional booking consultation services by South Korea\'s top premium hotel concierge experts',
      brandTrafficTitle: 'Brand Hotel Registration Count & Traffic Metrics',
      totalHotelsCount: 'Total Hotels',
      registeredHotelsLabel: 'Registered Hotels',
      pageViews: 'Page Views',
      users: 'Users',
      percentage: 'Percentage',
      articles: 'Articles',
      hotelContent: 'Hotel Content',
      variousHotelInfo: 'Provide various types of hotel information',
      hotelsDetailedInfo: ' hotels with detailed information',
      hotelArticlesBlogs: ' hotel articles and blogs',
      bilingualSupport: 'Korean/English bilingual support',
      detailedLocationFacilities: 'Detailed hotel location, facilities, and room information',
      hotelFacilitiesBenefits: 'Hotel Facilities & Benefits',
      premiumBenefitsInfo: 'Premium hotel benefit information',
      benefitCategories: ' benefit categories',
      hotelsWithBenefits: ' hotels with benefits',
      variousBenefits: 'Various benefits such as breakfast, upgrades, late checkout',
      vipServices: 'VIP services and special promotion information',
      chartDesc: '(Each bar represents the actual page views for that month. Not cumulative.)',
      seoRanking: 'Domestic Search SEO Ranking Metrics',
      totalKeywords: 'Total Keywords',
      top10Keywords: 'Top 10 Keywords',
      top20Keywords: 'Top 20 Keywords',
      top50Keywords: 'Top 50 Keywords',
      avgSearchRank: 'Average Search Rank',
      avgCTR: 'Average Click-Through Rate (CTR)',
      keywordDistribution: 'Keyword Distribution by Rank',
      top10Rank: 'Top 10',
      top20Rank: 'Top 20',
      top50Rank: 'Top 50',
      southKorea: 'South Korea',
      usa: 'USA',
      japan: 'Japan',
      china: 'China',
      other: 'Other',
      people: ' people',
      imagesMedia: 'Images & Media',
      highQualityImages: 'Provide high-quality hotel images',
      hotelImagesCount: ' hotel images',
      variousImages: 'Various images including rooms, facilities, exterior',
      highResPhotos: 'Convey hotel experience with high-resolution photos',
      imageGallery: 'Image gallery and slider provided',
      representativeImages: 'Manage representative images for each hotel',
      regionLocation: 'Region & Location Information',
      accurateRegionInfo: 'Provide accurate regional information',
      regionMapping: ' region mappings',
      cityCountryClassification: 'Hotel classification by city and country',
      mapBasedLocation: 'Map-based location information',
      nearbyAttractions: 'Nearby attractions and transportation information',
      regionalRecommendations: 'Regional hotel recommendations',
      countryKoToEn: {
        '대한민국': 'South Korea',
        '미국': 'USA',
        '일본': 'Japan',
        '중국': 'China',
        '기타': 'Other',
      },
    }
  }

  const formatCompactNumber = (value: number) => {
    try {
      if (language === 'en') {
        return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
      }
      return new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(value)
    } catch {
      return value.toLocaleString()
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 통계 데이터와 분석 데이터, 브랜드별 트래픽 데이터를 병렬로 가져오기
        const [statsResponse, analyticsResponse, brandTrafficResponse] = await Promise.all([
          fetch('/api/facility-proposal/stats', { cache: 'no-store' }),
          fetch('/api/facility-proposal/analytics', { cache: 'no-store' }),
          fetch('/api/facility-proposal/brand-traffic', { cache: 'no-store' })
        ])

        if (!statsResponse.ok) {
          const errorText = await statsResponse.text()
          setError(`통계 데이터를 불러올 수 없습니다. (${statsResponse.status}): ${errorText}`)
          return
        }

        const statsData = await statsResponse.json().catch(() => {
          setError('서버 응답을 파싱할 수 없습니다.')
          return null
        })

        if (!statsData) return
        
        if (statsData.success) {
          setStats(statsData.data)
        } else {
          setError(statsData.error || '데이터를 불러올 수 없습니다.')
        }

        // 분석 데이터 처리 (실패해도 계속 진행)
        if (analyticsResponse.ok) {
          const analyticsData = await analyticsResponse.json().catch(() => null)
          if (analyticsData?.success) {
            setAnalytics(analyticsData.data)
          }
        }

        // 브랜드별 트래픽 데이터 처리 (실패해도 계속 진행)
        if (brandTrafficResponse.ok) {
          const brandTrafficData = await brandTrafficResponse.json().catch((err) => {
            console.error('브랜드 트래픽 데이터 파싱 오류:', err)
            return null
          })
          if (brandTrafficData?.success) {
            console.log('브랜드 트래픽 데이터 (원본):', brandTrafficData.data)
            // 원본 데이터 저장
            setBrandTrafficRaw(brandTrafficData.data)
            // 메타 데이터 저장
            if (brandTrafficData.meta) {
              setBrandTrafficMeta(brandTrafficData.meta)
            }
          } else {
            console.warn('브랜드 트래픽 데이터 실패:', brandTrafficData?.error)
          }
        } else {
          const errorText = await brandTrafficResponse.text().catch(() => '알 수 없는 오류')
          console.error('브랜드 트래픽 API 오류:', brandTrafficResponse.status, errorText)
        }
      } catch (err) {
        setError('네트워크 오류가 발생했습니다.')
        console.error('Data fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Analytics 데이터와 브랜드 트래픽 데이터가 모두 있을 때 정규화
  useEffect(() => {
    if (analytics && brandTrafficRaw && brandTrafficRaw.length > 0) {
      const targetTotalViews = analytics.hotelPages?.totalViews || 0
      const targetTotalUsers = analytics.users?.last30Days || 0
      
      if (targetTotalViews > 0) {
        // 현재 브랜드별 합계 계산
        const currentTotalViews = brandTrafficRaw.reduce((sum, b) => sum + b.total_page_views, 0)
        const currentTotalUsers = brandTrafficRaw.reduce((sum, b) => sum + b.total_users, 0)
        
        // 정규화 팩터 계산
        const viewsFactor = currentTotalViews > 0 ? targetTotalViews / currentTotalViews : 1
        const usersFactor = currentTotalUsers > 0 ? targetTotalUsers / currentTotalUsers : 1
        
        // 정규화된 데이터 생성
        const normalizedData = brandTrafficRaw.map((brand) => {
          const normalizedViews = Math.round(brand.total_page_views * viewsFactor)
          const normalizedUsers = Math.round(brand.total_users * usersFactor)
          
          return {
            ...brand,
            total_page_views: normalizedViews,
            total_users: normalizedUsers,
          }
        })
        
        // 비율 재계산
        const finalTotalViews = normalizedData.reduce((sum, b) => sum + b.total_page_views, 0)
        normalizedData.forEach((brand) => {
          brand.percentage = finalTotalViews > 0 
            ? Number(((brand.total_page_views / finalTotalViews) * 100).toFixed(1))
            : 0
        })
        
        console.log('브랜드 트래픽 데이터 정규화:', {
          targetTotalViews,
          finalTotalViews,
          viewsFactor,
          usersFactor
        })
        
        setBrandTraffic(normalizedData)
      } else {
        // Analytics 데이터가 없으면 원본 데이터 사용
        setBrandTraffic(brandTrafficRaw)
      }
    } else if (brandTrafficRaw && brandTrafficRaw.length > 0 && !analytics) {
      // Analytics 데이터가 아직 없으면 원본 데이터 사용
      setBrandTraffic(brandTrafficRaw)
    }
  }, [analytics, brandTrafficRaw])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <PresentationChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              투어비스 셀렉트 소개
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              투어비스 셀렉트 사이트 현황 및 제안 내용
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-lg border bg-white p-6 shadow-sm animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 ml-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <PresentationChart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              투어비스 셀렉트 소개
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              투어비스 셀렉트 사이트 현황 및 제안 내용
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
            <span>{error || '데이터를 불러올 수 없습니다.'}</span>
          </div>
        </div>
      </div>
    )
  }

  // CSS 색상을 RGB로 변환하는 헬퍼 함수
  const convertColorToRGB = (color: string): string => {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') {
      return '#ffffff'
    }
    // 이미 RGB 형식이면 그대로 반환
    if (color.startsWith('rgb') || color.startsWith('#')) {
      return color
    }
    // oklch나 lab 함수는 기본 색상으로 변환
    if (color.includes('oklch') || color.includes('lab')) {
      return '#000000' // 기본 텍스트 색상
    }
    return color
  }

  const getGradientFallbackColor = (classString: string): string | null => {
    // 이 페이지에서 실제로 쓰는 그라데이션/막대 색상만 최소 매핑
    const map: Array<[needle: string, hex: string]> = [
      ['from-green-500', '#22c55e'],
      ['from-blue-500', '#3b82f6'],
      ['from-purple-500', '#a855f7'],
      ['from-pink-600', '#db2777'],
      ['from-orange-600', '#ea580c'],
      ['from-green-50', '#f0fdf4'],
      ['from-emerald-50', '#ecfdf5'],
      ['from-blue-50', '#eff6ff'],
      ['from-indigo-50', '#eef2ff'],
    ]

    for (const [needle, hex] of map) {
      if (classString.includes(needle)) return hex
    }

    return null
  }

  // 요소의 모든 스타일을 RGB로 변환하고 CSS 클래스를 제거하는 함수
  const convertStylesToRGB = (element: HTMLElement) => {
    const allElements = element.querySelectorAll('*')
    const elementsArray = Array.from(allElements) as HTMLElement[]
    elementsArray.push(element)

    elementsArray.forEach((elem) => {
      try {
        // NOTE: 클래스 제거는 "맨 마지막"에 해야 함
        // (이 페이지의 그래프/막대는 Tailwind 클래스 기반이라 먼저 제거하면 텍스트만 남음)
        const classString = typeof elem.className === 'string' ? elem.className : ''
        const computedStyle = window.getComputedStyle(elem)
        
        // 배경색 변환
        const bgColor = computedStyle.backgroundColor
        const bgImage = computedStyle.backgroundImage
        const hasGradient = bgImage && bgImage !== 'none' && bgImage.toLowerCase().includes('gradient')
        const hasUnsupportedColorInBgImage = bgImage && (bgImage.toLowerCase().includes('oklch') || bgImage.toLowerCase().includes('lab'))

        if (hasGradient || hasUnsupportedColorInBgImage) {
          // html2canvas가 oklch/lab 포함 그라데이션을 못 그려서 "그래프가 사라지는" 문제가 발생
          // => 단색으로 강등해서 반드시 보이게 함
          const fallback = getGradientFallbackColor(classString) || '#ffffff'
          elem.style.backgroundImage = 'none'
          elem.style.backgroundColor = fallback
        } else if (bgColor) {
          if (bgColor.includes('oklch') || bgColor.includes('lab') || bgColor === 'rgba(0, 0, 0, 0)') {
            elem.style.backgroundColor = '#ffffff'
          } else if (bgColor.startsWith('rgb') || bgColor.startsWith('#')) {
            elem.style.backgroundColor = bgColor
          } else {
            elem.style.backgroundColor = '#ffffff'
          }
        }
        
        // 텍스트 색상 변환
        const textColor = computedStyle.color
        if (textColor) {
          if (textColor.includes('oklch') || textColor.includes('lab')) {
            // 배경색에 따라 텍스트 색상 결정
            const isDarkBg = bgColor && (
              bgColor.includes('0.145') || 
              bgColor.includes('0.205') ||
              bgColor.includes('rgb(0') ||
              bgColor.includes('#000')
            )
            elem.style.color = isDarkBg ? '#ffffff' : '#000000'
          } else if (textColor.startsWith('rgb') || textColor.startsWith('#')) {
            elem.style.color = textColor
          } else {
            elem.style.color = '#000000'
          }
        }
        
        // 테두리 색상 변환
        const borderColor = computedStyle.borderColor
        if (borderColor) {
          if (borderColor.includes('oklch') || borderColor.includes('lab')) {
            elem.style.borderColor = '#e5e7eb' // gray-200
          } else if (borderColor.startsWith('rgb') || borderColor.startsWith('#')) {
            elem.style.borderColor = borderColor
          }
        }
        
        // 테두리 스타일 유지
        if (computedStyle.borderWidth && computedStyle.borderWidth !== '0px') {
          elem.style.borderWidth = computedStyle.borderWidth
          elem.style.borderStyle = computedStyle.borderStyle || 'solid'
        }
        
        // 패딩과 마진 유지
        if (computedStyle.padding && computedStyle.padding !== '0px') {
          elem.style.padding = computedStyle.padding
        }
        if (computedStyle.margin && computedStyle.margin !== '0px') {
          elem.style.margin = computedStyle.margin
        }
        
        // 폰트 스타일 유지
        elem.style.fontSize = computedStyle.fontSize
        elem.style.fontWeight = computedStyle.fontWeight
        elem.style.fontFamily = computedStyle.fontFamily
        elem.style.lineHeight = computedStyle.lineHeight
        
        // 레이아웃 속성 유지
        elem.style.display = computedStyle.display
        elem.style.flexDirection = computedStyle.flexDirection
        elem.style.justifyContent = computedStyle.justifyContent
        elem.style.alignItems = computedStyle.alignItems
        elem.style.gap = computedStyle.gap
        elem.style.width = computedStyle.width
        elem.style.height = computedStyle.height

        // 마지막에 클래스 제거하여 CSS 파싱 오류 방지
        if (classString) {
          elem.removeAttribute('class')
        }
        
      } catch (e) {
        // 스타일 변환 중 오류 발생 시 무시하고 계속 진행
        console.warn('스타일 변환 오류:', e)
      }
    })
  }

  const waitForCaptureReady = async (root: HTMLElement) => {
    // 폰트 로딩 대기 (레이아웃/줄바꿈 안정화)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fonts = (document as any).fonts as FontFaceSet | undefined
      if (fonts?.ready) {
        await Promise.race([
          fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
      }
    } catch {
      // ignore
    }

    // 이미지 로딩 대기
    const images = Array.from(root.querySelectorAll('img')) as HTMLImageElement[]
    await Promise.race([
      Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve()
          return new Promise<void>((resolve) => {
            const done = () => resolve()
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
          })
        })
      ),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])

    // 한 프레임 더 대기(차트/레이아웃 업데이트 반영)
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  }

  const createCaptureClone = (source: HTMLElement, overlayText: string) => {
    const overlay = document.createElement('div')
    overlay.id = 'capture-overlay'
    overlay.style.position = 'fixed'
    overlay.style.left = '0'
    overlay.style.top = '0'
    overlay.style.right = '0'
    overlay.style.bottom = '0'
    overlay.style.background = 'rgba(255,255,255,0.92)'
    overlay.style.zIndex = '2147483647'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.fontSize = '16px'
    overlay.style.fontWeight = '600'
    overlay.style.color = '#111827'
    overlay.textContent = overlayText
    document.body.appendChild(overlay)

    // 캡처 전용 래퍼: 좌표 원점을 (0,0)으로 고정해 잘림/빈여백 문제를 근본 해결
    const wrapper = document.createElement('div')
    wrapper.id = 'capture-wrapper'
    wrapper.style.position = 'fixed'
    wrapper.style.left = '0'
    wrapper.style.top = '0'
    wrapper.style.zIndex = '2147483646'
    wrapper.style.background = '#ffffff'
    wrapper.style.pointerEvents = 'none'
    wrapper.style.overflow = 'visible'
    wrapper.style.width = `${Math.ceil(source.getBoundingClientRect().width)}px`

    const clone = source.cloneNode(true) as HTMLElement
    clone.id = 'facility-proposal-content-capture-clone'
    clone.style.margin = '0'
    clone.style.width = '100%'

    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    return {
      overlay,
      wrapper,
      clone,
      cleanup: () => {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper)
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      },
    }
  }

  // PDF 다운로드 함수
  const handleDownloadPDF = async () => {
    const element = document.getElementById('facility-proposal-content')
    if (!element) {
      alert('콘텐츠를 찾을 수 없습니다.')
      return
    }

    let cleanup: (() => void) | null = null

    try {
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      const capture = createCaptureClone(element, 'PDF 생성 중...')
      cleanup = capture.cleanup

      await waitForCaptureReady(capture.clone)

      // 본문을 "그대로" 캡처: foreignObjectRendering을 우선 사용해 Tailwind v4(oklch/lab) 호환성 확보
      const canvas = await html2canvas(capture.wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('capture-overlay')
          if (el) (el as HTMLElement).style.display = 'none'
        },
      })

      if (canvas.width === 0 || canvas.height === 0) throw new Error('캔버스가 비어있습니다.')

      // Canvas를 이미지로 변환
      const imgData = canvas.toDataURL('image/png')

      // A4 멀티 페이지 생성 (긴 페이지를 1장에 축소하지 않도록)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // PDF 다운로드
      pdf.save('투어비스_셀렉트_소개.pdf')

      // 스크롤 복원
      window.scrollTo(scrollX, scrollY)
    } catch (error) {
      console.error('PDF 다운로드 오류:', error)
      console.error('오류 상세:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      alert(`PDF 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      cleanup?.()
    }
  }

  // PNG(스크린샷) 다운로드 함수: 본문을 그대로 캡처하여 이미지로 저장
  const handleDownloadImage = async () => {
    const element = document.getElementById('facility-proposal-content')
    if (!element) {
      alert('콘텐츠를 찾을 수 없습니다.')
      return
    }

    let cleanup: (() => void) | null = null

    try {
      const capture = createCaptureClone(element, '이미지 생성 중...')
      cleanup = capture.cleanup

      await waitForCaptureReady(capture.clone)

      const canvas = await html2canvas(capture.wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('capture-overlay')
          if (el) (el as HTMLElement).style.display = 'none'
        },
      })

      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('캔버스가 비어있습니다.')
      }

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = '투어비스_셀렉트_소개.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('이미지 다운로드 오류:', error)
      alert(`이미지 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      cleanup?.()
    }
  }

  // 마크다운 다운로드 함수
  const handleDownloadWord = async () => {
    try {
      let markdown = '# 투어비스 셀렉트 소개\n\n'
      markdown += '투어비스 셀렉트 사이트 현황 및 제안 내용\n\n'
      markdown += '---\n\n'

      // 등록 호텔 시설 섹션
      if (stats) {
        markdown += '## 등록 호텔 시설\n\n'
        markdown += `- **등록 호텔 수**: ${stats.totalHotels.toLocaleString()}개 - 전 세계 프리미엄 호텔\n`
        markdown += `- **호텔 체인**: ${stats.chainCount.toLocaleString()}개 - 글로벌 호텔 체인\n`
        markdown += `- **호텔 브랜드**: ${stats.brandCount.toLocaleString()}개 - 프리미엄 브랜드\n`
        markdown += `- **호텔 이미지**: ${stats.imageCount.toLocaleString()}개 - 고품질 호텔 사진\n`
        markdown += `- **호텔 아티클**: ${stats.articleCount.toLocaleString()}개 - 상세 호텔 소개 콘텐츠\n`
        markdown += `- **추천 페이지**: ${stats.recommendationPageCount.toLocaleString()}개 - 테마별 추천 페이지\n\n`
        markdown += '---\n\n'
      }

      // 콘텐츠 및 시설 정보 섹션
      if (stats) {
        markdown += '## 콘텐츠 및 시설 정보\n\n'
        
        markdown += '### 호텔 콘텐츠\n\n'
        markdown += '다양한 형태의 호텔 정보 제공\n\n'
        markdown += `- ${stats.totalHotels.toLocaleString()}개 호텔 상세 정보 제공\n`
        markdown += `- ${stats.articleCount.toLocaleString()}개 호텔 아티클 및 블로그\n`
        markdown += `- ${stats.recommendationPageCount.toLocaleString()}개 테마별 추천 페이지\n`
        markdown += '- 한국어/영어 이중 언어 지원\n'
        markdown += '- 호텔 위치, 시설, 객실 정보 상세 제공\n\n'
        
        markdown += '### 호텔 시설 및 혜택\n\n'
        markdown += '프리미엄 호텔 혜택 정보\n\n'
        markdown += `- ${stats.benefitCount.toLocaleString()}개 혜택 카테고리\n`
        markdown += `- ${stats.hotelsWithBenefits.toLocaleString()}개 호텔에 혜택 연결\n`
        markdown += '- 조식, 업그레이드, 레이트 체크아웃 등 다양한 혜택\n'
        markdown += '- VIP 서비스 및 특별 프로모션 정보\n'
        markdown += '- 호텔별 맞춤 혜택 제공\n\n'
        
        markdown += '### 이미지 및 미디어\n\n'
        markdown += '고품질 호텔 이미지 제공\n\n'
        markdown += `- ${stats.imageCount.toLocaleString()}개 호텔 이미지\n`
        markdown += '- 객실, 시설, 외관 등 다양한 이미지\n'
        markdown += '- 고해상도 사진으로 호텔 경험 전달\n'
        markdown += '- 이미지 갤러리 및 슬라이더 제공\n'
        markdown += '- 호텔별 대표 이미지 관리\n\n'
        
        markdown += '### 지역 및 위치 정보\n\n'
        markdown += '정확한 지역 정보 제공\n\n'
        markdown += `- ${stats.regionCount.toLocaleString()}개 지역 매핑\n`
        markdown += '- 도시별, 국가별 호텔 분류\n'
        markdown += '- 지도 기반 위치 정보\n'
        markdown += '- 주변 관광지 및 교통 정보\n'
        markdown += '- 지역별 추천 호텔 제공\n\n'
        markdown += '---\n\n'
      }

      // Google Analytics 데이터가 있으면 추가
      if (analytics) {
        markdown += '## 유입 트래픽 및 조회 통계\n\n'
        markdown += '### 최근 1년간 급성장\n\n'
        markdown += '**최근 1년간 유입 트래픽 및 예약 전환이 10배 이상 상승**하여 플랫폼의 성장세와 고객 관심도가 지속적으로 증가하고 있습니다.\n\n'
        
        markdown += '### 월별 트래픽 추이 (2024년 7월 오픈 이후 ~ 현재)\n\n'
        markdown += 'Google Analytics GA4 데이터 기반 페이지뷰 및 예약 전환 추이\n\n'
        
        if (analytics.monthlyTrend && analytics.monthlyTrend.length > 0) {
          const firstMonth = analytics.monthlyTrend[0]
          const lastMonth = analytics.monthlyTrend[analytics.monthlyTrend.length - 1]
          
          markdown += '#### 페이지뷰\n\n'
          markdown += `${firstMonth.pageViews.toLocaleString()} → ${lastMonth.pageViews.toLocaleString()}\n\n`
          
          const conversionGrowth = firstMonth.conversions > 0
            ? (lastMonth.conversions / firstMonth.conversions).toFixed(1)
            : '0'
          
          markdown += '#### 예약 전환\n\n'
          markdown += `${firstMonth.conversions.toLocaleString()}건 → ${lastMonth.conversions.toLocaleString()}건 (**${conversionGrowth}배 증가**)\n\n`
          
          const userGrowth = firstMonth.users > 0
            ? (lastMonth.users / firstMonth.users).toFixed(1)
            : '0'
          
          markdown += '#### 월별 사용자수\n\n'
          markdown += `${firstMonth.users.toLocaleString()}명 → ${lastMonth.users.toLocaleString()}명 (**${userGrowth}배 증가**)\n\n`
        }
        
        markdown += '### 주요 지표 (최근 30일 기준)\n\n'
        markdown += `- **월간 페이지뷰**: ${analytics.pageViews.last30Days.toLocaleString()} (전월 대비 ${analytics.pageViews.growth > 0 ? '+' : ''}${analytics.pageViews.growth}%)\n`
        markdown += `- **월간 사용자**: ${analytics.users.last30Days.toLocaleString()}명\n`
        markdown += `- **월간 세션**: ${analytics.sessions.last30Days.toLocaleString()}\n`
        markdown += `- **평균 세션 시간**: ${Math.floor(analytics.sessions.avgSessionDuration / 60)}분 ${analytics.sessions.avgSessionDuration % 60}초\n\n`
        
        markdown += '#### 사용자 통계\n\n'
        markdown += `- 신규 사용자: ${analytics.users.newUsers.toLocaleString()}명\n`
        markdown += `- 재방문 사용자: ${analytics.users.returningUsers.toLocaleString()}명\n\n`
        
        markdown += '#### 트래픽 소스\n\n'
        markdown += `- 검색 엔진: ${analytics.trafficSources.direct}%\n`
        markdown += `- 직접 방문: ${analytics.trafficSources.organic}%\n`
        markdown += `- 레퍼럴 사이트: ${analytics.trafficSources.referral}%\n`
        markdown += `- 소셜 미디어: ${analytics.trafficSources.social}%\n`
        markdown += `- 유료 광고: ${analytics.trafficSources.paid}%\n\n`
        
        markdown += '#### 디바이스별 접속\n\n'
        markdown += `- 데스크톱: ${analytics.devices.desktop}%\n`
        markdown += `- 모바일: ${analytics.devices.mobile}%\n`
        markdown += `- 태블릿: ${analytics.devices.tablet}%\n\n`
        
        markdown += '#### 주요 접속 국가\n\n'
        analytics.topCountries.forEach((country) => {
          markdown += `- ${country.country}: ${country.users.toLocaleString()}명 (${country.percentage}%)\n`
        })
        markdown += '\n'
        
        markdown += '#### 호텔 상세 페이지 통계\n\n'
        markdown += `- 총 페이지뷰: ${analytics.hotelPages.totalViews.toLocaleString()}회\n`
        markdown += `- 평균 체류 시간: ${Math.floor(analytics.hotelPages.avgTimeOnPage / 60)}분 ${analytics.hotelPages.avgTimeOnPage % 60}초\n`
        markdown += `- 조회된 호텔 수: ${analytics.hotelPages.hotelsViewed.toLocaleString()}개\n\n`
        
        // SEO 순위 지표
        if (analytics.seoRanking) {
          markdown += '### 국내 검색 SEO 순위 지표 (최근 30일 기준)\n\n'
          markdown += `- **총 키워드 수**: ${analytics.seoRanking.totalKeywords.toLocaleString()}개\n`
          markdown += `- **상위 10위 키워드**: ${analytics.seoRanking.top10Keywords}개\n`
          markdown += `- **상위 20위 키워드**: ${analytics.seoRanking.top20Keywords}개\n`
          markdown += `- **상위 50위 키워드**: ${analytics.seoRanking.top50Keywords}개\n`
          markdown += `- **평균 검색 순위**: ${analytics.seoRanking.avgPosition.toFixed(1)}위\n`
          markdown += `- **평균 클릭률 (CTR)**: ${analytics.seoRanking.avgCTR.toFixed(2)}%\n`
          markdown += `- **총 검색 노출 수**: ${analytics.seoRanking.totalImpressions.toLocaleString()}\n`
          markdown += `- **총 클릭 수**: ${analytics.seoRanking.totalClicks.toLocaleString()}\n\n`
          
          markdown += '#### 상위 키워드\n\n'
          analytics.seoRanking.topKeywords.slice(0, 15).forEach((keyword, index) => {
            markdown += `${index + 1}. **${keyword.keyword}** - 순위: ${keyword.position}위, 노출: ${keyword.impressions.toLocaleString()}, 클릭: ${keyword.clicks.toLocaleString()}, CTR: ${keyword.ctr.toFixed(2)}%\n`
          })
          markdown += '\n'
        }
        
        markdown += '---\n\n'
      }

      // 브랜드별 호텔 등록 보유 개수 통계
      if (brandTraffic && brandTraffic.length > 0 && stats) {
        const sortedBrands = [...brandTraffic].sort((a, b) => b.hotel_count - a.hotel_count)
        const topBrands = sortedBrands.slice(0, 10)
        
        markdown += '## 브랜드별 호텔 등록 보유 개수 및 트래픽 지표 (최근 30일 기준)\n\n'
        markdown += `- **총 호텔 수**: ${stats.totalHotels.toLocaleString()}개\n`
        markdown += `- **총 페이지뷰 (최근 30일)**: ${analytics?.hotelPages?.totalViews ? analytics.hotelPages.totalViews.toLocaleString() : brandTraffic.reduce((sum, b) => sum + b.total_page_views, 0).toLocaleString()}\n\n`
        
        markdown += '### 주요 브랜드별 통계\n\n'
        topBrands.forEach((brand) => {
          markdown += `- **${brand.brand_name_en || brand.brand_name_kr || '알 수 없음'}**: 호텔 ${brand.hotel_count}개, 페이지뷰 ${brand.total_page_views.toLocaleString()}, 사용자 ${brand.total_users.toLocaleString()}명, 아티클 ${brand.article_count || 0}개\n`
        })
        markdown += '\n---\n\n'
      }

      // 주요 기능 및 장점 섹션
      markdown += '## 주요 기능 및 장점\n\n'
      markdown += '### 타겟 고객\n\n'
      markdown += '프리미엄 여행을 선호하는 고객층에게 직접 노출되어 브랜드 인지도 향상 및 예약 전환율 증가\n\n'
      markdown += '### 마케팅 효과\n\n'
      markdown += '테마별 추천 페이지를 통한 타겟팅 마케팅으로 고객 유입 및 예약 확대\n\n'
      markdown += '### 브랜드 강화\n\n'
      markdown += '고품질 콘텐츠와 이미지를 통한 브랜드 이미지 강화 및 프리미엄 포지셔닝\n\n'
      markdown += '---\n\n'

      // 제안 요약 섹션
      markdown += '## 투어비스 셀렉트의 프리미엄 호텔 파트너로서의 경쟁력\n\n'
      if (stats) {
        markdown += `투어비스 셀렉트는 한국 최고의 프리미엄 호텔 전문 플랫폼으로, 엄선된 초상위 호텔 브랜드 ${stats.brandCount.toLocaleString()}개를 포함하여 ${stats.totalHotels.toLocaleString()}개 이상의 호텔을 보유하고 있습니다.\n\n`
      } else {
        markdown += '투어비스 셀렉트는 한국 최고의 프리미엄 호텔 전문 플랫폼입니다.\n\n'
      }
      
      markdown += '본 플랫폼을 통해 호텔 시설사는 고품질 콘텐츠와 다양한 마케팅 채널을 통해 타겟 고객에게 효과적으로 노출될 수 있으며, 호텔 컨시어지 전문가에 의한 상담을 통한 호텔 예약 전환을 기대할 수 있습니다.\n\n'
      
      markdown += '### 주요 제안 사항\n\n'
      markdown += '- 호텔 정보를 고객의 예약 의도와 호텔 특징을 반영한 소개로 예약 전환율 향상\n'
      markdown += '- 프리미엄 호텔의 테마를 정확히 해석한 소개로 차별화된 콘텐츠 마케팅\n'
      markdown += '- 프리미엄 혜택 제공을 통한 브랜드 차별화\n'
      markdown += '- 한국 최고 프리미엄 호텔 컨시어지 전문가의 전문 예약 상담 서비스 제공\n'

      // 마크다운 파일 다운로드
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = '투어비스_셀렉트_소개.md'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('마크다운 다운로드 오류:', error)
      alert('마크다운 다운로드 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-blue-600 p-2">
          <PresentationChart className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {t[language].title}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t[language].subtitle}
          </p>
          </div>
        </div>
        {/* 다운로드 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadImage}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <ImageIcon className="h-4 w-4" />
            {t[language].pngDownload}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            {t[language].pdfDownload}
          </button>
          <button
            onClick={handleDownloadWord}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <FileDown className="h-4 w-4" />
            {t[language].markdownDownload}
          </button>
          <button
            onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Languages className="h-4 w-4" />
            {language === 'ko' ? 'English' : '한국어'}
          </button>
        </div>
      </div>

      {/* 다운로드용 콘텐츠 영역 */}
      <div id="facility-proposal-content" className="space-y-8">

      {/* 최근 1년간 급성장 */}
      {analytics && (
        <div className="rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="rounded-lg bg-green-100 p-3 text-green-600 shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t[language].rapidGrowth}
              </h3>
              <p className="text-base text-gray-700 leading-relaxed">
                {language === 'ko' ? (
                  <>최근 1년간 <strong className="text-green-700">유입 트래픽 및 예약 전환이 10배 이상 상승</strong>하여 플랫폼의 성장세와 고객 관심도가 지속적으로 증가하고 있습니다.</>
                ) : (
                  <>{t[language].rapidGrowthDesc}</>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 유입 트래픽 및 조회 통계 타이틀 */}
      {analytics && (
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t[language].trafficAndStats}</h2>
          <span className="text-xs text-cyan-800 bg-red-300 px-2 py-1 rounded">{t[language].gaIntegration}</span>
        </div>
      )}

      {/* 월간 핵심 지표 (GA 기반) */}
      {analytics && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{t[language].monthlyMetrics}</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t[language].last30Days}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t[language].monthlyPageViews}
              value={analytics.pageViews.last30Days.toLocaleString()}
              icon={<Eye className="h-6 w-6" />}
              description="GA4"
              variant="primary"
              trend={{
                value: analytics.pageViews.growth,
                label: t[language].monthOverMonth
              }}
            />
            <StatCard
              title={t[language].monthlyUsers}
              value={analytics.users.last30Days.toLocaleString()}
              icon={<Users className="h-6 w-6" />}
              description="GA4"
              variant="success"
            />
            <StatCard
              title={t[language].avgSessionTime}
              value={language === 'ko' 
                ? `${Math.floor(analytics.sessions.avgSessionDuration / 60)}분 ${analytics.sessions.avgSessionDuration % 60}초`
                : `${Math.floor(analytics.sessions.avgSessionDuration / 60)}m ${analytics.sessions.avgSessionDuration % 60}s`
              }
              icon={<Clock className="h-6 w-6" />}
              description={t[language].userEngagement}
              variant="default"
            />
            <StatCard
              title={t[language].monthlyClicks}
              value={(analytics.seoRanking?.totalClicks ?? 0).toLocaleString()}
              icon={<MousePointerClick className="h-6 w-6" />}
              description={t[language].searchClicks}
              variant="default"
            />
          </div>

          {/* 최근 1년 추이 차트 */}
          {(() => {
            const fallback =
              analytics.monthlyKpiTrend && analytics.monthlyKpiTrend.length > 0
                ? analytics.monthlyKpiTrend
                : analytics.monthlyTrend.slice(-12).map((m) => {
                    const totalImpressions = analytics.seoRanking?.totalImpressions ?? 0
                    const totalClicks = analytics.seoRanking?.totalClicks ?? 0
                    const last12 = analytics.monthlyTrend.slice(-12)
                    const sum = Math.max(1, last12.reduce((acc, x) => acc + Math.max(0, x.pageViews), 0))
                    const ratio = Math.max(0, m.pageViews) / sum
                    return {
                      month: m.month,
                      pageViews: m.pageViews,
                      users: m.users,
                      impressions: Math.round(totalImpressions * ratio),
                      clicks: Math.round(totalClicks * ratio),
                    }
                  })

            if (!fallback || fallback.length === 0) return null

            return (
            <div className="mt-6 rounded-lg border bg-white p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{t[language].trendSinceJuly}</h3>
                <div className="flex items-center gap-2">
                  {analytics.monthlyKpiTrendSource === 'search-console' && (
                    <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">{t[language].searchConsoleData}</span>
                  )}
                  {(!analytics.monthlyKpiTrendSource || analytics.monthlyKpiTrendSource === 'estimated') && 
                   analytics.monthlyTrend && analytics.monthlyTrend.length > 0 && (
                    <span className="text-xs text-cyan-800 bg-red-300 px-2 py-1 rounded">{t[language].ga4Data}</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                {t[language].monthlyTrendDesc}
                <span className="ml-2 text-xs text-gray-500">
                  {t[language].chartDesc}
                </span>
              </p>

              {(() => {
                const trend = fallback.filter((d) => d.month >= '2024-07')
                const months = trend.map((d) => d.month)

                const chart = (
                  title: string,
                  colorClass: string,
                  getValue: (d: { month: string; pageViews: number; users: number; impressions: number; clicks: number }) => number,
                ) => {
                  const maxValue = Math.max(...trend.map(getValue), 1)
                  const containerHeight = 190 // 전체 컨테이너 높이 (170 → 190으로 증가)
                  const labelHeight = 50 // 하단 라벨 공간 (년/월 표시)
                  const chartHeight = containerHeight - labelHeight // 실제 차트 높이 (140px)
                  return (
                    <div className="rounded-lg border bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-sm font-semibold text-gray-900">{title}</span>
                        <span className="text-xs text-gray-600">{months[0]} ~ {months[months.length - 1]}</span>
                      </div>
                      <div className="flex items-end justify-between gap-1.5" style={{ height: `${containerHeight}px` }}>
                        {trend.map((data, index) => {
                          const value = getValue(data)
                          const heightPercent = (value / maxValue) * 100
                          const barHeight = Math.max((heightPercent / 100) * chartHeight, 2)
                          const [year, mm] = data.month.split('-')
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end group relative h-full min-w-0">
                              <div className="flex-1 flex items-end w-full relative" style={{ height: `${chartHeight}px` }}>
                                <div
                                  className={cn("w-full rounded-t shadow-sm transition-all", colorClass)}
                                  style={{ height: `${barHeight}px`, minHeight: '2px' }}
                                  title={`${data.month}: ${value.toLocaleString()}`}
                                >
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none transition-opacity">
                                    {value.toLocaleString()}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                                {/* 막대 상단 값 표시 */}
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-700 font-semibold whitespace-nowrap"
                                  style={{ bottom: `${barHeight + 6}px` }}
                                >
                                  {formatCompactNumber(value)}
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-600 mt-2 font-medium text-center h-10 flex items-start justify-center">
                                {language === 'ko' ? (
                                  <>{year}년<br />{parseInt(mm, 10)}월</>
                                ) : (
                                  <>{t[language].monthNames[parseInt(mm, 10) - 1]} {year}</>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="grid gap-6 md:grid-cols-1">
                    {chart(t[language].monthlyPageViews, 'bg-gradient-to-t from-blue-500 to-blue-400', (d) => d.pageViews)}
                  </div>
                )
              })()}
            </div>
            )
          })()}
        </section>
      )}

      {/* 등록 호텔 시설 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t[language].registeredHotels}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t[language].totalHotels}
            value={stats.totalHotels.toLocaleString()}
            icon={<Building2 className="h-6 w-6" />}
            description={t[language].premiumHotels}
            variant="primary"
          />
          <StatCard
            title={t[language].hotelChains}
            value={stats.chainCount.toLocaleString()}
            icon={<Network className="h-6 w-6" />}
            description={t[language].globalChains}
            variant="default"
          />
          <StatCard
            title={t[language].hotelBrands}
            value={stats.brandCount.toLocaleString()}
            icon={<Star className="h-6 w-6" />}
            description={t[language].premiumBrands}
            variant="default"
          />
          <StatCard
            title={t[language].hotelImages}
            value={stats.imageCount.toLocaleString()}
            icon={<ImageIcon className="h-6 w-6" />}
            description={t[language].highQualityPhotos}
            variant="success"
          />
          <StatCard
            title={t[language].hotelArticles}
            value={stats.articleCount.toLocaleString()}
            icon={<FileText className="h-6 w-6" />}
            description={t[language].detailedContent}
            variant="default"
          />
          <StatCard
            title={t[language].recommendationPages}
            value={stats.recommendationPageCount.toLocaleString()}
            icon={<MapPin className="h-6 w-6" />}
            description={t[language].themeRecommendations}
            variant="default"
          />
        </div>
      </section>

      {/* 콘텐츠 및 시설 정보 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t[language].contentAndFacilities}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <FeatureCard
            title={t[language].hotelContent}
            description={t[language].variousHotelInfo}
            icon={<FileText className="h-6 w-6" />}
            items={[
              `${stats.totalHotels.toLocaleString()}${t[language].hotelsDetailedInfo}`,
              `${stats.articleCount.toLocaleString()}${t[language].hotelArticlesBlogs}`,
              `${stats.recommendationPageCount.toLocaleString()}${t[language].themeRecommendations}`,
              t[language].bilingualSupport,
              t[language].detailedLocationFacilities
            ]}
          />
          <FeatureCard
            title={t[language].hotelFacilitiesBenefits}
            description={t[language].premiumBenefitsInfo}
            icon={<Gift className="h-6 w-6" />}
            items={[
              `${stats.benefitCount.toLocaleString()}${t[language].benefitCategories}`,
              `${stats.hotelsWithBenefits.toLocaleString()}${t[language].hotelsWithBenefits}`,
              t[language].variousBenefits,
              t[language].vipServices,
              language === 'ko' ? '호텔별 맞춤 혜택 제공' : 'Customized benefits for each hotel'
            ]}
          />
          <FeatureCard
            title={t[language].imagesMedia}
            description={t[language].highQualityImages}
            icon={<ImageIcon className="h-6 w-6" />}
            items={[
              `${stats.imageCount.toLocaleString()}${t[language].hotelImagesCount}`,
              t[language].variousImages,
              t[language].highResPhotos,
              t[language].imageGallery,
              t[language].representativeImages
            ]}
          />
          <FeatureCard
            title={t[language].regionLocation}
            description={t[language].accurateRegionInfo}
            icon={<MapPin className="h-6 w-6" />}
            items={[
              `${stats.regionCount.toLocaleString()}${t[language].regionMapping}`,
              t[language].cityCountryClassification,
              t[language].mapBasedLocation,
              t[language].nearbyAttractions,
              t[language].regionalRecommendations
            ]}
          />
        </div>
      </section>

      {/* Google Analytics 트래픽 통계 */}
      {analytics && (
        <section>
          {/* 사용자 및 트래픽 소스 */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t[language].userStats}
                <span className="text-sm font-normal text-gray-500">({t[language].last30Days})</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t[language].newUsers}</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.users.newUsers.toLocaleString()}명
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(analytics.users.newUsers / analytics.users.last30Days) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t[language].returningUsers}</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {analytics.users.returningUsers.toLocaleString()}명
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(analytics.users.returningUsers / analytics.users.last30Days) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                {t[language].trafficSources}
                <span className="text-sm font-normal text-gray-500">({t[language].last30Days})</span>
              </h3>
              <div className="space-y-3">
                {(() => {
                  const sources = [
                    { label: t[language].searchEngine, value: analytics.trafficSources.direct, color: 'bg-blue-600' },
                    { label: t[language].directVisit, value: analytics.trafficSources.organic, color: 'bg-green-600' },
                    { label: t[language].referralSite, value: analytics.trafficSources.referral, color: 'bg-purple-600' },
                    { label: t[language].socialMedia, value: 2, color: 'bg-pink-600' },
                    { label: t[language].paidAds, value: analytics.trafficSources.paid, color: 'bg-orange-600' },
                  ]
                  
                  // 합계 계산 및 조정
                  const sum = sources.reduce((acc, s) => acc + s.value, 0)
                  if (sum !== 100) {
                    const diff = 100 - sum
                    // 가장 큰 값을 가진 항목에 차이를 추가
                    const maxIndex = sources.reduce((maxIdx, curr, idx) => 
                      curr.value > sources[maxIdx].value ? idx : maxIdx, 0
                    )
                    sources[maxIndex].value += diff
                  }
                  
                  // 수치가 높은 순으로 정렬
                  return sources.sort((a, b) => b.value - a.value)
                })().map((source, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{source.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{source.value}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${source.color} h-2 rounded-full`}
                        style={{ width: `${source.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 디바이스 및 지역 통계 */}
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                {t[language].devices}
                <span className="text-sm font-normal text-gray-500">({t[language].last30Days})</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{t[language].desktop}</span>
                      <span className="text-sm font-semibold text-gray-900">{analytics.devices.desktop}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${analytics.devices.desktop}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{t[language].mobile}</span>
                      <span className="text-sm font-semibold text-gray-900">{analytics.devices.mobile}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${analytics.devices.mobile}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Tablet className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{t[language].tablet}</span>
                      <span className="text-sm font-semibold text-gray-900">{analytics.devices.tablet}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${analytics.devices.tablet}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {t[language].topCountries}
                <span className="text-sm font-normal text-gray-500">({t[language].last30Days})</span>
              </h3>
              <div className="space-y-3">
                {analytics.topCountries.map((country, index) => {
                  const countryMap = t[language].countryKoToEn as Record<string, string>
                  const countryName = language === 'en' && countryMap[country.country]
                    ? countryMap[country.country]
                    : country.country
                  return (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">{countryName}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {country.users.toLocaleString()}{t[language].people} ({country.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 국내 검색 SEO 순위 지표 */}
          {analytics.seoRanking && (
            <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {t[language].seoRanking}
                <span className="text-sm font-normal text-gray-500">({t[language].last30Days})</span>
              </h3>
              
              {/* 주요 지표 카드 */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.seoRanking.totalKeywords.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">{t[language].totalKeywords}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {analytics.seoRanking.top10Keywords}
                  </div>
                  <div className="text-sm text-gray-600">{t[language].top10Keywords}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.seoRanking.avgPosition.toFixed(1)}{language === 'ko' ? '위' : ''}
                  </div>
                  <div className="text-sm text-gray-600">{t[language].avgSearchRank}</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.seoRanking.avgCTR.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-600">{t[language].avgCTR}</div>
                </div>
              </div>

              {/* 순위별 키워드 분포 */}
              <div className="bg-white rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{t[language].keywordDistribution}</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-gray-600">{t[language].top10Rank}</span>
                    <span className="text-lg font-bold text-green-600">
                      {analytics.seoRanking.top10Keywords}{language === 'ko' ? '개' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-gray-600">{t[language].top20Rank}</span>
                    <span className="text-lg font-bold text-blue-600">
                      {analytics.seoRanking.top20Keywords}{language === 'ko' ? '개' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm text-gray-600">{t[language].top50Rank}</span>
                    <span className="text-lg font-bold text-purple-600">
                      {analytics.seoRanking.top50Keywords}{language === 'ko' ? '개' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 브랜드별 호텔 등록 보유 개수 통계 (트래픽 지표 포함) */}
          {brandTraffic && brandTraffic.length > 0 && (
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-4 mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  {t[language].brandTrafficTitle}
                  <span className="text-xs font-normal text-gray-500">({t[language].last30Days})</span>
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t[language].totalHotelsCount}</div>
                    <div className="text-lg font-bold text-blue-600">
                      {stats?.totalHotels ? stats.totalHotels.toLocaleString() : brandTraffic.reduce((sum, b) => sum + b.hotel_count, 0).toLocaleString()}{language === 'ko' ? '개' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t[language].pageViews} ({t[language].last30Days})</div>
                    <div className="text-lg font-bold text-purple-600">
                      {analytics?.hotelPages?.totalViews 
                        ? analytics.hotelPages.totalViews.toLocaleString()
                        : brandTraffic.reduce((sum, b) => sum + b.total_page_views, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 그리드 형태 통계 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(() => {
                  // 호텔 개수 기준으로 정렬
                  const sortedBrands = [...brandTraffic].sort((a, b) => b.hotel_count - a.hotel_count)
                  
                  // Conrad Hotels & Resorts 제외
                  const conradBrand = sortedBrands.find(b => 
                    b.brand_name_en?.toLowerCase().includes('conrad') || 
                    b.brand_name_kr?.includes('콘래드')
                  )
                  const brandsWithoutConrad = sortedBrands.filter(b => 
                    !(b.brand_name_en?.toLowerCase().includes('conrad') || 
                      b.brand_name_kr?.includes('콘래드'))
                  )
                  
                  // Conrad를 제외한 상위 9개 선택
                  const top9Brands = brandsWithoutConrad.slice(0, 9)
                  // Conrad와 나머지 브랜드를 "기타"로 집계
                  const otherBrands = brandsWithoutConrad.slice(9)
                  const brandsForEtc = conradBrand ? [conradBrand, ...otherBrands] : otherBrands
                  
                  // 기타 브랜드 집계
                  // Conrad + 상위 9개 이외의 브랜드 + 브랜드가 없는 호텔도 포함해야 전체 호텔 수와 일치
                  const otherBrandsHotelCount = brandsForEtc.reduce((sum, b) => sum + b.hotel_count, 0)
                  const top9BrandsHotelCount = top9Brands.reduce((sum, b) => sum + b.hotel_count, 0)
                  const totalBrandsHotelCount = top9BrandsHotelCount + otherBrandsHotelCount
                  
                  // 브랜드가 없는 호텔 개수 계산 (전체 호텔 수에서 브랜드가 있는 호텔 수를 뺀 값)
                  const hotelsWithoutBrand = stats?.totalHotels 
                    ? Math.max(0, stats.totalHotels - totalBrandsHotelCount)
                    : 0
                  
                  // 브랜드가 없는 호텔의 아티클 개수는 API에서 계산 불가 (브랜드 ID가 없으므로)
                  // 일단 기타 브랜드의 아티클만 합산
                  // TODO: 필요시 브랜드가 없는 호텔의 아티클 개수도 별도로 계산
                  const otherBrandsData = (brandsForEtc.length > 0 || hotelsWithoutBrand > 0) ? {
                    brand_id: -1,
                    brand_name_kr: null,
                    brand_name_en: '기타',
                    total_page_views: brandsForEtc.reduce((sum, b) => sum + b.total_page_views, 0),
                    total_users: brandsForEtc.reduce((sum, b) => sum + b.total_users, 0),
                    hotel_count: otherBrandsHotelCount + hotelsWithoutBrand, // 브랜드가 없는 호텔도 포함
                    article_count: brandsForEtc.reduce((sum, b) => sum + b.article_count, 0) + (brandTrafficMeta?.articlesWithoutBrand || 0), // 기타 브랜드 + 브랜드 없는 호텔 아티클
                    avg_time_on_page: 0,
                    percentage: 0,
                  } : null
                  
                  const allBrandsToShow = otherBrandsData 
                    ? [...top9Brands, otherBrandsData]
                    : top9Brands
                  
                  // 검증: 모든 카드의 호텔 개수 합계가 전체 호텔 수와 일치하는지 확인
                  const totalHotelsInCards = allBrandsToShow.reduce((sum: number, b: BrandTrafficData) => sum + b.hotel_count, 0)
                  console.log('호텔 개수 검증:', {
                    statsTotalHotels: stats?.totalHotels,
                    totalBrandsHotelCount,
                    hotelsWithoutBrand,
                    totalHotelsInCards,
                    match: stats?.totalHotels === totalHotelsInCards
                  })
                  
                  const maxHotels = Math.max(...allBrandsToShow.map((b: BrandTrafficData) => b.hotel_count))
                  
                  return allBrandsToShow.map((brand: BrandTrafficData, index: number) => {
                    const sizeRatio = brand.hotel_count / maxHotels
                    const baseSize = 80 // 최소 크기
                    const maxSize = 140 // 최대 크기
                    const cardSize = Math.round(baseSize + (maxSize - baseSize) * sizeRatio)
                    
                    const colors = [
                      'from-yellow-400 to-yellow-500 border-yellow-300',
                      'from-gray-300 to-gray-400 border-gray-300',
                      'from-orange-400 to-orange-500 border-orange-300',
                      'from-purple-400 to-purple-500 border-purple-300',
                      'from-pink-400 to-pink-500 border-pink-300',
                      'from-blue-400 to-blue-500 border-blue-300',
                      'from-green-400 to-green-500 border-green-300',
                      'from-indigo-400 to-indigo-500 border-indigo-300',
                      'from-red-400 to-red-500 border-red-300',
                      'from-teal-400 to-teal-500 border-teal-300',
                    ]
                    const colorClass = index === 10 
                      ? 'from-gray-400 to-gray-500 border-gray-400' // 기타는 회색
                      : colors[index] || 'from-purple-400 to-purple-500 border-purple-300'
                    
                    return (
                      <div
                        key={brand.brand_id}
                        className={cn(
                          'bg-white rounded-lg border-2 p-3 flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-105',
                          `border-${colorClass.split(' ')[2]}`
                        )}
                        style={{ 
                          minHeight: `${cardSize}px`,
                          background: `linear-gradient(to bottom right, ${colorClass.includes('yellow') ? '#fef3c7, #fde68a' : 
                            colorClass.includes('gray') ? '#f3f4f6, #e5e7eb' :
                            colorClass.includes('orange') ? '#fed7aa, #fdba74' :
                            colorClass.includes('purple') ? '#e9d5ff, #d8b4fe' :
                            colorClass.includes('pink') ? '#fce7f3, #fbcfe8' :
                            colorClass.includes('blue') ? '#dbeafe, #bfdbfe' :
                            colorClass.includes('green') ? '#d1fae5, #a7f3d0' :
                            colorClass.includes('indigo') ? '#e0e7ff, #c7d2fe' :
                            colorClass.includes('red') ? '#fee2e2, #fecaca' :
                            '#ccfbf1, #99f6e4'})`
                        }}
                      >
                        {/* 브랜드명 상단 표시 (영어만) */}
                        <div className="text-center mb-2 w-full">
                          <div className="text-xs font-semibold text-gray-700 truncate w-full px-1">
                            {brand.brand_name_en || brand.brand_name_kr || '알 수 없음'}
                          </div>
                        </div>
                        
                        {/* 호텔 개수 */}
                        <div className="text-center mb-2 w-full">
                          <div className="text-2xl font-bold text-gray-900 mb-1">
                            {brand.hotel_count}
                          </div>
                          <div className="text-xs text-gray-600">{t[language].registeredHotelsLabel}</div>
                        </div>
                        
                        {/* 트래픽 지표 */}
                        <div className="w-full border-t border-gray-200 pt-2 mb-2 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">{t[language].pageViews}</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {brand.total_page_views.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">{t[language].users}</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {brand.total_users.toLocaleString()}
                            </span>
                          </div>
                          {brand.percentage > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-gray-500">{t[language].percentage}</span>
                              <span className="text-xs font-semibold text-purple-600">
                                {brand.percentage}%
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* 아티클 개수 */}
                        <div className="text-center w-full border-t border-gray-200 pt-2">
                          <div className="text-xl font-bold text-gray-900 mb-1">
                            {brand.article_count || 0}
                          </div>
                          <div className="text-xs text-gray-600">{t[language].articles}</div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 투어비스 셀렉트 플랫폼 경쟁력 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t[language].platformCompetitiveness}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t[language].no1Platform}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t[language].no1PlatformDesc}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t[language].targetCustomers}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t[language].targetCustomersDesc}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-green-100 p-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t[language].marketingEffect}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t[language].marketingEffectDesc}
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">{t[language].brandStrengthening}</h3>
            </div>
            <p className="text-sm text-gray-600">
              {t[language].brandStrengtheningDesc}
            </p>
          </div>
        </div>
      </section>

      {/* 투어비스 셀렉트의 프리미엄 호텔 파트너로서의 경쟁력 */}
      <section>
        <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
          <div className="flex items-center gap-3 mb-4">
            <PresentationChart className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{t[language].partnerCompetitiveness}</h2>
          </div>
          <div className="space-y-4 text-gray-700">
            <p className="text-base leading-relaxed">
              {language === 'ko' ? (
                <>투어비스 셀렉트는 <strong className="text-gray-900">한국 최고의 프리미엄 호텔 전문 플랫폼</strong>으로, <strong className="text-gray-900">엄선된 초상위 호텔 브랜드 {stats.brandCount.toLocaleString()}개</strong>를 포함하여 <strong className="text-gray-900"> {stats.totalHotels.toLocaleString()}개 이상의 호텔</strong>을 보유하고 있습니다.</>
              ) : (
                <>{t[language].platformIntro.replace('{brandCount}', stats.brandCount.toLocaleString()).replace('{totalHotels}', stats.totalHotels.toLocaleString())}</>
              )}
            </p>
            <p className="text-base leading-relaxed">
              {language === 'ko' ? (
                <>본 플랫폼을 통해 호텔 시설사는 <strong className="text-gray-900">고품질 콘텐츠</strong>와 <strong className="text-gray-900">다양한 마케팅 채널</strong>을 통해 타겟 고객에게 효과적으로 노출될 수 있으며, <strong className="text-gray-900">호텔 컨시어지 전문가에 의한 상담</strong>을 통한 호텔 예약 전환을 기대할 수 있습니다.</>
              ) : (
                <>{t[language].platformBenefits}</>
              )}
            </p>
            <div className="mt-6 pt-6 border-t border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">{t[language].mainProposals}</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span>{t[language].proposal1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span>{t[language].proposal2}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span>{t[language].proposal3}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <span>{t[language].proposal4}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}
