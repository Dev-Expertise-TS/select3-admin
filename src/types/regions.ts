export type RegionType = 'city' | 'country' | 'continent' | 'region'

export interface SelectRegion {
  id: number
  region_type: RegionType
  city_kr: string | null
  city_en: string | null
  city_sort_order: number | null
  country_ko: string | null
  country_en: string | null
  country_sort_order: number | null
  continent_ko: string | null
  continent_en: string | null
  continent_sort_order: number | null
  region_name_kr: string | null
  region_name_en: string | null
  region_name_sort_order: number | null
  updated_at: string | null
}

export interface RegionFormInput {
  region_type: RegionType
  city_kr?: string | null
  city_en?: string | null
  city_sort_order?: number | null
  country_ko?: string | null
  country_en?: string | null
  country_sort_order?: number | null
  continent_ko?: string | null
  continent_en?: string | null
  continent_sort_order?: number | null
  region_name_kr?: string | null
  region_name_en?: string | null
  region_name_sort_order?: number | null
}

export interface RegionsQueryParams {
  page?: number
  pageSize?: number
  type?: RegionType
  search?: string
  sortKey?: keyof Pick<SelectRegion,
    'city_sort_order' | 'country_sort_order' | 'continent_sort_order' | 'region_name_sort_order' | 'id'>
  sortOrder?: 'asc' | 'desc'
}


