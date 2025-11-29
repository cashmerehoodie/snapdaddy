import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [maxWaitReached, setMaxWaitReached] = useState(false);
  const { subscribed, loading: subLoading, subscription_status, has_free_access } = useSubscription(user);

  useEffect(() => {
    console.log("[ProtectedRoute] Initializing auth check");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[ProtectedRoute] Session check complete:", !!session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ProtectedRoute] Auth state change:", event, !!session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safety timeout - if subscription check takes more than 8 seconds, bypass it
  useEffect(() => {
    if (!authLoading && user && subLoading) {
      console.log("[ProtectedRoute] Starting 8s safety timer");
      const timer = setTimeout(() => {
        console.warn("[ProtectedRoute] Max wait time reached, bypassing subscription check");
        setMaxWaitReached(true);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, subLoading]);

  if (authLoading || (subLoading && !maxWaitReached)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-primary-light/10">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">
            {authLoading ? "Checking authentication..." : "Verifying subscription..."}
          </p>
          {subLoading && !authLoading && (
            <p className="text-xs text-muted-foreground">
              Taking longer than usual...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // If max wait reached, allow access and let them see subscribe page if needed
  const hasAccess =
    subscribed ||
    has_free_access ||
    ['active', 'trialing'].includes(subscription_status || '');

  console.log("[ProtectedRoute] Access check:", {
    subscribed,
    subscription_status,
    has_free_access,
    subLoading,
    maxWaitReached,
    hasAccess,
  });

  if (!hasAccess) {
    console.log("[ProtectedRoute] No subscription, redirecting to /subscribe");
    return <Navigate to="/subscribe" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
