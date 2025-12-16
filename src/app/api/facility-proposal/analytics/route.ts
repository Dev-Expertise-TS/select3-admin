import { NextResponse } from 'next/server'

// 관리 화면 차트/지표는 최신성이 중요하므로 캐시를 강제하지 않습니다.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface GoogleAnalyticsData {
  // 페이지뷰 통계
  pageViews: {
    total: number
    last30Days: number
    last7Days: number
    today: number
    growth: number // 전월 대비 증가율 (%)
  }
  // 사용자 통계
  users: {
    total: number
    last30Days: number
    last7Days: number
    newUsers: number
    returningUsers: number
  }
  // 세션 통계
  sessions: {
    total: number
    last30Days: number
    avgSessionDuration: number // 초 단위
    bounceRate: number // %
  }
  // 트래픽 소스
  trafficSources: {
    organic: number
    direct: number
    referral: number
    social: number
    paid: number
  }
  // 디바이스 통계
  devices: {
    desktop: number
    mobile: number
    tablet: number
  }
  // 지역 통계 (상위 5개)
  topCountries: Array<{
    country: string
    users: number
    percentage: number
  }>
  // 인기 페이지 (상위 5개)
  topPages: Array<{
    page: string
    views: number
    percentage: number
  }>
  // 카테고리별 인기 페이지
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
  // 기간별 통계
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
  // 호텔 상세 페이지 통계
  hotelPages: {
    totalViews: number
    avgTimeOnPage: number // 초 단위
    hotelsViewed: number
  }
  // 월별 트래픽 추이 (최근 12개월)
  monthlyTrend: Array<{
    month: string
    pageViews: number
    users: number
    conversions: number
  }>
  // 월간 핵심 지표 추이 (최근 12개월) - pageViews/users는 GA4, impressions/clicks는 SEO 총합을 월별로 분배(추정)
  monthlyKpiTrend: Array<{
    month: string
    pageViews: number
    users: number
    impressions: number
    clicks: number
  }>
  monthlyKpiTrendSource: 'search-console' | 'estimated'
  // SEO 순위 지표
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

type MonthlySearchConsoleTrend = Array<{ month: string; impressions: number; clicks: number }>

const KPI_TREND_START_MONTH = '2024-07'
const KPI_TREND_START_DATE = '2024-07-01'

function formatDateISO(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function getGoogleAccessTokenForSearchConsole(): Promise<string | null> {
  const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID || process.env.GOOGLE_ANALYTICS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET || process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN || process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('Search Console OAuth2 설정이 완료되지 않았습니다.')
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('Search Console 액세스 토큰 갱신 실패:', await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token || null
  } catch (error) {
    console.error('Search Console 액세스 토큰 가져오기 오류:', error)
    return null
  }
}

async function fetchSearchConsoleMonthlyTrend(): Promise<MonthlySearchConsoleTrend | null> {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  if (!siteUrl) {
    console.warn('GOOGLE_SEARCH_CONSOLE_SITE_URL이 설정되지 않았습니다.')
    return null
  }

  const accessToken = await getGoogleAccessTokenForSearchConsole()
  if (!accessToken) return null

  // 2024-07-01(오픈 시점)부터 현재까지 (일별 → 월별 합산)
  const end = new Date()
  const startDate = KPI_TREND_START_DATE

  try {
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate: formatDateISO(end),
        dimensions: ['date'],
        rowLimit: 25000,
      }),
    })

    if (!response.ok) {
      console.error('Search Console 데이터 가져오기 실패:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    const rows: Array<{ keys?: string[]; clicks?: number; impressions?: number }> = data.rows || []

    const byMonth = new Map<string, { impressions: number; clicks: number }>()
    for (const row of rows) {
      const dateStr = row.keys?.[0]
      if (!dateStr) continue
      const month = dateStr.slice(0, 7) // YYYY-MM
      const prev = byMonth.get(month) || { impressions: 0, clicks: 0 }
      byMonth.set(month, {
        impressions: prev.impressions + Number(row.impressions || 0),
        clicks: prev.clicks + Number(row.clicks || 0),
      })
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        impressions: Math.round(v.impressions),
        clicks: Math.round(v.clicks),
      }))
  } catch (error) {
    console.error('Search Console 데이터 가져오기 오류:', error)
    return null
  }
}

