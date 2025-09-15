'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/contexts/AuthContext'

// 동적으로 Devtools를 로드하는 컴포넌트
function Devtools() {
  const [Devtools, setDevtools] = React.useState<React.ComponentType<unknown> | null>(null)

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@tanstack/react-query-devtools').then((d) => {
        setDevtools(() => d.ReactQueryDevtools)
      }).catch(() => {
        // Devtools 로드 실패 시 무시
      })
    }
  }, [])

  if (!Devtools) return null

  return <Devtools initialIsOpen={false} buttonPosition="bottom-right" />
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        {children}
      </AuthProvider>
      <Devtools />
    </QueryClientProvider>
  )
}


