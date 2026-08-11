import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserTabPermissions } from "@/hooks/useUserTabPermissions";

interface TabPermissionRouteProps {
  tabKey: string;
  children: React.ReactNode;
}

/**
 * Allows admins, superadmins, or users explicitly granted the given tab permission.
 */
const TabPermissionRoute = ({ tabKey, children }: TabPermissionRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { canAccessTab, loading: permLoading } = useUserTabPermissions();
  const location = useLocation();

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccessTab(tabKey)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default TabPermissionRoute;