function buildMonthlyKpiTrend(args: {
  monthlyTrend: GoogleAnalyticsData['monthlyTrend']
  totalImpressions: number
  totalClicks: number
}): GoogleAnalyticsData['monthlyKpiTrend'] {
  const range = args.monthlyTrend.filter((m) => m.month >= KPI_TREND_START_MONTH)
  const last12 = range.length > 0 ? range : args.monthlyTrend
  const weights = last12.map((m) => Math.max(0, m.pageViews))
  const weightSum = weights.reduce((sum, v) => sum + v, 0)

  const distribute = (total: number) => {
    if (total <= 0 || last12.length === 0) return last12.map(() => 0)
    const base = last12.map((_, i) => {
      const w = weightSum > 0 ? weights[i] / weightSum : 1 / last12.length
      return Math.floor(total * w)
    })
    const used = base.reduce((sum, v) => sum + v, 0)
    let remainder = total - used
    // 잔여분을 월별로 1씩 분배 (앞에서부터)
    let idx = 0
    while (remainder > 0 && base.length > 0) {
      base[idx] += 1
      remainder -= 1
      idx = (idx + 1) % base.length
    }
    return base
  }

  const impressionsByMonth = distribute(Math.max(0, args.totalImpressions))
  const clicksByMonth = distribute(Math.max(0, args.totalClicks))

  return last12.map((m, i) => ({
    month: m.month,
    pageViews: m.pageViews,
    users: m.users,
    impressions: impressionsByMonth[i] ?? 0,
    clicks: clicksByMonth[i] ?? 0,
  }))
}

function buildMonthlyKpiTrendFromSearchConsole(args: {
  monthlyTrend: GoogleAnalyticsData['monthlyTrend']
  searchConsole: MonthlySearchConsoleTrend
}): GoogleAnalyticsData['monthlyKpiTrend'] {
  const range = args.monthlyTrend.filter((m) => m.month >= KPI_TREND_START_MONTH)
  const last12 = range.length > 0 ? range : args.monthlyTrend
  const scMap = new Map(args.searchConsole.map((r) => [r.month, r]))
  return last12.map((m) => {
    const sc = scMap.get(m.month)
    return {
      month: m.month,
      pageViews: m.pageViews,
      users: m.users,
      impressions: sc?.impressions ?? 0,
      clicks: sc?.clicks ?? 0,
    }
  })
}

/**
 * Google Analytics Data API를 통해 실제 데이터를 가져옵니다.
 * 환경 변수가 설정되지 않은 경우 샘플 데이터를 반환합니다.
 */
