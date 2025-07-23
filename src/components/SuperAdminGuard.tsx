import { useSuperAdminCheck } from "@/hooks/useSuperAdmin";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { AccessDenied } from "./AccessDenied";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { isSuperAdmin, loading } = useSuperAdminCheck();

  if (loading) {
    return <LoadingSkeleton type="stats" />;
  }

  if (!isSuperAdmin) {
    return <AccessDenied orgSlug="super-admin" orgName="Super Admin Dashboard" />;
  }

  return <>{children}</>;
}