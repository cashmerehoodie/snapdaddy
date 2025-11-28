import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface DashboardGreetingProps {
  userId: string;
}

const DashboardGreeting = ({ userId }: DashboardGreetingProps) => {
  const [username, setUsername] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [motivationalMessage, setMotivationalMessage] = useState<string>("");

  useEffect(() => {
    fetchUsername();
    updateGreeting();
    
    // Update greeting every minute
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchUsername = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (data?.username) {
        setUsername(data.username);
      }
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = "";
    
    if (hour >= 5 && hour < 12) {
      timeGreeting = "Good morning";
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = "Good evening";
    } else {
      timeGreeting = "Good night";
    }
    
    setGreeting(timeGreeting);
    setMotivationalMessage(getRandomMessage());
  };

  const getRandomMessage = () => {
    const messages = [
      "Keep tracking those expenses! 💪",
      "You're doing great with your finances! 🌟",
      "Every receipt tracked is progress made! 📈",
      "Stay on top of your spending! 🎯",
      "Financial awareness starts here! 💡",
      "Your future self will thank you! 🚀",
      "Building better money habits! ⭐",
      "Smart spending, smarter saving! 💰",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <Card className="border-border/50 bg-gradient-to-br from-primary/5 via-accent/5 to-background shadow-lg animate-fade-in mb-6">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center flex-shrink-0 animate-scale-in shadow-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 animate-slide-up">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {greeting}, {username || "there"}!
              </span>
              <span className="text-3xl md:text-4xl">👋</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {motivationalMessage}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DashboardGreeting;
