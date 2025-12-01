import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription(user);

  // Show loading while checking authentication or subscription
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-primary-light/10">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            {authLoading ? "Checking authentication..." : "Verifying subscription..."}
          </p>
        </div>
      </div>
    );
  }

  // Check authentication first
  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Then check subscription status
  if (!subscribed) {
    console.log("[ProtectedRoute] User not subscribed, redirecting to /subscribe");
    return <Navigate to="/subscribe" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
