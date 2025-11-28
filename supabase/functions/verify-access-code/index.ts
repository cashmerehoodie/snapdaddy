import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-ACCESS-CODE] ${step}${detailsStr}`);
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
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { code } = await req.json();
    if (!code) {
      throw new Error("No access code provided");
    }
    logStep("Verifying code", { code });

    // First check if user already has free access with this code
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("has_free_access, free_access_code")
      .eq("user_id", user.id)
      .single();

    if (profile?.has_free_access && profile?.free_access_code === code.trim().toUpperCase()) {
      logStep("User already has access with this code");
      return new Response(JSON.stringify({ 
        valid: true,
        message: "You already have access with this code!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if code exists and is active
    const { data: vipCode, error: codeError } = await supabaseClient
      .from("vip_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .is("used_by", null)
      .single();

    if (codeError || !vipCode) {
      logStep("Invalid code - either doesn't exist, inactive, or already used by someone else");
      return new Response(JSON.stringify({ 
        valid: false, 
        message: "Invalid or already used access code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Valid code found", { codeId: vipCode.id });

    // Mark code as used
    await supabaseClient
      .from("vip_codes")
      .update({
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq("id", vipCode.id);

    // Grant free access to user
    await supabaseClient
      .from("profiles")
      .update({
        has_free_access: true,
        free_access_code: code.trim().toUpperCase(),
        subscription_status: "active",
      })
      .eq("user_id", user.id);

    logStep("Free access granted", { userId: user.id });

    return new Response(JSON.stringify({ 
      valid: true,
      message: "Access code verified! You now have full access." 
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
