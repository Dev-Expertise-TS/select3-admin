/**
 * Sabre API OAuth 2.0 Client Credentials 토큰 발급 서비스
 * 참조: https://developer.sabre.com/docs/rest_apis/hotel/search/get_hotel_image
 */

interface SabreTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface CachedToken {
  access_token: string
  expires_at: number
}

// 메모리 캐시 (프로덕션에서는 Redis 등 사용 권장)
let tokenCache: CachedToken | null = null

/**
 * Sabre API OAuth 2.0 Client Credentials 방식으로 액세스 토큰 발급
 */
export async function getSabreAccessToken(): Promise<string> {
  const clientId = process.env.SABRE_CLIENT_ID
  const clientSecret = process.env.SABRE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Sabre API 인증 정보가 설정되지 않았습니다. SABRE_CLIENT_ID와 SABRE_CLIENT_SECRET 환경 변수를 확인하세요.')
  }

  // 캐시된 토큰이 있고 만료되지 않았다면 재사용
  if (tokenCache && tokenCache.expires_at > Date.now()) {
    return tokenCache.access_token
  }

  try {
    // Sabre API 토큰 엔드포인트 (테스트 환경)
    const tokenUrl = 'https://api-crt.cert.sabre.com/v2/auth/token'
    
    // Base64 인코딩된 인증 헤더 생성
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Sabre 토큰 발급 실패 (${response.status}): ${errorText}`)
    }

    const tokenData: SabreTokenResponse = await response.json()
    
    // 토큰을 캐시 (만료 시간보다 5분 일찍 만료되도록 설정)
    const expiresAt = Date.now() + (tokenData.expires_in - 300) * 1000
    tokenCache = {
      access_token: tokenData.access_token,
      expires_at: expiresAt
    }

    return tokenData.access_token

  } catch (error) {
    console.error('Sabre OAuth 토큰 발급 오류:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Sabre OAuth 토큰 발급 중 알 수 없는 오류가 발생했습니다.')
  }
}

/**
 * 캐시된 토큰 강제 초기화
 */
export function clearSabreTokenCache(): void {
  tokenCache = null
}

/**
 * 현재 캐시된 토큰 정보 반환 (디버깅용)
 */
export function getSabreTokenCacheInfo(): { hasCache: boolean; expiresAt?: number; timeLeft?: number } {
  if (!tokenCache) {
    return { hasCache: false }
  }
  
  const timeLeft = Math.max(0, tokenCache.expires_at - Date.now())
  return {
    hasCache: true,
    expiresAt: tokenCache.expires_at,
    timeLeft: Math.floor(timeLeft / 1000) // 초 단위
  }
}