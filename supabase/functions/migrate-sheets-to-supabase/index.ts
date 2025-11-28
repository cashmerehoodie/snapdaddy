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
    const { accessToken, sheetsId, userId } = await req.json();

    if (!accessToken || !sheetsId || !userId) {
      throw new Error("Missing required parameters: accessToken, sheetsId, userId");
    }

    console.log("Starting migration for user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all sheets in the spreadsheet
    const sheetsListResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!sheetsListResponse.ok) {
      throw new Error(`Failed to fetch sheets: ${sheetsListResponse.statusText}`);
    }

    const sheetsData = await sheetsListResponse.json();
    const sheets = sheetsData.sheets || [];

    console.log(`Found ${sheets.length} sheets to process`);

    let totalImported = 0;
    let totalSkipped = 0;
    let errors = [];

    // Process each sheet (each represents a month)
    for (const sheet of sheets) {
      const sheetName = sheet.properties.title;
      
      // Skip system sheets or non-month sheets
      if (sheetName === "Summary" || sheetName.startsWith("_")) {
        console.log(`Skipping sheet: ${sheetName}`);
        continue;
      }

      console.log(`Processing sheet: ${sheetName}`);

      try {
        // Fetch data from this sheet
        const dataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${encodeURIComponent(sheetName)}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!dataResponse.ok) {
          console.error(`Failed to fetch data from sheet ${sheetName}`);
          continue;
        }

        const sheetData = await dataResponse.json();
        const rows = sheetData.values || [];

        // Skip if empty or only header row
        if (rows.length <= 1) {
          console.log(`Sheet ${sheetName} is empty`);
          continue;
        }

        // Expected columns: Date, Merchant, Amount, Category, Drive Link, Month
        const headerRow = rows[0];
        const dataRows = rows.slice(1);

        console.log(`Found ${dataRows.length} rows in ${sheetName}`);

        for (const row of dataRows) {
          if (!row || row.length === 0) continue;

          try {
            const date = row[0] || null;
            const merchantName = row[1] || "Unknown Merchant";
            const amountStr = row[2] || "0";
            const category = row[3] || "Other";
            const driveLink = row[4] || null;

            // Parse amount (remove currency symbols and commas)
            const amount = parseFloat(
              amountStr.toString().replace(/[£$€,]/g, "").trim()
            ) || 0;

            // Parse date to YYYY-MM-DD format
            let receiptDate = new Date().toISOString().split("T")[0];
            if (date) {
              try {
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                  receiptDate = parsedDate.toISOString().split("T")[0];
                }
              } catch (e) {
                console.log(`Invalid date: ${date}, using current date`);
              }
            }

            // Extract google_drive_id from drive link if available
            let googleDriveId = null;
            if (driveLink && driveLink.includes("drive.google.com")) {
              const match = driveLink.match(/\/d\/([^\/]+)/);
              if (match) {
                googleDriveId = match[1];
              }
            }

            // Check if this receipt already exists in Supabase
            // We'll check by date + merchant + amount combination
            const { data: existingReceipts } = await supabase
              .from("receipts")
              .select("id")
              .eq("user_id", userId)
              .eq("receipt_date", receiptDate)
              .eq("merchant_name", merchantName)
              .eq("amount", amount)
              .limit(1);

            if (existingReceipts && existingReceipts.length > 0) {
              console.log(
                `Receipt already exists: ${merchantName} - ${amount} on ${receiptDate}`
              );
              totalSkipped++;
              continue;
            }

            // Insert into Supabase
            const { error: insertError } = await supabase
              .from("receipts")
              .insert({
                user_id: userId,
                receipt_date: receiptDate,
                merchant_name: merchantName,
                amount: amount,
                category: category,
                google_drive_id: googleDriveId,
                image_url: driveLink || `https://placeholder.com/receipt-${Date.now()}`,
                notes: `Migrated from Google Sheets: ${sheetName}`,
              });

            if (insertError) {
              console.error(`Insert error for ${merchantName}:`, insertError);
              errors.push(`${merchantName} (${receiptDate}): ${insertError.message}`);
            } else {
              totalImported++;
              console.log(`✅ Imported: ${merchantName} - ${amount}`);
            }
          } catch (rowError) {
            console.error("Error processing row:", rowError);
            const errorMsg = rowError instanceof Error ? rowError.message : String(rowError);
            errors.push(`Row processing error: ${errorMsg}`);
          }
        }
      } catch (sheetError) {
        console.error(`Error processing sheet ${sheetName}:`, sheetError);
        const errorMsg = sheetError instanceof Error ? sheetError.message : String(sheetError);
        errors.push(`Sheet ${sheetName}: ${errorMsg}`);
      }
    }

    console.log(
      `Migration complete: ${totalImported} imported, ${totalSkipped} skipped, ${errors.length} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        imported: totalImported,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : null,
        message: `Successfully migrated ${totalImported} receipts. ${totalSkipped} were already in the database.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
