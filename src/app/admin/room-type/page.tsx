import { RoomUrlManager } from "./_components/RoomUrlManager"
import { AuthGuard } from "@/components/shared/auth-guard"

export default function RoomUrlPage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh] p-6">
        <RoomUrlManager />
      </div>
    </AuthGuard>
  )
}

