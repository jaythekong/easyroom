import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminCheck } from "@/hooks/useSuperAdmin";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { AccessDenied } from "./AccessDenied";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export function SuperAdminGuard({ children }: SuperAdminGuardProps) {
  const { isSuperAdmin, user, loading } = useSuperAdminCheck();
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and no user, redirect to login
    if (!loading && !user) {
      navigate('/auth?redirectTo=/super-admin');
      return;
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <LoadingSkeleton type="stats" />;
  }

  if (!user) {
    return <LoadingSkeleton type="stats" />; // Will redirect via useEffect
  }

  if (!isSuperAdmin) {
    return <AccessDenied orgSlug="super-admin" orgName="Super Admin Dashboard" />;
  }

  return <>{children}</>;
}