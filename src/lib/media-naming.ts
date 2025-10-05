/* eslint-disable no-useless-escape */

export type ImageFormat = 'jpg' | 'jpeg' | 'webp' | 'avif' | 'png';

/**
 * 전역 상수 (프로젝트 컨벤션)
 */
export const MEDIA_BUCKET = 'hotel-media' as const;
export const DIR_ORIGINALS = 'originals' as const;
export const DIR_PUBLIC = 'public' as const;

/**
 * 유틸: 정수 2자릿수 제로패딩 (01~99)
 */
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/**
 * 유틸: 포맷 정규화 (jpeg -> jpg 등)
 */
const normalizeFormat = (format: string): ImageFormat => {
  const f = format.toLowerCase();
  if (f === 'jpeg') return 'jpg';
  if (f === 'jpg' || f === 'webp' || f === 'avif' || f === 'png') return f as ImageFormat;
  // 기본 jpg
  return 'jpg';
};

/**
 * 유틸: 토큰 유효성 체크 (slug, id, role 등 ASCII/소문자/숫자/구분자만)
 */
const TOKEN_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/; // kebab/underscore 혼합 허용
const isValidToken = (s: string) => {
  // 빈 문자열이나 너무 짧은 경우는 유효하지 않음
  if (!s || s.length < 2) return false;
  // 기본 패턴 검사
  if (!TOKEN_RE.test(s)) return false;
  return true;
};

/**
 * 유틸: short hash 자르기 (7~12자 권장)
 */
const clipHash = (hash?: string, len = 8) => {
  if (!hash) return undefined;
  const h = hash.replace(/[^a-fA-F0-9]/g, '');
  return h.slice(0, len);
};

/**
 * 원본 파일명 규칙:
 *   {hotel_slug}_{sabreId}_{seq}.{ext}
 * 예) capella-bangkok_987654_01.jpg
 */
export type OriginalNameParams = {
  hotelSlug: string;          // 예: 'capella-bangkok'
  sabreId?: string;           // 예: '987654' (없으면 'na')
  seq?: number;               // 예: 1 -> '01'
  ext?: ImageFormat;          // 기본: 'jpg'
};

export const buildOriginalFilename = (p: OriginalNameParams): string => {
  const {
    hotelSlug,
    sabreId = 'na',
    seq = 1,
    ext = 'jpg',
  } = p;

  if (!isValidToken(hotelSlug)) throw new Error(`Invalid hotelSlug: ${hotelSlug}`);
  if (!isValidToken(sabreId)) throw new Error(`Invalid sabreId: ${sabreId}`);

  const seqToken = pad2(seq);
  const extNorm = normalizeFormat(ext);

  return `${hotelSlug}_${sabreId}_${seqToken}.${extNorm}`;
};

/**
 * 공개 파생본 파일명 규칙:
 *   {hotel_slug}_{sabreId}_{seq}_{width}w.{ext}
 * 예) capella-bangkok_987654_01_1600w.avif
 */
export type PublicNameParams = {
  hotelSlug: string;
  sabreId?: string;
  seq?: number;
  width: number;              // 파생 가로폭(px)
  format?: ImageFormat;       // 'avif'|'webp'|'jpg' 등 (파일 확장자와 동일)
};

export const buildPublicFilename = (p: PublicNameParams): string => {
  const {
    hotelSlug,
    sabreId = 'na',
    seq = 1,
    width,
    format = 'avif',
  } = p;

  if (!isValidToken(hotelSlug)) throw new Error(`Invalid hotelSlug: ${hotelSlug}`);
  if (!isValidToken(sabreId)) throw new Error(`Invalid sabreId: ${sabreId}`);
  if (!(width > 0)) throw new Error(`width must be > 0`);
  const ext = normalizeFormat(format);

  const seqToken = pad2(seq);

  return `${hotelSlug}_${sabreId}_${seqToken}_${width}w.${ext}`;
};

/**
 * 경로 빌더
 * originals:  hotel-media/originals/{hotel_slug}/{filename}
 * public:     hotel-media/public/{hotel_slug}/{filename}
 */
export const buildOriginalPath = (hotelSlug: string, filename: string) => {
  if (!isValidToken(hotelSlug)) throw new Error(`Invalid hotelSlug: ${hotelSlug}`);
  return `${DIR_ORIGINALS}/${hotelSlug}/${filename}`;
};

export const buildPublicPath = (hotelSlug: string, filename: string) => {
  if (!isValidToken(hotelSlug)) throw new Error(`Invalid hotelSlug: ${hotelSlug}`);
  return `${DIR_PUBLIC}/${hotelSlug}/${filename}`;
};

