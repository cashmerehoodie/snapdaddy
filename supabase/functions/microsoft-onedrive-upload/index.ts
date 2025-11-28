import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ONEDRIVE-UPLOAD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { imageUrl, userId, folderPath, fileName } = await req.json();

    if (!imageUrl || !userId) {
      throw new Error("Missing required parameters");
    }

    // Get Microsoft access token from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("microsoft_access_token, microsoft_refresh_token")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.microsoft_access_token) {
      throw new Error("Microsoft not connected. Please connect your Microsoft account first.");
    }

    logStep("Fetching image", { imageUrl });
    
    // Fetch the image from Supabase storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    
    logStep("Image fetched, uploading to OneDrive");

    // Upload to OneDrive
    const targetPath = folderPath || "Documents/SnapDaddy Receipts";
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${targetPath}/${fileName}:/content`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${profile.microsoft_access_token}`,
        "Content-Type": imageBlob.type,
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logStep("Upload failed", { status: uploadResponse.status, error: errorText });
      throw new Error(`Failed to upload to OneDrive: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    logStep("Upload successful", { fileId: uploadData.id, webUrl: uploadData.webUrl });

    return new Response(
      JSON.stringify({
        success: true,
        fileId: uploadData.id,
        webUrl: uploadData.webUrl,
        fileName: uploadData.name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});