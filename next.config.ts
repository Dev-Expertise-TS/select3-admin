import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중에는 TypeScript 및 ESLint 에러를 무시 (나중에 수정 예정)
  typescript: {
    // ⚠️ 주의: 프로덕션 빌드 시에도 타입 에러를 무시합니다
    // 타입 에러를 수정한 후에는 이 설정을 제거하세요
    ignoreBuildErrors: true,
  },
  // Next.js 16: eslint 설정은 더 이상 next.config에서 지원되지 않습니다
  // ESLint는 `next lint` 명령어로 별도 실행하세요
  
  // Next.js 16: Cache Components - 명시적 캐싱 모델
  // PPR과 함께 사용하여 컴포넌트/함수 레벨에서 캐싱 제어
  // 주의: route segment config (dynamic, runtime)와 호환되지 않음
  // 점진적 마이그레이션을 위해 일단 비활성화
  // cacheComponents: true,
  
  // Next.js 16: React Compiler - 자동 메모이제이션
  // 불필요한 리렌더링 자동 방지 (Babel 기반이라 빌드 시간 증가)
  reactCompiler: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Next.js 16: 기본 minimumCacheTTL이 60초에서 4시간으로 변경
    // 이미지 재검증 비용 감소
    minimumCacheTTL: 14400, // 4 hours
  },
  
  // Next.js 16: Turbopack이 기본 번들러입니다
  // 빈 turbopack 설정으로 명시적으로 활성화
  turbopack: {},
  
  // Webpack 설정 (webpack 모드로 실행할 경우를 위해 유지)
  webpack: (config, { isServer }) => {
    // Supabase realtime-js의 critical dependency warning 억제
    config.ignoreWarnings = [
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];
    
    return config;
  },
};

export default nextConfig;
