/**
 * 호텔 토픽 페이지 관련 타입 정의
 */

// select_topic_pages 테이블
export interface TopicPage {
  id: string // uuid
  slug: string
  title_ko: string
  where_countries: string[] | null
  where_cities: string[] | null
  companions: string[] | null
  styles: string[] | null
  hero_image_url: string | null
  intro_rich_ko: string | null
  hashtags: string[] | null
  status: 'draft' | 'published' | 'archived'
  publish: boolean // 배포 여부
  publish_at: string | null // timestamp
  created_at: string // timestamp
  updated_at: string // timestamp
  // SEO 필드
  seo_title_ko: string | null
  seo_description_ko: string | null
  seo_canonical_url: string | null
  meta_robots: string | null
  og_title: string | null
  og_description: string | null
  og_image_url: string | null
  twitter_title: string | null
  twitter_description: string | null
  twitter_image_url: string | null
  seo_hreflang: any | null // jsonb
  seo_schema_json: any | null // jsonb
  sitemap_priority: number | null
  sitemap_changefreq: string | null
}

// select_topic_page_hotels 테이블
export interface TopicPageHotel {
  id: number
  page_id: string // uuid - FK to select_topic_pages
  sabre_id: number
  pin_to_top: boolean
  rank_manual: number | null
  badge_text_ko: string | null
  card_title_ko: string | null
  card_blurb_ko: string | null
  card_image_url: string | null
  gallery_image_urls: string[] | null
  match_where_note_ko: string | null
  match_companion_note_ko: string | null
  match_style_note_ko: string | null
  created_at: string // timestamp
  updated_at: string // timestamp
}

// 호텔 정보와 함께 조회되는 토픽 페이지 호텔
export interface TopicPageHotelWithInfo extends TopicPageHotel {
  hotel?: {
    property_name_ko: string | null
    property_name_en: string | null
    city_ko: string | null
    country_ko: string | null
  }
}

// 호텔 정보와 함께 조회되는 토픽 페이지
export interface TopicPageWithHotels extends TopicPage {
  hotels?: TopicPageHotelWithInfo[]
  hotel_count?: number
}

// API 응답 타입
export interface TopicPageApiResponse {
  success: boolean
  data?: TopicPage | TopicPage[]
  error?: string
  meta?: {
    count?: number
    page?: number
    pageSize?: number
  }
}

export interface TopicPageHotelApiResponse {
  success: boolean
  data?: TopicPageHotel | TopicPageHotel[]
  error?: string
  meta?: {
    count?: number
  }
}

// 생성/수정 요청 타입
export interface CreateTopicPageRequest {
  slug: string
  title_ko: string
  where_countries?: string[]
  where_cities?: string[]
  companions?: string[]
  styles?: string[]
  hero_image_url?: string
  intro_rich_ko?: string
  hashtags?: string[]
  status?: 'draft' | 'published' | 'archived'
  publish?: boolean
  publish_at?: string
  // SEO 필드
  seo_title_ko?: string
  seo_description_ko?: string
  seo_canonical_url?: string
  meta_robots?: string
  og_title?: string
  og_description?: string
  og_image_url?: string
  twitter_title?: string
  twitter_description?: string
  twitter_image_url?: string
  seo_hreflang?: any
  seo_schema_json?: any
  sitemap_priority?: number
  sitemap_changefreq?: string
}

export interface UpdateTopicPageRequest extends Partial<CreateTopicPageRequest> {
  id: string
}

export interface CreateTopicPageHotelRequest {
  page_id: string
  sabre_id: number
  pin_to_top?: boolean
  rank_manual?: number
  badge_text_ko?: string
  card_title_ko?: string
  card_blurb_ko?: string
  card_image_url?: string
  gallery_image_urls?: string[]
  match_where_note_ko?: string
  match_companion_note_ko?: string
  match_style_note_ko?: string
}

export interface UpdateTopicPageHotelRequest extends Partial<CreateTopicPageHotelRequest> {
  id: number
}

