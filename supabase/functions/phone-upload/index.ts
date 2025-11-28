import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if session exists and is valid
    const { data: session, error: sessionError } = await supabase
      .from("upload_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if session has expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      console.log("Session expired:", sessionId);
      return new Response(
        JSON.stringify({ error: "Session has expired" }),
        { 
          status: 410, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}`);

    // Upload to Supabase Storage
    const fileName = `${session.user_id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(fileName);

    console.log("File uploaded successfully:", urlData.publicUrl);

    // Update session with file URL and status
    const { error: updateError } = await supabase
      .from("upload_sessions")
      .update({
        file_url: urlData.publicUrl,
        status: "uploaded",
      })
      .eq("session_id", sessionId);

    if (updateError) {
      console.error("Error updating session:", updateError);
      throw updateError;
    }

    // Process the receipt with AI
    const { data: processData, error: processError } = await supabase.functions.invoke(
      "process-receipt",
      {
        body: {
          imageUrl: urlData.publicUrl,
          userId: session.user_id,
        },
      }
    );

    if (processError) {
      console.error("Error processing receipt:", processError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt uploaded and processed successfully",
        fileUrl: urlData.publicUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in phone upload:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
