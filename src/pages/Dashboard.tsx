import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, LogOut, Upload } from "lucide-react";
import { toast } from "sonner";
import ReceiptUpload from "@/components/ReceiptUpload";
import MonthlyView from "@/components/MonthlyView";
import YearlyView from "@/components/YearlyView";
import CategoryView from "@/components/CategoryView";
import MigrateData from "@/components/MigrateData";
import GoogleSettings from "@/components/GoogleSettings";
import Onboarding from "@/components/Onboarding";
import DashboardGreeting from "@/components/DashboardGreeting";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currency] = useState<string>(() => {
    return localStorage.getItem("currency") || "USD";
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      } else {
        // Fetch profile avatar
        fetchProfileAvatar(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfileAvatar = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out with global scope to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error("Sign out error:", error);
      }
      
      // Clear Supabase auth from localStorage explicitly (safety for preview/new tabs)
      try {
        localStorage.removeItem("sb-nxcvnyssknbafcjyowrh-auth-token");
      } catch (storageError) {
        console.warn("Could not clear local auth token:", storageError);
      }
      
      // Clear local React state
      setUser(null);
      setSession(null);
      
      toast.success("Signed out successfully");
      
      // Force a full page reload to clear all cached state
      setTimeout(() => {
        window.location.href = "/auth";
      }, 300);
    } catch (error: any) {
      console.error("Sign out catch error:", error);
      try {
        localStorage.removeItem("sb-nxcvnyssknbafcjyowrh-auth-token");
      } catch {}
      setUser(null);
      setSession(null);
      setTimeout(() => {
        window.location.href = "/auth";
      }, 300);
    }
  };
  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      GBP: "£",
      EUR: "€",
      JPY: "¥",
      AUD: "A$",
      CAD: "C$",
    };
    return symbols[curr] || "$";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <Receipt className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-3">
          <Receipt className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-primary-light/10">
      <Onboarding userId={user.id} />
      
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50 animate-slide-up">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md hover:rotate-12 transition-transform duration-300">
              <Receipt className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SnapDaddy
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <GoogleSettings userId={user.id} />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2 hover:scale-105 transition-all duration-300"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">Profile</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 hover:scale-105 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DashboardGreeting userId={user.id} />
        
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto bg-secondary/50 backdrop-blur-sm p-1 h-auto">
            <TabsTrigger value="upload" className="gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <span className="hidden sm:inline">Categories</span>
              <span className="sm:hidden">Cat.</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <span className="hidden sm:inline">Monthly</span>
              <span className="sm:hidden">Mon.</span>
            </TabsTrigger>
            <TabsTrigger value="yearly" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <span className="hidden sm:inline">Yearly</span>
              <span className="sm:hidden">Year</span>
            </TabsTrigger>
            <TabsTrigger value="migrate" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300">
              <span className="hidden sm:inline">Migrate</span>
              <span className="sm:hidden">Mig.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ReceiptUpload userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryView userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyView userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="yearly">
            <YearlyView userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="migrate">
            <MigrateData userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
