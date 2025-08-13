'use client'

import React from 'react'
import { Sidebar } from './sidebar'
import { cn } from '@/lib/utils'

export interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  // Sidebar 숨김 경로 (예: 공개 랜딩 등)이 필요하면 사용
  // 현재는 항상 표시
  return (
    <div className={cn('min-h-screen bg-background text-foreground flex')}>
      <Sidebar />
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 border-b bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/50">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Select Admin</div>
              <div className="text-xs text-muted-foreground">v0.1.0</div>
            </div>
          </div>
        </header>
        <main className="px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}


