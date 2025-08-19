'use client'

import { HotelImageManager } from './_components/HotelImageManager'
import { AuthGuard } from '@/components/shared/auth-guard'

export default function AdminHotelImagesPage() {
  return (
    <AuthGuard requiredRole="admin">
      <HotelImageManager />
    </AuthGuard>
  )
}
