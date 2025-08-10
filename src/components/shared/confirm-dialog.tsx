'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  message: string
  onClose: () => void
  onConfirm?: () => void
  confirmText?: string
}

export function ConfirmDialog({ open, message, onClose, onConfirm, confirmText = 'OK' }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-xl">
        <div className="text-sm text-center">{message}</div>
        <div className="mt-4 flex justify-center">
          <Button type="button" onClick={() => { onConfirm?.(); onClose(); }}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}


