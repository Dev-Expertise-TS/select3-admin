'use client'

import React from 'react'
import { Inbox, Search, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <Icon className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-md mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// 검색 결과 없음
export function NoSearchResults({ searchTerm, onClear }: { searchTerm: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="검색 결과가 없습니다"
      description={`"${searchTerm}"에 대한 검색 결과를 찾을 수 없습니다.`}
      action={onClear ? { label: '검색 초기화', onClick: onClear } : undefined}
    />
  )
}

// 에러 상태
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="오류가 발생했습니다"
      description={message}
      action={onRetry ? { label: '다시 시도', onClick: onRetry } : undefined}
    />
  )
}

