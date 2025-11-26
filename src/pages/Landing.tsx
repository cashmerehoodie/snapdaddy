import { Button } from "@/components/ui/button";
import { Receipt, Sparkles, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-primary-light/20">
        <div className="animate-pulse flex items-center gap-3">
          <Receipt className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-primary-light/20">
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
            <Receipt className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            SnapDaddy
          </h1>
        </div>
        {user ? (
          <Button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="border-primary/50 hover:bg-primary/10"
          >
            Sign In
          </Button>
        )}
      </header>

      <main className="container mx-auto px-4 py-20">
        <section className="max-w-4xl mx-auto text-center space-y-8 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Receipt Tracking</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            Never lose a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              receipt
            </span>{" "}
            again
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Snap a photo, let AI do the rest. SnapDaddy automatically organizes your receipts,
            tracks expenses, and prepares you for tax season.
          </p>

          {!user && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg px-8 shadow-lg"
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10 text-lg px-8"
                >
                  Learn More
                </Button>
              </div>

              <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">AI-Powered Scanning</h3>
                  <p className="text-muted-foreground">
                    Our AI automatically reads and extracts information from your receipts with incredible accuracy.
                  </p>
                </div>

                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Smart Organization</h3>
                  <p className="text-muted-foreground">
                    Track monthly and yearly expenses effortlessly. Perfect for tax deductions and budgeting.
                  </p>
                </div>

                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Secure & Private</h3>
                  <p className="text-muted-foreground">
                    Your financial data is encrypted and secure. Only you have access to your receipts.
                  </p>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Landing;
