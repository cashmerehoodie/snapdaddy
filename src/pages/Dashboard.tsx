import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, LogOut, Upload, UserCircle } from "lucide-react";
import { toast } from "sonner";
import ReceiptUpload from "@/components/ReceiptUpload";
import MonthlyView from "@/components/MonthlyView";
import YearlyView from "@/components/YearlyView";
import GoogleSettings from "@/components/GoogleSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem("currency") || "USD";
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    localStorage.setItem("currency", value);
    toast.success(`Currency changed to ${value}`);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-primary-light/10">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
              <Receipt className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SnapDaddy
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="GBP">£ GBP</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="JPY">¥ JPY</SelectItem>
                <SelectItem value="AUD">A$ AUD</SelectItem>
                <SelectItem value="CAD">C$ CAD</SelectItem>
              </SelectContent>
            </Select>

            <GoogleSettings userId={user.id} />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2"
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
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <ReceiptUpload userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyView userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>

          <TabsContent value="yearly">
            <YearlyView userId={user.id} currencySymbol={getCurrencySymbol(currency)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
