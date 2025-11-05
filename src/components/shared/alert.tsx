'use client'

import React from 'react'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  variant: AlertVariant
  message: string
  onClose?: () => void
  className?: string
  icon?: boolean
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const variantIcons: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Alert({ 
  variant, 
  message, 
  onClose, 
  className,
  icon = true 
}: AlertProps) {
  const Icon = variantIcons[variant]
  
  return (
    <div 
      className={cn(
        'rounded-lg border p-4',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// 상태 인디케이터 (작은 점)
interface StatusIndicatorProps {
  variant: AlertVariant
  className?: string
}

export function StatusIndicator({ variant, className }: StatusIndicatorProps) {
  const colorClasses: Record<AlertVariant, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  
  return (
    <div className={cn('w-2 h-2 rounded-full', colorClasses[variant], className)} />
  )
}

