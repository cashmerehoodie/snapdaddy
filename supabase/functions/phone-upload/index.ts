import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Edge runtime helper for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

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

    // Kick off background processing (AI + Google sync) so the upload response stays fast
    const processAndSync = async () => {
      try {
        // Process the receipt with AI - pass file path
        const { data: processData, error: processError } = await supabase.functions.invoke(
          "process-receipt",
          {
            body: {
              filePath: fileName,
              userId: session.user_id,
            },
          }
        );

        if (processError) {
          console.error("Error processing receipt:", processError);
          return;
        }

        // Get user's Google settings and provider token from their profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("google_sheets_id, google_drive_folder, google_provider_token")
          .eq("user_id", session.user_id)
          .single();

        const accessToken = profileData?.google_provider_token;

        // Upload to Google Drive and sync to Sheets if configured
        if (accessToken && processData?.data) {
          const fileExt = file.name.split(".").pop();
          const driveFileName = `receipt_${processData.data.date}_${processData.data.merchant_name || "unknown"}.${fileExt}`;
          const folderName = profileData?.google_drive_folder || "SnapDaddy Receipts";

          // Upload to Google Drive
          console.log("Uploading to Google Drive...");
          const { data: driveData, error: driveError } = await supabase.functions.invoke("google-drive-upload", {
            body: {
              imageUrl: urlData.publicUrl,
              fileName: driveFileName,
              accessToken,
              folderName,
              userId: session.user_id,
            },
          });

          let driveLink = "";
          if (!driveError && driveData?.webViewLink) {
            driveLink = driveData.webViewLink;
            console.log("Uploaded to Google Drive:", driveLink);
            
            // Update the receipt record with google_drive_id
            if (driveData.fileId && processData?.receipt?.id) {
              await supabase
                .from("receipts")
                .update({ google_drive_id: driveData.fileId })
                .eq("id", processData.receipt.id);
              console.log("Updated receipt with Google Drive ID:", driveData.fileId);
            }
          } else {
            console.error("Failed to upload to Drive:", driveError);
          }

          // Sync to Google Sheets if configured
          if (profileData?.google_sheets_id && processData?.receipt) {
            console.log("Syncing to Google Sheets...");
            const receiptData = {
              merchant_name: processData.receipt.merchant_name || "Unknown Merchant",
              amount: processData.receipt.amount || 0,
              receipt_date: processData.receipt.receipt_date,
              category: processData.receipt.category || "Other",
              driveLink,
            };

            const { error: sheetsError } = await supabase.functions.invoke("google-sheets-sync", {
              body: {
                accessToken,
                sheetsId: profileData.google_sheets_id,
                receiptData,
                userId: session.user_id,
              },
            });

            if (sheetsError) {
              console.error("Failed to sync to Sheets:", sheetsError);
            } else {
              console.log("Synced to Google Sheets");
            }
          }
        } else if (!accessToken) {
          console.log("No Google provider token found, skipping Google integration");
        }
      } catch (bgError) {
        console.error("Background processing error:", bgError);
      }
    };

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(processAndSync());
    } else {
      // Fallback: run without blocking the response
      void processAndSync();
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