async function fetchGoogleAnalyticsData(): Promise<GoogleAnalyticsData> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-6Y4X23JB12'
  const gaApiKey = process.env.GOOGLE_ANALYTICS_API_KEY
  const gaPropertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  // 환경 변수가 설정되지 않은 경우 샘플 데이터 반환
  if (!gaApiKey || !gaPropertyId) {
    console.warn('Google Analytics API 키가 설정되지 않았습니다. 샘플 데이터를 반환합니다.')
    return getSampleAnalyticsData()
  }

  try {
    // Google Analytics Data API v1을 사용하여 실제 데이터 가져오기
    const accessToken = await getGoogleAnalyticsAccessToken()
    
    if (!accessToken) {
      console.warn('Google Analytics 액세스 토큰을 가져올 수 없습니다. 샘플 데이터를 반환합니다.')
      return getSampleAnalyticsData()
    }

    // 월별 트래픽 추이 데이터 가져오기 (2024년 7월부터 현재까지)
    const monthlyTrend = await fetchMonthlyTrendData(gaPropertyId, accessToken)
    
    // 기본 통계 데이터 가져오기
    const basicStats = await fetchBasicAnalyticsData(gaPropertyId, accessToken)
    
    // 샘플 데이터 구조를 기반으로 실제 데이터 병합
    const sampleData = getSampleAnalyticsData()
    
    const merged: GoogleAnalyticsData = {
      ...sampleData,
      ...basicStats,
      monthlyTrend: monthlyTrend.length > 0 ? monthlyTrend : sampleData.monthlyTrend,
    }
    const searchConsole = await fetchSearchConsoleMonthlyTrend()

    if (searchConsole && searchConsole.length > 0) {
      return {
        ...merged,
        monthlyKpiTrend: buildMonthlyKpiTrendFromSearchConsole({
          monthlyTrend: merged.monthlyTrend,
          searchConsole,
        }),
        monthlyKpiTrendSource: 'search-console',
      }
    }

    return {
      ...merged,
      monthlyKpiTrend: buildMonthlyKpiTrend({
        monthlyTrend: merged.monthlyTrend,
        totalImpressions: merged.seoRanking?.totalImpressions ?? 0,
        totalClicks: merged.seoRanking?.totalClicks ?? 0,
      }),
      monthlyKpiTrendSource: 'estimated',
    }
  } catch (error) {
    console.error('Google Analytics API 오류:', error)
    // 오류 발생 시에도 샘플 데이터 반환
    return getSampleAnalyticsData()
  }
}

/**
 * Google Analytics OAuth2 액세스 토큰 가져오기
 */
async function getGoogleAnalyticsAccessToken(): Promise<string | null> {
  const gaApiKey = process.env.GOOGLE_ANALYTICS_API_KEY
  const gaClientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID
  const gaClientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET
  const gaRefreshToken = process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN

  if (!gaClientId || !gaClientSecret || !gaRefreshToken) {
    console.warn('Google Analytics OAuth2 설정이 완료되지 않았습니다.')
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: gaClientId,
        client_secret: gaClientSecret,
        refresh_token: gaRefreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('액세스 토큰 갱신 실패:', await response.text())
      return null
    }

    const data = await response.json()
    return data.access_token || null
  } catch (error) {
    console.error('액세스 토큰 가져오기 오류:', error)
    return null
  }
}

/**
 * 월별 트래픽 추이 데이터 가져오기 (GA4 Data API 사용)
 */
