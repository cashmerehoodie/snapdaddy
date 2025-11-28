import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const log = (msg: string, data?: any) => console.log(`[STRIPE-WEBHOOK] ${msg}`, data ? JSON.stringify(data) : "");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or secret", { status: 400 });
  }

  let raw = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);
  } catch (err) {
    log("Signature verification failed", err);
    return new Response("Bad signature", { status: 400 });
  }

  log("Received event", { type: event.type });

  let subscriptionId: string | null = null;
  let customerId: string | null = null;
  let status = "inactive";

  // 🔥 Correctly extract subscription + customer based on event type
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      subscriptionId = session.subscription as string;
      customerId = session.customer as string;
      status = "active";
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      subscriptionId = invoice.subscription as string;
      customerId = invoice.customer as string;
      status = "active";
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      subscriptionId = invoice.subscription as string;
      customerId = invoice.customer as string;
      status = "past_due";
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      subscriptionId = sub.id;
      customerId = sub.customer as string;
      status = sub.status;
      break;
    }
  }

  // If we didn't get a customerId, stop
  if (!customerId) {
    log("No customer ID found");
    return new Response("No customer", { status: 200 });
  }

  // Fetch Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) {
    return new Response("Customer not found", { status: 200 });
  }

  const email = (customer as Stripe.Customer).email!;
  log("Processing customer", { email });

  // Find Supabase user via email
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);

  if (!user) {
    log("User not found", { email });
    return new Response("No user", { status: 200 });
  }

  // Update user profile
  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (error) {
    log("Profile update error", error);
    return new Response("DB error", { status: 500 });
  }

  log("Profile updated", { userId: user.id, status });

  return new Response("OK", { status: 200 });
});
