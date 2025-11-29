import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Receipt, Upload, BarChart2, Calendar, LogOut, FolderSync } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReceiptUpload from "@/components/ReceiptUpload";
import MonthlyView from "@/components/MonthlyView";
import YearlyView from "@/components/YearlyView";
import CategoryView from "@/components/CategoryView";
import DashboardGreeting from "@/components/DashboardGreeting";
import Onboarding from "@/components/Onboarding";
import GoogleSettings from "@/components/GoogleSettings";
import MigrateData from "@/components/MigrateData";

const Dashboard = () => {
  console.log("[Dashboard] Component mounting");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currency] = useState(() => {
    return localStorage.getItem("currency") || "USD";
  });

  useEffect(() => {
    console.log("[Dashboard] User effect triggered:", !!user);
    if (user) {
      fetchProfileAvatar(user.id);
    }
  }, [user]);

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
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error("Sign out error:", error);
      }
      
      try {
        localStorage.removeItem("sb-nxcvnyssknbafcjyowrh-auth-token");
      } catch (storageError) {
        console.warn("Could not clear local auth token:", storageError);
      }
      
      toast.success("Signed out successfully");
      
      setTimeout(() => {
        window.location.href = "/auth";
      }, 300);
    } catch (error: any) {
      console.error("Sign out catch error:", error);
      try {
        localStorage.removeItem("sb-nxcvnyssknbafcjyowrh-auth-token");
      } catch {}
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

  console.log("[Dashboard] Rendering - authLoading:", authLoading, "user:", !!user);

  // Show loading skeleton while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-primary-light/10">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="w-24 h-6" />
            </div>
            <Skeleton className="w-20 h-10 rounded" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-32 mb-6 rounded-lg" />
          <Skeleton className="w-full h-96 rounded-lg" />
        </main>
      </div>
    );
  }

  if (!user) {
    console.log("[Dashboard] No user after loading - this shouldn't happen");
    return null;
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
              className="gap-2 hover:bg-accent transition-colors duration-300"
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
            <TabsTrigger value="upload" className="flex items-center gap-2 py-3">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2 py-3">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2 py-3">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="yearly" className="flex items-center gap-2 py-3">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Yearly</span>
            </TabsTrigger>
            <TabsTrigger value="migrate" className="flex items-center gap-2 py-3">
              <FolderSync className="w-4 h-4" />
              <span className="hidden sm:inline">Migrate</span>
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
