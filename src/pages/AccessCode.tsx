import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

const AccessCode = () => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { subscribed, has_free_access, loading, refresh } = useSubscription(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Redirect to dashboard if user already has access
  useEffect(() => {
    if (!loading && (subscribed || has_free_access)) {
      navigate("/dashboard");
    }
  }, [loading, subscribed, has_free_access, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Please enter an access code");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("verify-access-code", {
        body: { code: code.trim() },
      });

      if (error) throw error;

      if (data.valid) {
        toast.success(data.message);
        // Refresh subscription status and redirect
        await refresh();
        navigate("/dashboard", { replace: true });
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Failed to verify access code");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking subscription status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">VIP Access Code</CardTitle>
          <CardDescription>
            Enter your exclusive access code to unlock full features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter access code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-wider font-mono"
                maxLength={20}
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/subscribe")}
                className="text-sm"
              >
                Don't have a code? Subscribe instead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessCode;
