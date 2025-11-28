import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      logStep("ERROR: No webhook secret configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Event received", { type: event.type });

    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    // Get customer email
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer || customer.deleted) {
      throw new Error("Customer not found");
    }
    const customerEmail = (customer as Stripe.Customer).email;
    if (!customerEmail) {
      throw new Error("Customer email not found");
    }
    
    logStep("Processing for customer", { email: customerEmail });

    // Get user from email
    const { data: userData } = await supabaseClient.auth.admin.listUsers();
    const user = userData?.users.find(u => u.email === customerEmail);
    if (!user) {
      logStep("ERROR: User not found for email", { email: customerEmail });
      return new Response("User not found", { status: 404 });
    }

    let newStatus = "inactive";
    
    switch (event.type) {
      case "customer.subscription.created":
        newStatus = subscription.status;
        logStep("Subscription created", { status: newStatus, userId: user.id });
        break;
        
      case "customer.subscription.trial_will_end":
        newStatus = subscription.status;
        logStep("Trial will end soon", { userId: user.id });
        // You could send an email notification here
        break;
        
      case "customer.subscription.updated":
        newStatus = subscription.status;
        logStep("Subscription updated", { status: newStatus, userId: user.id });
        break;
        
      case "invoice.payment_succeeded":
        newStatus = "active";
        logStep("Payment succeeded", { userId: user.id });
        break;
        
      case "invoice.payment_failed":
        newStatus = "past_due";
        logStep("Payment failed", { userId: user.id });
        break;
        
      case "customer.subscription.deleted":
        newStatus = "canceled";
        logStep("Subscription canceled", { userId: user.id });
        break;
    }

    // Update profile
    const { error } = await supabaseClient
      .from("profiles")
      .update({
        subscription_status: newStatus,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      logStep("ERROR updating profile", { error });
      throw error;
    }

    logStep("Profile updated successfully", { userId: user.id, newStatus });

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
