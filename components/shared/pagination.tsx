'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize: number
}

export function Pagination({ currentPage, totalItems, pageSize }: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const createPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    return `${pathname}?${params.toString()}`
  }

  const visiblePages = () => {
    const pages: number[] = []
    const maxButtons = 7
    const half = Math.floor(maxButtons / 2)
    let start = Math.max(1, currentPage - half)
    let end = Math.min(totalPages, start + maxButtons - 1)
    start = Math.max(1, end - maxButtons + 1)
    for (let p = start; p <= end; p += 1) pages.push(p)
    return pages
  }

  return (
    <nav className="flex items-center justify-between gap-2" aria-label="Pagination">
      <div className="text-xs text-muted-foreground">
        총 {totalItems.toLocaleString()}개 · {currentPage}/{totalPages} 페이지
      </div>
      <div className="flex items-center gap-1">
        <Link
          href={createPageHref(Math.max(1, currentPage - 1))}
          className={cn(
            'px-2 py-1 rounded border text-sm',
            currentPage === 1 ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
          )}
          aria-disabled={currentPage === 1}
        >
          이전
        </Link>
        {visiblePages().map((p) => (
          <Link
            key={p}
            href={createPageHref(p)}
            className={cn(
              'px-3 py-1 rounded border text-sm',
              p === currentPage ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
            )}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        ))}
        <Link
          href={createPageHref(Math.min(totalPages, currentPage + 1))}
          className={cn(
            'px-2 py-1 rounded border text-sm',
            currentPage === totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
          )}
          aria-disabled={currentPage === totalPages}
        >
          다음
        </Link>
      </div>
    </nav>
  )
}

