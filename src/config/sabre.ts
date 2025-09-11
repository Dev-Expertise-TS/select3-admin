/**
 * Sabre API 설정 및 환경 변수 관리
 */

// Sabre API 기본 설정
export const SABRE_CONFIG = {
  // 기본 URL (환경 변수에서 가져오거나 기본값 사용)
  BASE_URL: process.env.SABRE_BASE_URL || 'https://api-crt.cert.sabre.com',
  
  // API 버전
  VERSION: process.env.SABRE_API_VERSION || 'v1.0.0',
  
  // 디버그 모드
  DEBUG: String(process.env.SABRE_DEBUG || '').toLowerCase() === 'true',
  
  // 인증 정보
  CLIENT_ID: process.env.SABRE_CLIENT_ID,
  CLIENT_SECRET: process.env.SABRE_CLIENT_SECRET,
  
  // 타임아웃 설정 (밀리초)
  TIMEOUT: {
    DEFAULT: 12000,
    PROXY: 15000,
  },
  
  // 프록시 서버 설정
  PROXY: {
    BASE_URL: process.env.SABRE_PROXY_URL || 'https://sabre-nodejs-9tia3.ondigitalocean.app/public/hotel/sabre',
  },
  
  // 이미지 API 엔드포인트 후보들
  IMAGE_ENDPOINTS: (baseUrl: string, version: string, hotelCode: string) => [
    `${baseUrl}/${version}/shop/hotels/images?hotelCode=${encodeURIComponent(hotelCode)}&imageSize=Large`,
    `${baseUrl}/${version}/shop/hotels/images?hotelCode=${encodeURIComponent(hotelCode)}&category=ALL`,
    `${baseUrl}/${version}/shop/hotels/images?hotelCode=${encodeURIComponent(hotelCode)}`,
    `${baseUrl}/${version}/shop/hotels/images?HotelCode=${encodeURIComponent(hotelCode)}`,
    `${baseUrl}/${version}/shop/hotels/image?hotelCode=${encodeURIComponent(hotelCode)}`,
  ],
} as const

/**
 * Sabre API 기본 URL 생성
 * @returns 정규화된 Sabre API 기본 URL
 */
export function getSabreBaseUrl(): string {
  const baseUrl = `${SABRE_CONFIG.BASE_URL}/${SABRE_CONFIG.VERSION}`.replace(/\/$/, '')
  return baseUrl
}

/**
 * Sabre API 인증 정보 확인
 * @returns 인증 정보가 설정되어 있는지 여부
 */
export function hasSabreCredentials(): boolean {
  return !!(SABRE_CONFIG.CLIENT_ID && SABRE_CONFIG.CLIENT_SECRET)
}

/**
 * 디버그 로그 함수
 * @param args - 로그 인자들
 */
export function sabreDebugLog(...args: unknown[]): void {
  if (SABRE_CONFIG.DEBUG) {
    try {
      console.log('[SABRE_DEBUG]', ...args)
    } catch {
      // 로그 출력 실패 시 무시
    }
  }
}
