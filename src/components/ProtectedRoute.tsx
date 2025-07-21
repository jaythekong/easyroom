
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

// This component is now simplified since OrganizationLayout handles all auth
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return <>{children}</>;
};

export default ProtectedRoute;
