'use client'

import { HotelUpdateManager } from './_components/HotelUpdateManager'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function AdminHotelUpdatePage() {
  return (
    <AuthGuard requiredRole="admin">
      <HotelUpdateManager />
    </AuthGuard>
  )
}

