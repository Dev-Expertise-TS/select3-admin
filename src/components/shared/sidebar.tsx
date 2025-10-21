'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import {
  Home,
  Database,
  Network,
  Search,
  Pencil,
  ListChecks,
  GitBranch,
  DollarSign,
  Code,
  Building,
  ExternalLink,
  Image,
  Users,
  LogIn,
  LogOut,
  FileText,
  Newspaper,
  Shield,
  User,
  ArrowRightLeft,
  Globe,
  Star,
  Link as LinkIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon?: ComponentType<{ className?: string }>
  isExternal?: boolean
  requiredRole?: 'admin' | 'user'
}

interface NavSection {
  title: string
  items: NavItem[]
  requiredRole?: 'admin' | 'user'
}

const navSections: NavSection[] = [
  {
    title: 'General',
    items: [
      { label: '홈', href: '/', icon: Home },
    ],
  },
  {
    title: 'Admin',
    requiredRole: 'admin',
    items: [
      { label: '전체 호텔 보기', href: '/admin/hotels', icon: Database, requiredRole: 'admin' },
      { label: 'Sabre API 요금 코드 관리', href: '/admin/hotel-search', icon: DollarSign, requiredRole: 'admin' },
      { label: 'Sabre Hotel Code 확인', href: '/admin/sabre-id', icon: Building, requiredRole: 'admin' },
      { label: '호텔 정보 업데이트', href: '/admin/hotel-update', icon: Pencil, requiredRole: 'admin' },
      { label: '기본 혜택 관리', href: '/admin/benefits/manage', icon: ListChecks, requiredRole: 'admin' },
      { label: '프로모션 관리', href: '/admin/promotions', icon: DollarSign, requiredRole: 'admin' },
      { label: '광고 노출 관리', href: '/admin/advertisements', icon: DollarSign, requiredRole: 'admin' },
      { label: '체인 브랜드 관리', href: '/admin/chain-brand', icon: Network, requiredRole: 'admin' },
      { label: '지역 코드 맵핑 관리', href: '/admin/region-mapping', icon: Globe, requiredRole: 'admin' },
      { label: '호텔 이미지 관리', href: '/admin/hotel-images', icon: Image, requiredRole: 'admin' },
      { label: '호텔 콘텐츠 관리', href: '/admin/hotel-content', icon: FileText, requiredRole: 'admin' },
      { label: '호텔 아티클 관리', href: '/admin/hotel-articles', icon: Newspaper, requiredRole: 'admin' },
      { label: 'UTM 생성기', href: '/admin/utm-generator', icon: LinkIcon, requiredRole: 'admin' },
      { label: '맴버쉽 관리', href: '/admin/membership', icon: Users, requiredRole: 'admin' },
      { label: '관리자 관리', href: '/admin/users', icon: Users, requiredRole: 'admin' },
      { label: '데이터 마이그레이션', href: '/admin/data-migration', icon: ArrowRightLeft, requiredRole: 'admin' },
    ],
  },
  {
    title: '고객 만족도',
    requiredRole: 'admin',
    items: [
      { label: '고객 만족도 데이터 관리', href: '/admin/satisfaction-survey', icon: Star, requiredRole: 'admin' },
    ],
  },
  {
    title: 'Development',
    items: [
      { label: 'Sabre API Spec.', href: '/development/sabre-api', icon: Code },
      { label: '연결 테스트', href: '/test-connection', icon: GitBranch },
      { label: 'Select Hotel DB', href: '/test-connection/hotel', icon: Database },
      { label: 'API Endpoint Test', href: '/test-connection/hotel-search', icon: Search },
      { label: 'Sabre API 공식 문서', href: 'https://developer.sabre.com/product-catalog?f%5B0%5D=product_type%3Aapi_reference&category=Hotel', icon: ExternalLink, isExternal: true },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isUser = user?.role === 'user'

  return (
    <aside className="sticky top-0 left-0 w-64 shrink-0 border-r bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 h-screen">
      <div className="px-4 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">
            S
          </div>
          <div>
            <div className="text-sm font-semibold">Select Admin</div>
            <div className="text-xs text-muted-foreground">Next.js 15 + Supabase</div>
          </div>
        </Link>
      </div>

      <nav className="px-3 py-4 space-y-6 overflow-y-auto h-[calc(100vh-56px)]">
        {(isAdmin
            ? navSections
            : isUser
              ? navSections.filter((s) => s.title === 'Admin')
              : navSections.filter((s) => s.title !== 'Admin')
          ).map((section) => (
          <div key={section.title}>
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items
                .filter((item) => !item.requiredRole || user?.role === item.requiredRole || user?.role === 'user')
                .map((item) => {
                const isActive = !item.isExternal && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
                const Icon = item.icon
                
                return (
                  <li key={item.href}>
                    {item.isExternal ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                          'text-foreground hover:bg-muted/70'
                        )}
                      >
                        {Icon ? (
                          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        ) : null}
                        <span className="flex-1">{item.label}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/70'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {Icon ? (
                          <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                        ) : null}
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* 인증 상태 표시 및 로그인/로그아웃 버튼 */}
        <div className="border-t pt-4">
          <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Account
          </div>
          <ul className="space-y-1">
                             {user ? (
                   <>
                      <li className="px-2.5 py-3 text-sm text-muted-foreground">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {user.role === 'admin' ? (
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <Shield className="h-4 w-4 text-red-600" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <span className={cn(
                              'inline-block px-2 py-1 rounded-full text-[10px] font-medium',
                              user.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            )}>
                              {user.role === 'admin' ? '관리자' : '사용자'}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-gray-700 truncate max-w-[12rem] mx-auto">{user.email}</div>
                        </div>
                      </li>
                <li>
                  <button
                    onClick={logout}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors w-full',
                      'text-foreground hover:bg-muted/70'
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                    로그아웃
                  </button>
                </li>
              </>
            ) : (
                                 <li>
                     <Link
                       href="/login"
                       className={cn(
                         'group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                         'text-foreground hover:bg-muted/70'
                       )}
                     >
                       <LogIn className="h-4 w-4" />
                       로그인
                     </Link>
                   </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  )
}

