'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ComponentType } from 'react'
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
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon?: ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
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
    items: [
      { label: 'Sabre Hotel Code 관리', href: '/admin/sabre-id', icon: Building },
      { label: 'Sabre API 요금 코드 관리', href: '/admin/hotel-search', icon: DollarSign },
      { label: '호텔 정보 업데이트', href: '/admin/hotel-update', icon: Pencil },
      { label: '혜택 관리', href: '/admin/benefits/manage', icon: ListChecks },
          { label: '체인 브랜드 관리', href: '/admin/chain-brand', icon: Network },
    ],
  },
  {
    title: 'Development',
    items: [
      { label: 'Sabre API Spec.', href: '/development/sabre-api', icon: Code },
      { label: '연결 테스트', href: '/test-connection', icon: GitBranch },
      { label: 'Select Hotel DB', href: '/test-connection/hotel', icon: Database },
      { label: 'API Endpoint Test', href: '/test-connection/hotel-search', icon: Search },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 shrink-0 border-r bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
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
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              {section.title}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <li key={item.href}>
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
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}

