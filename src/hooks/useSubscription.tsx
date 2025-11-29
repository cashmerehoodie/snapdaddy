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
  checkedForUserId: string | null;
}

export const useSubscription = (user: User | null) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_status: "inactive",
    loading: true,
    checkedForUserId: null,
  });

  // Compute actual loading state - we're loading if status.loading is true
  // OR if we have a user but haven't checked for THIS user yet
  const isActuallyLoading = status.loading || (user?.id != null && status.checkedForUserId !== user.id);

  const checkSubscription = async () => {
    console.log("[useSubscription] checkSubscription called", { userId: user?.id });
    
    if (!user) {
      console.log("[useSubscription] No user, marking as not subscribed");
      setStatus({
        subscribed: false,
        subscription_status: "inactive",
        loading: false,
        checkedForUserId: null,
      });
      return;
    }

    // When we do have a user, always go into a loading state before checks
    setStatus((prev) => ({ ...prev, loading: true }));
    console.log("[useSubscription] Starting subscription check for user:", user.id);

    const fallbackFromProfile = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("has_free_access, subscription_status")
          .eq("user_id", user.id)
          .single();

        console.log("useSubscription: fallback profile response:", {
          profile,
          profileError,
        });

        if (profileError || !profile) {
          setStatus({
            subscribed: false,
            subscription_status: "inactive",
            loading: false,
            checkedForUserId: user.id,
          });
          return;
        }

        const isSubscribed =
          profile.has_free_access ||
          ["active", "trialing"].includes(profile.subscription_status || "");

        setStatus({
          subscribed: !!isSubscribed,
          subscription_status: profile.subscription_status || "inactive",
          has_free_access: !!profile.has_free_access,
          loading: false,
          checkedForUserId: user.id,
        });
      } catch (profileErr) {
        console.error("Error in fallback profile check:", profileErr);
        setStatus({
          subscribed: false,
          subscription_status: "inactive",
          loading: false,
          checkedForUserId: user.id,
        });
      }
    };

    try {
      console.log("[useSubscription] Attempting edge function check...");
      
      // Reduce timeout to 3s for faster fallback on mobile
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.log("[useSubscription] Edge function timeout after 3s");
          reject(new Error('Subscription check timeout'));
        }, 3000)
      );
      
      const checkPromise = supabase.functions.invoke("check-subscription");
      
      const { data, error } = await Promise.race([checkPromise, timeoutPromise]) as any;

      console.log("[useSubscription] Edge function response:", { data, error });

      if (error || !data) {
        console.error("[useSubscription] Error or no data, using fallback:", error);
        await fallbackFromProfile();
        return;
      }

      console.log("[useSubscription] Success! Setting status:", { ...data });
      setStatus({
        ...data,
        loading: false,
        checkedForUserId: user.id,
      });
    } catch (error) {
      console.error("[useSubscription] Exception caught, using fallback:", error);
      await fallbackFromProfile();
    }
  };
  useEffect(() => {
    checkSubscription();
  }, [user?.id]); // Only re-check when user ID changes, not the whole user object

  return { ...status, loading: isActuallyLoading, refresh: checkSubscription };
};
