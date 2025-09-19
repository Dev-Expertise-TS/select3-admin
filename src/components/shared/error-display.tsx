// ============================================================================
// 에러 표시 컴포넌트
// ============================================================================

import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  error: string | null
  onDismiss?: () => void
  className?: string
  variant?: 'default' | 'destructive' | 'warning'
}

const variantClasses = {
  default: 'bg-red-50 border-red-200 text-red-800',
  destructive: 'bg-red-100 border-red-300 text-red-900',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
}

export function ErrorDisplay({ 
  error, 
  onDismiss, 
  className, 
  variant = 'default' 
}: ErrorDisplayProps) {
  if (!error) return null

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border p-3 text-sm',
      variantClasses[variant],
      className
    )}>
      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        {error}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-red-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

interface SuccessDisplayProps {
  message: string | null
  onDismiss?: () => void
  className?: string
}

export function SuccessDisplay({ message, onDismiss, className }: SuccessDisplayProps) {
  if (!message) return null

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800',
      className
    )}>
      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
      <div className="flex-1">
        {message}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-green-100"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
