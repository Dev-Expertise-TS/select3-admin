type SabreTokenResponse = {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
}

// 기본값 제공: env 미설정 시 플랫폼 호스트 사용
const SABRE_BASE_URL = process.env.SABRE_BASE_URL || 'https://api.platform.sabre.com'
const SABRE_AUTH_PATH = process.env.SABRE_AUTH_PATH || '/v2/auth/token'
const SABRE_CLIENT_ID = process.env.SABRE_CLIENT_ID
const SABRE_CLIENT_SECRET = process.env.SABRE_CLIENT_SECRET
const SABRE_DEBUG = String(process.env.SABRE_DEBUG || '').toLowerCase() === 'true'
const SABRE_DEBUG_PLAINTEXT = String(process.env.SABRE_DEBUG_PLAINTEXT || '').toLowerCase() === 'true'
const SABRE_GRANT_HEADER_ONLY = String(process.env.SABRE_GRANT_HEADER_ONLY || '').toLowerCase() === 'true'

const mask = (val?: string | null) => {
  if (!val) return 'N/A'
  if (val.length <= 8) return `${val.slice(0, 2)}***${val.slice(-2)}`
  return `${val.slice(0, 6)}...${val.slice(-4)}`
}

const debugLog = (...args: unknown[]) => {
  if (SABRE_DEBUG) {
    try { console.log('[SABRE_DEBUG]', ...args) } catch {}
  }
}

/** 간단한 메모리 캐시 (프로세스 생명주기 동안 유효) */
let cachedToken: { token: string; expiresAt: number } | null = null

/** 만료 60초 전이면 갱신 */
const isExpiringSoon = (expiresAt: number) => Date.now() > expiresAt - 60_000

const getBasicAuth = (): string => {
  if (!SABRE_CLIENT_ID || !SABRE_CLIENT_SECRET) {
    throw new Error('Sabre env vars missing. Check SABRE_CLIENT_ID / SABRE_CLIENT_SECRET')
  }
  return Buffer.from(`${SABRE_CLIENT_ID}:${SABRE_CLIENT_SECRET}`).toString('base64')
}

async function issueToken(): Promise<SabreTokenResponse> {
  const url = `${SABRE_BASE_URL}${SABRE_AUTH_PATH}`
  debugLog('issueToken → url:', url)
  // 원문 요청: your_sabre_client_id_here / your_sabre_client_secret_here 출력 지원
  const isPlaceholderId = SABRE_CLIENT_ID === 'your_sabre_client_id_here'
  const isPlaceholderSecret = SABRE_CLIENT_SECRET === 'your_sabre_client_secret_here'
  if (SABRE_DEBUG_PLAINTEXT) {
    try {
      console.log('[SABRE_DEBUG] clientId_raw:', SABRE_CLIENT_ID)
      console.log('[SABRE_DEBUG] clientSecret_raw:', SABRE_CLIENT_SECRET)
    } catch {}
  } else {
    debugLog('issueToken → clientId(masked):', mask(SABRE_CLIENT_ID), 'placeholder?', isPlaceholderId)
    debugLog('issueToken → clientSecret(masked):', mask(SABRE_CLIENT_SECRET), 'placeholder?', isPlaceholderSecret)
  }
  debugLog('issueToken → headers: Authorization=Basic <masked>, Content-Type=application/x-www-form-urlencoded, grant_type=client_credentials')
  // Align with sample: try header grant first; fallback to body when allowed
  let res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Basic ${getBasicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      // sample requires grant_type in header
      grant_type: 'client_credentials',
    } as Record<string, string>,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    debugLog('issueToken(header grant) ← error:', res.status, res.statusText, text.slice(0, 256))
    if (!SABRE_GRANT_HEADER_ONLY) {
      // fallback to body grant
      debugLog('issueToken(body grant) → retry')
      res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Basic ${getBasicAuth()}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      })
      if (!res.ok) {
        const text2 = await res.text().catch(() => '')
        debugLog('issueToken(body grant) ← error:', res.status, res.statusText, text2.slice(0, 256))
        throw new Error(`Sabre token request failed: ${res.status} ${res.statusText} ${text2 || text}`)
      }
    } else {
      throw new Error(`Sabre token request failed: ${res.status} ${res.statusText} ${text}`)
    }
  }

  const data = (await res.json()) as SabreTokenResponse
  debugLog('issueToken ← ok: token_preview=', mask(data.access_token), 'expires_in=', data.expires_in)
  if (!data.access_token || data.token_type !== 'Bearer') {
    throw new Error('Invalid Sabre token response')
  }
  return data
}

export async function getSabreToken(): Promise<string> {
  if (cachedToken && !isExpiringSoon(cachedToken.expiresAt)) {
    return cachedToken.token
  }
  const tokenResp = await issueToken()
  cachedToken = {
    token: tokenResp.access_token,
    expiresAt: Date.now() + tokenResp.expires_in * 1000,
  }
  debugLog('getSabreToken → cached until:', new Date(cachedToken.expiresAt).toISOString())
  return cachedToken.token
}

export async function sabreFetch<T = unknown>(
  path: string,
  init?: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }
): Promise<T> {
  const token = await getSabreToken()
  if (!SABRE_BASE_URL) {
    throw new Error('Sabre env vars missing. Check SABRE_BASE_URL')
  }
  const method = (init?.method || 'GET').toUpperCase()
  debugLog('sabreFetch →', method, path)
  if (init?.headers) debugLog('sabreFetch → extra headers:', Object.keys(init.headers))
  const res = await fetch(`${SABRE_BASE_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  debugLog('sabreFetch ← status:', res.status, res.statusText)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    debugLog('sabreFetch ← error body:', text.slice(0, 512))
    throw new Error(`Sabre fetch failed: ${res.status} ${res.statusText} ${text}`)
  }
  const json = (await res.json()) as T
  debugLog('sabreFetch ← ok (json preview):', typeof json === 'string' ? (json as unknown as string).slice(0, 256) : '[object]')
  return json
}


