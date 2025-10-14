import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중에는 TypeScript 및 ESLint 에러를 무시 (나중에 수정 예정)
  typescript: {
    // ⚠️ 주의: 프로덕션 빌드 시에도 타입 에러를 무시합니다
    // 타입 에러를 수정한 후에는 이 설정을 제거하세요
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ 주의: 프로덕션 빌드 시에도 ESLint 에러를 무시합니다
    // ESLint 에러를 수정한 후에는 이 설정을 제거하세요
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
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
