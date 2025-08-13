'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'

interface AppRootProps {
  children: React.ReactNode
}

export function AppRoot({ children }: AppRootProps) {
  const pathname = usePathname()
  const hideShell = pathname === '/login' || pathname.startsWith('/auth')

  if (hideShell) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}


