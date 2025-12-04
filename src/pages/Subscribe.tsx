import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Check, Loader2, Crown, Sparkles, CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";

const Subscribe = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subscribed, loading: subLoading, refresh } = useSubscription(user);
  
  const checkoutSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (checkoutSuccess && user) {
      // Give webhook/Stripe a moment to process, then check subscription
      const timer = setTimeout(() => {
        refresh();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [checkoutSuccess, user, refresh]);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please log in first");
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error(error.message || "Failed to start checkout");
      setIsLoading(false);
    }
  };

  const features = [
    "Full access to all features",
    "Upload and organize unlimited receipts",
    "Advanced analytics and reporting",
    "Category management",
    "Monthly and yearly views",
    "Priority support",
  ];

  if (subLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/10">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Checking your subscription...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // If user is already subscribed, show them a different view
  if (!subLoading && subscribed) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/10">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-border/50 shadow-lg">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">You're All Set!</CardTitle>
              <CardDescription className="text-base mt-2">
                You already have an active subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => navigate("/dashboard")}
                className="w-full h-12"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-accent/10">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-border/50 shadow-lg">
          {checkoutSuccess && (
            <Alert className="m-6 mb-0 border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Payment successful! Verifying your subscription...
              </AlertDescription>
            </Alert>
          )}
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
              <Crown className="w-10 h-10 text-primary-foreground" />
              <Sparkles className="w-4 h-4 text-yellow-300 absolute top-2 right-2 animate-pulse" />
            </div>
            <CardTitle className="text-3xl">Premium Subscription</CardTitle>
            <CardDescription className="text-lg mt-2">
              Get full access with a 14-day free trial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                £5<span className="text-xl">/month</span>
              </div>
              <p className="text-muted-foreground mt-2">
                Start your 14-day free trial today
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Cancel anytime • No commitment
              </p>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-center">What you'll get:</p>
              <div className="grid gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubscribe}
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading checkout...
                </>
              ) : (
                <>
                  Start Free Trial
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/access-code")}
                className="text-sm"
              >
                Have a VIP access code?
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By subscribing, you agree to automatic renewal. Your card will be charged after the 14-day trial unless you cancel.
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Subscribe;
