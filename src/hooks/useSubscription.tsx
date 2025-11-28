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

    // When we do have a user, always go into a loading state before checks
    setStatus((prev) => ({ ...prev, loading: true }));

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
        });
      } catch (profileErr) {
        console.error("Error in fallback profile check:", profileErr);
        setStatus({
          subscribed: false,
          subscription_status: "inactive",
          loading: false,
        });
      }
    };

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");

      console.log("useSubscription: check-subscription response:", { data, error });

      if (error || !data) {
        console.error("Error checking subscription via function, using fallback:", error);
        await fallbackFromProfile();
        return;
      }

      console.log("useSubscription: Setting status to:", { ...data, loading: false });
      setStatus({
        ...data,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription via function, using fallback:", error);
      await fallbackFromProfile();
    }
  };
  useEffect(() => {
    checkSubscription();
  }, [user?.id]); // Only re-check when user ID changes, not the whole user object

  return { ...status, refresh: checkSubscription };
};