async function fetchMonthlyTrendData(
  propertyId: string,
  accessToken: string
): Promise<Array<{ month: string; pageViews: number; users: number; conversions: number }>> {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    // 2024년 7월 1일부터 현재까지의 월별 데이터 가져오기
    const startDate = '2024-07-01'
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // GA4 Data API를 사용하여 월별 데이터 가져오기
    // 먼저 기본 메트릭(페이지뷰, 사용자) 가져오기
    const basicResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'yearMonth' }],
          metrics: [
            { name: 'screenPageViews' }, // 페이지뷰
            { name: 'activeUsers' }, // 활성 사용자
          ],
          orderBys: [{ 
            dimension: { 
              dimensionName: 'yearMonth',
              orderType: 'ALPHANUMERIC'
            } 
          }],
        }),
      }
    )

    if (!basicResponse.ok) {
      const errorText = await basicResponse.text()
      console.error('GA4 월별 트래픽 데이터 가져오기 실패:', basicResponse.status, errorText)
      return []
    }

    const basicData = await basicResponse.json()
    const basicRows = basicData.rows || []

    if (basicRows.length === 0) {
      console.warn('GA4에서 월별 트래픽 데이터가 없습니다.')
      return []
    }

    // 전환 데이터 가져오기 시도 (conversions 메트릭 사용)
    let conversionDataMap: Record<string, number> = {}
    try {
      const conversionResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'yearMonth' }],
            metrics: [
              { name: 'conversions' }, // GA4 전환 메트릭
            ],
            orderBys: [{ 
              dimension: { 
                dimensionName: 'yearMonth',
                orderType: 'ALPHANUMERIC'
              } 
            }],
          }),
        }
      )

      if (conversionResponse.ok) {
        const conversionData = await conversionResponse.json()
        const conversionRows = conversionData.rows || []
        conversionRows.forEach((row: any) => {
          const yearMonth = row.dimensionValues[0].value
          const conversions = parseInt(row.metricValues[0]?.value || '0', 10)
          conversionDataMap[yearMonth] = conversions
        })
      }
    } catch (error) {
      console.warn('GA4 전환 데이터 가져오기 실패 (추정값 사용):', error)
    }

    // GA4 데이터를 월별로 변환
    const monthlyData = basicRows.map((row: any) => {
      const yearMonth = row.dimensionValues[0].value // YYYYMM 형식 (예: "202407")
      const year = yearMonth.substring(0, 4)
      const month = yearMonth.substring(4, 6)
      
      const pageViews = parseInt(row.metricValues[0].value || '0', 10)
      const users = parseInt(row.metricValues[1].value || '0', 10)
      
      // 전환 데이터가 있으면 사용, 없으면 페이지뷰 기반으로 추정
      let conversions = conversionDataMap[yearMonth]
      if (!conversions || conversions === 0) {
        // 페이지뷰의 약 0.5-1%를 전환으로 추정 (실제 비율은 사이트에 따라 다름)
        conversions = Math.round(pageViews * 0.007) // 0.7% 추정
      }
      
      return {
        month: `${year}-${month}`,
        pageViews,
        users,
        conversions: conversions > 0 ? conversions : 1, // 최소 1로 설정
      }
    })

    console.log(`GA4 월별 트래픽 데이터 가져오기 성공: ${monthlyData.length}개월 데이터 (GA4 Data API 사용)`)
    return monthlyData
  } catch (error) {
    console.error('GA4 월별 트래픽 데이터 가져오기 오류:', error)
    return []
  }
}

/**
 * 기본 분석 데이터 가져오기 (최근 30일, 7일, 오늘)
 */
async function fetchBasicAnalyticsData(
  propertyId: string,
  accessToken: string
): Promise<Partial<GoogleAnalyticsData>> {
  try {
    // 최근 30일, 7일, 오늘 데이터를 한 번에 가져오기
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            { startDate: '30daysAgo', endDate: 'today' },
            { startDate: '7daysAgo', endDate: 'today' },
            { startDate: 'today', endDate: 'today' },
          ],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('기본 분석 데이터 가져오기 실패:', errorText)
      return {}
    }

    const data = await response.json()
    const rows = data.rows || []

    if (rows.length >= 3) {
      const last30Days = rows[0]
      const last7Days = rows[1]
      const today = rows[2]

      return {
        pageViews: {
          total: parseInt(last30Days.metricValues[0].value || '0', 10) * 12, // 추정치
          last30Days: parseInt(last30Days.metricValues[0].value || '0', 10),
          last7Days: parseInt(last7Days.metricValues[0].value || '0', 10),
          today: parseInt(today.metricValues[0].value || '0', 10),
          growth: 0, // 별도 계산 필요
        },
        users: {
          total: parseInt(last30Days.metricValues[1].value || '0', 10) * 12, // 추정치
          last30Days: parseInt(last30Days.metricValues[1].value || '0', 10),
          last7Days: parseInt(last7Days.metricValues[1].value || '0', 10),
          newUsers: parseInt(last30Days.metricValues[2].value || '0', 10),
          returningUsers: parseInt(last30Days.metricValues[1].value || '0', 10) - parseInt(last30Days.metricValues[2].value || '0', 10),
        },
        sessions: {
          total: parseInt(last30Days.metricValues[3].value || '0', 10) * 12, // 추정치
          last30Days: parseInt(last30Days.metricValues[3].value || '0', 10),
          avgSessionDuration: Math.round(parseFloat(last30Days.metricValues[4].value || '0')),
          bounceRate: parseFloat(last30Days.metricValues[5].value || '0') * 100,
        },
      }
    }

    return {}
  } catch (error) {
    console.error('기본 분석 데이터 가져오기 오류:', error)
    return {}
  }
}

