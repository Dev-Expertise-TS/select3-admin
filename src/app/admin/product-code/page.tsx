import { ProductCodeManager } from "./_components/ProductCodeManager"
import { AuthGuard } from "@/components/shared/auth-guard"

export default function ProductCodePage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh] p-6">
        <ProductCodeManager />
      </div>
    </AuthGuard>
  )
}
