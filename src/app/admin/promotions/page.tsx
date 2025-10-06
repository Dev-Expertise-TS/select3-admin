import { PromotionManager } from "./_components/PromotionManager";
import { AuthGuard } from "@/components/shared/auth-guard";

export default function AdminPromotionsPage() {
  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-[60vh] p-6">
        <PromotionManager />
      </div>
    </AuthGuard>
  );
}