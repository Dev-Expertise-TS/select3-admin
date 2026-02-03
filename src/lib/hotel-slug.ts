/**
 * 호텔 slug 생성 공통 로직
 * hotel-update/new(신규 호텔 생성) 및 API /api/hotel/create에서 공유
 */

import { normalizeSlug } from '@/lib/media-naming'

/**
 * 호텔 slug 자동 생성
 * - 영문명 우선 → 한글명 → hotel-{sabreId} 순서
 * - slug 유니크 충돌 시 suffix: {slug}-{sabreId}
 */
export function generateHotelSlug(
  propertyNameEn: string | null | undefined,
  propertyNameKo: string | null | undefined,
  sabreId: string
): string {
  let slugCandidate = ''
  if (propertyNameEn?.trim()) {
    slugCandidate = normalizeSlug(propertyNameEn.trim())
  }
  if (!slugCandidate && propertyNameKo?.trim()) {
    slugCandidate = normalizeSlug(propertyNameKo.trim())
  }
  if (!slugCandidate) {
    slugCandidate = `hotel-${sabreId}`
  }
  return slugCandidate
}

/**
 * slug 유니크 충돌 시 sabreId suffix 붙인 fallback
 */
export function slugWithSuffix(slug: string, sabreId: string): string {
  return `${slug}-${sabreId}`
}
