import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has free access
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("has_free_access, subscription_status, stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (profile?.has_free_access) {
      logStep("User has free VIP access");
      return new Response(JSON.stringify({
        subscribed: true,
        has_free_access: true,
        subscription_status: "active"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check Stripe subscription
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      await supabaseClient
        .from("profiles")
        .update({ subscription_status: "inactive" })
        .eq("user_id", user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_status: "inactive" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscription found");
      await supabaseClient
        .from("profiles")
        .update({ 
          subscription_status: "inactive",
          stripe_customer_id: customerId 
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_status: "inactive" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const status = subscription.status;
    const isActive = ['active', 'trialing'].includes(status);
    const subscriptionEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    
    logStep("Subscription found", { 
      subscriptionId: subscription.id, 
      status,
      endDate: subscriptionEnd 
    });

    // Update profile in Supabase
    await supabaseClient
      .from("profiles")
      .update({ 
        subscription_status: status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id
      })
      .eq("user_id", user.id);

    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;

    return new Response(JSON.stringify({
      subscribed: isActive,
      subscription_status: status,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
