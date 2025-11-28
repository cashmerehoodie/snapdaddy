import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface RefreshResult {
  accessToken: string;
  success: boolean;
  error?: string;
}

export async function refreshGoogleToken(
  userId: string,
  currentAccessToken: string
): Promise<RefreshResult> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the refresh token from the database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_refresh_token")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.google_refresh_token) {
      console.error("No refresh token found for user:", userId);
      return {
        accessToken: currentAccessToken,
        success: false,
        error: "No refresh token available. Please reconnect your Google account.",
      };
    }

    // Get Google OAuth credentials from environment
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Google OAuth credentials not configured");
      return {
        accessToken: currentAccessToken,
        success: false,
        error: "Google OAuth not configured",
      };
    }

    // Request a new access token using the refresh token
    console.log("Refreshing Google access token for user:", userId);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: profile.google_refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token refresh failed:", errorData);
      return {
        accessToken: currentAccessToken,
        success: false,
        error: "Failed to refresh token. Please reconnect your Google account.",
      };
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token;

    // Save the new access token to the database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ google_provider_token: newAccessToken })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to save refreshed token:", updateError);
    } else {
      console.log("Successfully refreshed and saved new access token");
    }

    return {
      accessToken: newAccessToken,
      success: true,
    };
  } catch (error) {
    console.error("Error in refreshGoogleToken:", error);
    return {
      accessToken: currentAccessToken,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
