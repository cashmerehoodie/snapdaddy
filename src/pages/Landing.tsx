import { Button } from "@/components/ui/button";
import { Receipt, Sparkles, TrendingUp, Shield, ArrowRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-md"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="icon"
              className="border-primary/50 hover:bg-destructive/10 hover:border-destructive hover:scale-105 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            className="border-primary/50 hover:bg-primary/10 hover:scale-105 transition-all duration-300"
          >
            Sign In
          </Button>
        )}
      </header>

      <main className="container mx-auto px-4 py-20">
        <section className="max-w-4xl mx-auto text-center space-y-8 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">AI-Powered Receipt Tracking</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Never lose a{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              receipt
            </span>{" "}
            again
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Snap a photo, let AI do the rest. SnapDaddy automatically organizes your receipts,
            tracks expenses, and prepares you for tax season.
          </p>

          {user && (
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-12">
              <div className="p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in" style={{ animationDelay: '0.3s' }} onClick={() => navigate("/dashboard")}>
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center animate-float">
                  <Receipt className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Upload Receipts</h3>
                <p className="text-sm text-muted-foreground">
                  Quickly capture and process receipts with our AI-powered scanner
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in" style={{ animationDelay: '0.4s' }} onClick={() => navigate("/dashboard")}>
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center animate-float" style={{ animationDelay: '0.5s' }}>
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Track Expenses</h3>
                <p className="text-sm text-muted-foreground">
                  View monthly and yearly breakdowns of all your spending
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-fade-in" style={{ animationDelay: '0.5s' }} onClick={() => navigate("/dashboard")}>
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center animate-float" style={{ animationDelay: '1s' }}>
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Secure Sync</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-sync to Google Drive and Sheets for backup and analysis
                </p>
              </div>
            </div>
          )}

          {!user && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-105 transition-all duration-300 text-lg px-8 shadow-lg"
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10 hover:scale-105 transition-all duration-300 text-lg px-8"
                >
                  Learn More
                </Button>
              </div>

              <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center transition-transform duration-300 hover:rotate-12">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">AI-Powered Scanning</h3>
                  <p className="text-muted-foreground">
                    Our AI automatically reads and extracts information from your receipts with incredible accuracy.
                  </p>
                </div>

                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center transition-transform duration-300 hover:rotate-12">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Smart Organization</h3>
                  <p className="text-muted-foreground">
                    Track monthly and yearly expenses effortlessly. Perfect for tax deductions and budgeting.
                  </p>
                </div>

                <div className="text-center space-y-4 p-6 rounded-2xl bg-card border border-border/50 hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center transition-transform duration-300 hover:rotate-12">
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

      <footer className="container mx-auto px-4 py-8 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate("/privacy")}
            className="hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="hidden sm:inline">•</span>
          <button 
            onClick={() => navigate("/terms")}
            className="hover:text-primary transition-colors underline-offset-4 hover:underline"
          >
            Terms of Service
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
