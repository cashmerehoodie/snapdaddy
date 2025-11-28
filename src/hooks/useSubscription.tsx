import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_status: string;
  has_free_access?: boolean;
  subscription_end?: string;
  trial_end?: string;
  loading: boolean;
}

export const useSubscription = (user: User | null) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_status: "inactive",
    loading: true,
  });

  const checkSubscription = async () => {
    if (!user) {
      setStatus({
        subscribed: false,
        subscription_status: "inactive",
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      if (error) {
        console.error("Error checking subscription:", error);
        setStatus({
          subscribed: false,
          subscription_status: "inactive",
          loading: false,
        });
        return;
      }

      setStatus({
        ...data,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setStatus({
        subscribed: false,
        subscription_status: "inactive",
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkSubscription();

    // Check every 60 seconds
    const interval = setInterval(checkSubscription, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return { ...status, refresh: checkSubscription };
};
