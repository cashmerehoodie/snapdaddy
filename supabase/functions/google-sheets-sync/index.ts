import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { refreshGoogleToken } from "../_shared/refreshGoogleToken.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessToken, receiptData, sheetsId, userId } = await req.json();
    let currentAccessToken = accessToken;
    
    if (!sheetsId) {
      throw new Error('Google Sheets ID not provided');
    }

    console.log("Syncing to Google Sheets:", sheetsId);

    const { merchant_name, amount, receipt_date, category, driveLink } = receiptData;
    
    // Parse date and get month/year
    const date = new Date(receipt_date);
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    const sheetName = `${monthName} ${year}`; // e.g., "November 2025"

    console.log("Target sheet:", sheetName);

    // Check if sheet exists, and verify API access
    let sheetsResponse;
    try {
      sheetsResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`,
        {
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
          },
        }
      );
      
      // If unauthorized, try refreshing the token
      if (sheetsResponse.status === 401 && userId) {
        console.log("Access token expired, attempting refresh...");
        const refreshResult = await refreshGoogleToken(userId, currentAccessToken);
        if (refreshResult.success) {
          currentAccessToken = refreshResult.accessToken;
          // Retry the request with new token
          sheetsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}`,
            {
              headers: {
                'Authorization': `Bearer ${currentAccessToken}`,
              },
            }
          );
        }
      }
      
      if (!sheetsResponse.ok) {
        const errorData = await sheetsResponse.json();
        console.error("Sheets API error:", JSON.stringify(errorData, null, 2));
        
        if (errorData.error?.code === 403 && errorData.error?.message?.includes('Sheets API')) {
          throw new Error('Google Sheets API is not enabled. Please enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview');
        }
        throw new Error(`Sheets API error: ${errorData.error?.message || sheetsResponse.statusText}`);
      }
    } catch (error) {
      console.error("Failed to access spreadsheet:", error);
      throw error;
    }

    const sheetsData = await sheetsResponse.json();
    const sheetExists = sheetsData.sheets?.some(
      (s: any) => s.properties.title === sheetName
    );

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      console.log("Creating new sheet:", sheetName);
      
      // Calculate the correct index to insert the sheet in chronological order
      const existingSheets = sheetsData.sheets || [];
      let insertIndex = 0;
      
      for (let i = 0; i < existingSheets.length; i++) {
        const sheetTitle = existingSheets[i].properties.title;
        // Try to parse as "Month Year" format
        const match = sheetTitle.match(/^(\w+)\s+(\d{4})$/);
        if (match) {
          const sheetDate = new Date(`${match[1]} 1, ${match[2]}`);
          const newSheetDate = new Date(`${monthName} 1, ${year}`);
          
          if (newSheetDate > sheetDate) {
            insertIndex = i + 1;
          }
        }
      }
      
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                    index: insertIndex,
                  },
                },
              },
            ],
          }),
        }
      );

      // Add headers with better formatting
      console.log("Adding headers to new sheet");
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${sheetName}!A1:F1:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [['Date', 'Merchant', 'Amount', 'Category', 'Drive Link', 'Month']],
          }),
        }
      );
      
      // Format header row (bold, background color)
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              repeatCell: {
                range: {
                  sheetId: sheetsData.sheets.find((s: any) => s.properties.title === sheetName)?.properties.sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            }]
          }),
        }
      );
    }

    // Format date as DD/MM/YYYY
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

    // Append the receipt data
    console.log("Appending receipt data");
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}/values/${sheetName}!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            formattedDate,
            merchant_name || 'Unknown',
            amount,
            category || 'Uncategorized',
            driveLink ? `=HYPERLINK("${driveLink}", "View Receipt")` : '',
            monthName
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
