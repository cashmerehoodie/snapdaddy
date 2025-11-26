import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, receiptData } = await req.json();
    const sheetsId = Deno.env.get('GOOGLE_SHEETS_ID');

    if (!sheetsId) {
      throw new Error('GOOGLE_SHEETS_ID not configured');
    }

    console.log("Syncing to Google Sheets:", sheetsId);

    const { merchant_name, amount, receipt_date, category, driveLink } = receiptData;
    
    // Get current year for sheet name
    const year = new Date(receipt_date).getFullYear();
    const sheetName = `Receipts ${year}`;

    console.log("Target sheet:", sheetName);

    // Check if sheet exists
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const sheetsData = await sheetsResponse.json();
    const sheetExists = sheetsData.sheets?.some(
      (s: any) => s.properties.title === sheetName
    );

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      console.log("Creating new sheet:", sheetName);
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          }),
        }
      );

      // Add headers
      console.log("Adding headers to new sheet");
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${sheetName}!A1:E1:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [['Date', 'Merchant', 'Amount', 'Category', 'Drive Link']],
          }),
        }
      );
    }

    // Format date as DD/MM/YY
    const date = new Date(receipt_date);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;

    // Append the receipt data
    console.log("Appending receipt data");
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${sheetName}!A:E:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            formattedDate,
            merchant_name || 'Unknown',
            amount,
            category || 'Uncategorized',
            driveLink || ''
          ]],
        }),
      }
    );

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      console.error("Sheets append error:", errorText);
      throw new Error(`Failed to append to sheet: ${appendResponse.status}`);
    }

    console.log("Successfully synced to Google Sheets");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error in google-sheets-sync:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
