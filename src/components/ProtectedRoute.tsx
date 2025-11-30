import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();

  const {
    subscribed,
    subscription_status,
    has_free_access,
    loading: subLoading,
    authError,
  } = useSubscription(user);

  const hasAccess =
    subscribed ||
    has_free_access ||
    ["active", "trialing"].includes(subscription_status || "");

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-primary-light/10">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            {authLoading ? "Checking authentication..." : "Checking subscription..."}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // If there's an auth error, redirect to auth page to force re-login
  if (authError) {
    console.log("[ProtectedRoute] Auth error detected, redirecting to /auth to force re-login");
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    console.log("[ProtectedRoute] No subscription, redirecting to /subscribe", {
      subscribed,
      subscription_status,
      has_free_access,
    });
    return <Navigate to="/subscribe" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