/**
 * 샘플 분석 데이터를 생성합니다.
 * 실제 데이터가 없을 때 사용됩니다.
 */
function getSampleAnalyticsData(): GoogleAnalyticsData {
  const basePageViews = 125000
  const baseUsers = 45000
  const baseSessions = 52000

  const monthlyTrend = generateMonthlyTrend()
  const base: GoogleAnalyticsData = {
    pageViews: {
      total: basePageViews * 12, // 연간 추정
      last30Days: basePageViews,
      last7Days: Math.floor(basePageViews * 0.25),
      today: Math.floor(basePageViews / 30),
      growth: 15.3, // 전월 대비 15.3% 증가
    },
    users: {
      total: baseUsers * 12,
      last30Days: baseUsers,
      last7Days: Math.floor(baseUsers * 0.25),
      newUsers: Math.floor(baseUsers * 0.65),
      returningUsers: Math.floor(baseUsers * 0.35),
    },
    sessions: {
      total: baseSessions * 12,
      last30Days: baseSessions,
      avgSessionDuration: 245, // 약 4분
      bounceRate: 42.5,
    },
    trafficSources: {
      organic: 45,
      direct: 30,
      referral: 15,
      social: 8,
      paid: 2,
    },
    devices: {
      desktop: 55,
      mobile: 40,
      tablet: 5,
    },
    topCountries: [
      { country: '대한민국', users: 28000, percentage: 62.2 },
      { country: '미국', users: 8500, percentage: 18.9 },
      { country: '일본', users: 4200, percentage: 9.3 },
      { country: '중국', users: 2800, percentage: 6.2 },
      { country: '기타', users: 1500, percentage: 3.4 },
    ],
    topPages: [
      { page: '/hotels', views: 35000, percentage: 28.0 },
      { page: '/recommendations', views: 28000, percentage: 22.4 },
      { page: '/hotels/[id]', views: 22000, percentage: 17.6 },
      { page: '/', views: 18000, percentage: 14.4 },
      { page: '/about', views: 22000, percentage: 17.6 },
    ],
    pagesByCategory: {
      hotel: [
        { page: '/hotels/seoul-grand-hotel', views: 8500, percentage: 10.0, hotelName: '서울 그랜드 호텔' },
        { page: '/hotels/busan-paradise', views: 7200, percentage: 8.5, hotelName: '부산 파라다이스 호텔' },
        { page: '/hotels/jeju-resort', views: 6800, percentage: 8.0, hotelName: '제주 리조트' },
        { page: '/hotels/lotte-seoul', views: 6200, percentage: 7.3, hotelName: '롯데호텔 서울' },
        { page: '/hotels/shinsegae-gangnam', views: 5800, percentage: 6.8, hotelName: '신세계 강남' },
        { page: '/hotels/hyatt-regency', views: 5400, percentage: 6.4, hotelName: '하이얏 리젠시' },
        { page: '/hotels/marriott-seoul', views: 5100, percentage: 6.0, hotelName: '서울 메리어트 호텔' },
        { page: '/hotels/conrad-seoul', views: 4800, percentage: 5.7, hotelName: '콘래드 서울' },
      ],
      blog: [
        { page: '/blog/premium-hotel-guide', views: 12000, percentage: 14.1, title: '프리미엄 호텔 가이드' },
        { page: '/blog/luxury-travel-tips', views: 9800, percentage: 11.5, title: '럭셔리 여행 팁' },
        { page: '/blog/hotel-benefits', views: 8500, percentage: 10.0, title: '호텔 혜택 완벽 가이드' },
        { page: '/blog/best-hotels-2024', views: 7200, percentage: 8.5, title: '2024 베스트 호텔' },
        { page: '/blog/dining-experience', views: 6800, percentage: 8.0, title: '호텔 다이닝 경험' },
        { page: '/blog/spa-wellness', views: 6200, percentage: 7.3, title: '스파 & 웰니스' },
      ],
      region: [
        { page: '/regions/seoul', views: 15000, percentage: 17.6, regionName: '서울' },
        { page: '/regions/jeju', views: 12800, percentage: 15.1, regionName: '제주' },
        { page: '/regions/busan', views: 11200, percentage: 13.2, regionName: '부산' },
        { page: '/regions/gyeongju', views: 9800, percentage: 11.5, regionName: '경주' },
        { page: '/regions/gangwon', views: 8500, percentage: 10.0, regionName: '강원' },
        { page: '/regions/jeonju', views: 7200, percentage: 8.5, regionName: '전주' },
      ],
      recommendation: [
        { page: '/recommendations/romantic-getaway', views: 18000, percentage: 21.2, title: '로맨틱 게이트웨이' },
        { page: '/recommendations/family-friendly', views: 15200, percentage: 17.9, title: '가족 친화 호텔' },
        { page: '/recommendations/business-travel', views: 12800, percentage: 15.1, title: '비즈니스 여행' },
        { page: '/recommendations/luxury-spa', views: 11200, percentage: 13.2, title: '럭셔리 스파 호텔' },
        { page: '/recommendations/ocean-view', views: 9800, percentage: 11.5, title: '오션뷰 호텔' },
      ],
      other: [
        { page: '/', views: 18000, percentage: 21.2 },
        { page: '/about', views: 8500, percentage: 10.0 },
        { page: '/contact', views: 6200, percentage: 7.3 },
        { page: '/search', views: 5100, percentage: 6.0 },
      ],
    },
    pagesByPeriod: {
      today: {
        hotel: 850,
        blog: 420,
        region: 680,
        recommendation: 520,
        other: 320,
      },
      last7Days: {
        hotel: 12500,
        blog: 8200,
        region: 11200,
        recommendation: 9800,
        other: 6200,
      },
      last30Days: {
        hotel: 51000,
        blog: 50500,
        region: 64500,
        recommendation: 67000,
        other: 37800,
      },
      last90Days: {
        hotel: 145000,
        blog: 142000,
        region: 185000,
        recommendation: 195000,
        other: 108000,
      },
    },
    hotelPages: {
      totalViews: 85000,
      avgTimeOnPage: 320, // 약 5분 20초
      hotelsViewed: 3200,
    },
    // 2024년 7월 1일 오픈 이후 현재 년월까지 월별 트래픽 추이 (동적 생성)
    monthlyTrend,
    // SEO 순위 지표 (개선된 지표)
    seoRanking: {
      totalKeywords: 2850,
      top10Keywords: 52,
      top20Keywords: 128,
      top50Keywords: 295,
      avgPosition: 8.2,
      totalImpressions: 1240000,
      totalClicks: 46500,
      avgCTR: 3.75,
      topKeywords: [
        { keyword: '마리어트 호텔', position: 1, impressions: 185000, clicks: 8500, ctr: 4.59 },
        { keyword: '하이얏 호텔 예약', position: 2, impressions: 152000, clicks: 6800, ctr: 4.47 },
        { keyword: '리츠칼튼 호텔', position: 3, impressions: 138000, clicks: 5800, ctr: 4.20 },
        { keyword: '포시즌 호텔', position: 2, impressions: 125000, clicks: 5200, ctr: 4.16 },
        { keyword: '힐튼 호텔 예약', position: 4, impressions: 112000, clicks: 4500, ctr: 4.02 },
        { keyword: '인터컨티넨탈 호텔', position: 5, impressions: 98000, clicks: 3800, ctr: 3.88 },
        { keyword: 'JW 메리어트 호텔', position: 3, impressions: 92000, clicks: 3600, ctr: 3.91 },
        { keyword: '그랜드 하이얏 호텔', position: 4, impressions: 85000, clicks: 3200, ctr: 3.76 },
        { keyword: '콘래드 호텔', position: 6, impressions: 78000, clicks: 2900, ctr: 3.72 },
        { keyword: '웨스틴 호텔', position: 5, impressions: 72000, clicks: 2700, ctr: 3.75 },
        { keyword: '셰라톤 호텔', position: 2, impressions: 68000, clicks: 2600, ctr: 3.82 },
        { keyword: '페어몬트 호텔', position: 3, impressions: 62000, clicks: 2400, ctr: 3.87 },
        { keyword: '라디슨 호텔', position: 4, impressions: 58000, clicks: 2200, ctr: 3.79 },
        { keyword: '스위소텔 호텔', position: 5, impressions: 54000, clicks: 2100, ctr: 3.89 },
        { keyword: '리젠시 호텔', position: 1, impressions: 52000, clicks: 2000, ctr: 3.85 },
      ],
    },
    // 아래에서 채움
    monthlyKpiTrend: [],
    monthlyKpiTrendSource: 'estimated',
  }

  return {
    ...base,
    monthlyKpiTrend: buildMonthlyKpiTrend({
      monthlyTrend: base.monthlyTrend,
      totalImpressions: base.seoRanking.totalImpressions,
      totalClicks: base.seoRanking.totalClicks,
    }),
    monthlyKpiTrendSource: 'estimated',
  }
}

