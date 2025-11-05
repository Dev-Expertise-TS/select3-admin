// 해시태그 관련 타입 정의

/**
 * 태그 카테고리 (select_tag_categories)
 */
export interface TagCategory {
  id: string // uuid
  slug: string | null
  name_ko: string | null
  name_en: string | null
  sort_order: number
  is_facetable: boolean
  multi_select: boolean
  icon: string | null
  created_at: string
  updated_at: string
}

/**
 * 태그 (select_tags)
 */
export interface Tag {
  id: string // uuid
  slug: string | null
  name_ko: string | null
  name_en: string | null
  category_id: string | null // uuid, FK to select_tag_categories
  synonyms_ko: string
  synonyms_en: string
  description_ko: string | null
  description_en: string | null
  weight: number
  is_active: boolean
  icon: string | null
  meta: Record<string, unknown> | null // jsonb
  created_at: string
  updated_at: string
}

/**
 * 호텔-태그 매핑 (select_hotel_tags_map)
 */
export interface HotelTagMap {
  id: string // uuid
  sabre_id: number // int8
  tag_id: string // uuid, FK to select_tags
  created_at: string
}

/**
 * 카테고리 생성/수정 요청
 */
export interface TagCategoryRequest {
  slug?: string
  name_ko?: string
  name_en?: string
  sort_order?: number
  is_facetable?: boolean
  multi_select?: boolean
  icon?: string
}

/**
 * 태그 생성/수정 요청
 */
export interface TagRequest {
  slug?: string
  name_ko?: string
  name_en?: string
  category_id?: string
  synonyms_ko?: string
  synonyms_en?: string
  description_ko?: string
  description_en?: string
  weight?: number
  is_active?: boolean
  icon?: string
  meta?: Record<string, unknown>
}

/**
 * 호텔-태그 매핑 요청
 */
export interface HotelTagMapRequest {
  sabre_id: string
  tag_id: string
}

/**
 * 카테고리와 태그를 함께 조회한 결과
 */
export interface TagWithCategory extends Tag {
  category?: TagCategory
}

