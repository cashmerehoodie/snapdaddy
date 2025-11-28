import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXCEL-SYNC] ${step}${detailsStr}`);
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

    const { receiptId, userId } = await req.json();

    if (!receiptId || !userId) {
      throw new Error("Missing required parameters");
    }

    // Get Microsoft tokens and workbook ID from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("microsoft_access_token, microsoft_refresh_token, microsoft_excel_workbook_id")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.microsoft_access_token) {
      throw new Error("Microsoft not connected. Please connect your Microsoft account first.");
    }

    if (!profile.microsoft_excel_workbook_id) {
      throw new Error("Excel workbook not configured. Please set up your Excel workbook first.");
    }

    // Get receipt data
    const { data: receipt, error: receiptError } = await supabaseClient
      .from("receipts")
      .select("*")
      .eq("id", receiptId)
      .single();

    if (receiptError || !receipt) {
      throw new Error("Receipt not found");
    }

    logStep("Receipt data retrieved", { receiptId, merchant: receipt.merchant_name });

    // Extract workbook ID from URL if needed
    const workbookId = profile.microsoft_excel_workbook_id.includes('/')
      ? profile.microsoft_excel_workbook_id.split('/').find((part: string) => part.length > 20) || profile.microsoft_excel_workbook_id
      : profile.microsoft_excel_workbook_id;

    // Format date for Excel
    const receiptDate = new Date(receipt.receipt_date).toLocaleDateString();

    // Add row to Excel
    const excelUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${workbookId}/workbook/worksheets('Sheet1')/tables('Table1')/rows`;
    
    const rowData = {
      values: [[
        receiptDate,
        receipt.merchant_name || "",
        receipt.amount || 0,
        receipt.category || ""
      ]]
    };

    logStep("Adding row to Excel", { workbookId, data: rowData });

    const excelResponse = await fetch(excelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${profile.microsoft_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rowData),
    });

    if (!excelResponse.ok) {
      const errorText = await excelResponse.text();
      logStep("Excel sync failed", { status: excelResponse.status, error: errorText });
      
      // If table doesn't exist, create it
      if (excelResponse.status === 404) {
        logStep("Table not found, creating it");
        const createTableUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${workbookId}/workbook/worksheets('Sheet1')/tables/add`;
        const createTableResponse = await fetch(createTableUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${profile.microsoft_access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: "A1:D1",
            hasHeaders: true
          }),
        });

        if (createTableResponse.ok) {
          logStep("Table created, retrying row insert");
          const retryResponse = await fetch(excelUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${profile.microsoft_access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(rowData),
          });
          
          if (!retryResponse.ok) {
            throw new Error("Failed to add row after creating table");
          }
        }
      } else {
        throw new Error(`Failed to sync to Excel: ${errorText}`);
      }
    }

    logStep("Successfully synced to Excel");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Receipt synced to Excel successfully"
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