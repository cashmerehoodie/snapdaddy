import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    console.log("[AuthContext] Signing out...");
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[AuthContext] Sign out error (will clear local state anyway):", error);
    } finally {
      // Always clear local state regardless of API response
      setSession(null);
      setUser(null);
      // Force clear localStorage as backup
      localStorage.removeItem('supabase.auth.token');
      console.log("[AuthContext] Local auth state cleared");
    }
  };

  useEffect(() => {
    console.log("[AuthContext] Initializing auth context");

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AuthContext] Auth state change:", event, !!session?.user);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session and VALIDATE it
    const validateSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[AuthContext] Initial session check:", !!session?.user);
        
        if (session) {
          // CRITICAL: Validate the session is actually valid on the server
          const { data: { user }, error } = await supabase.auth.getUser();
          console.log("[AuthContext] Session validation:", { hasUser: !!user, error: error?.message });
          
          if (error || !user) {
            // Session is STALE - clear it
            console.log("[AuthContext] Stale session detected, clearing...");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(user);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error("[AuthContext] Session validation error:", error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();

    // Timeout fallback - if auth takes too long, stop loading
    const timeout = setTimeout(() => {
      console.log("[AuthContext] Auth timeout - forcing loaded state");
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