/**
 * 2024년 7월부터 현재 년월까지의 월별 트래픽 추이 데이터를 생성합니다.
 * 점진적인 성장 추이를 시뮬레이션합니다.
 */
function generateMonthlyTrend(): Array<{
  month: string
  pageViews: number
  users: number
  conversions: number
}> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  const startYear = 2024
  const startMonth = 7 // 7월부터 시작
  
  const monthlyTrend: Array<{
    month: string
    pageViews: number
    users: number
    conversions: number
  }> = []
  
  let monthIndex = 0
  let year = startYear
  let month = startMonth
  
  // 초기값 설정
  let basePageViews = 12500
  let baseUsers = 4500
  let baseConversions = 125
  
  // 성장률 계수 (월별 증가율)
  const growthRates = [1.0, 1.56, 1.44, 1.61, 1.67, 1.67, 1.31, 1.29, 1.35, 1.29, 1.31, 1.27]
  
  while (year < currentYear || (year === currentYear && month <= currentMonth)) {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`
    
    // 성장률 적용 (초기 몇 개월은 빠른 성장, 이후 안정화)
    const growthRate = monthIndex < growthRates.length 
      ? growthRates[monthIndex] 
      : 1.15 + (Math.random() * 0.1) // 이후 안정적인 성장
    
    basePageViews = Math.round(basePageViews * growthRate)
    baseUsers = Math.round(baseUsers * growthRate)
    baseConversions = Math.round(baseConversions * growthRate)
    
    monthlyTrend.push({
      month: monthStr,
      pageViews: basePageViews,
      users: baseUsers,
      conversions: baseConversions,
    })
    
    // 다음 달로 이동
    month++
    if (month > 12) {
      month = 1
      year++
    }
    monthIndex++
  }
  
  return monthlyTrend
}

export async function GET() {
  try {
    const analyticsData = await fetchGoogleAnalyticsData()

    return NextResponse.json(
      {
        success: true,
        data: analyticsData,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Analytics data fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '분석 데이터를 가져오는 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
