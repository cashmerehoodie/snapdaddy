import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { refreshGoogleToken } from "../_shared/refreshGoogleToken.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { accessToken, userId, folderName = 'SnapDaddy Receipts' } = await req.json();

    // Validate required parameters
    if (!accessToken || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: accessToken, userId" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate userId format
    if (!uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate folderName
    if (folderName.length > 100 || /[<>:"|?*]/.test(folderName)) {
      return new Response(
        JSON.stringify({ error: "Invalid folder name" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Setting up Google storage for user:", userId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper function to make Google API calls with token refresh on 401
    const fetchWithTokenRefresh = async (url: string, options: RequestInit): Promise<Response> => {
      let response = await fetch(url, options);
      
      if (response.status === 401 && userId) {
        console.log("Access token expired, attempting refresh...");
        const refreshResult = await refreshGoogleToken(userId, accessToken);
        
        if (refreshResult.success) {
          accessToken = refreshResult.accessToken;
          console.log("Token refreshed successfully, retrying request...");
          
          // Update the Authorization header with new token
          const newHeaders = { ...options.headers as Record<string, string> };
          newHeaders['Authorization'] = `Bearer ${accessToken}`;
          
          // Retry the request with new token
          response = await fetch(url, { ...options, headers: newHeaders });
        } else {
          throw new Error(refreshResult.error || "Failed to refresh Google token. Please reconnect your Google account.");
        }
      }
      
      return response;
    };

    // 1. Create Drive folder
    console.log("Creating Drive folder:", folderName);
    const folderSearchResponse = await fetchWithTokenRefresh(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!folderSearchResponse.ok) {
      const errorText = await folderSearchResponse.text();
      console.error("Folder search error:", errorText);
      throw new Error(`Failed to search for folder: ${folderSearchResponse.status} - ${errorText}`);
    }

    const folderSearchData = await folderSearchResponse.json();
    let folderId: string;

    if (folderSearchData.files && folderSearchData.files.length > 0) {
      folderId = folderSearchData.files[0].id;
      console.log("Found existing folder:", folderId);
    } else {
      const createFolderResponse = await fetchWithTokenRefresh(
        'https://www.googleapis.com/drive/v3/files?fields=id,name',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root'],
          }),
        }
      );

      if (!createFolderResponse.ok) {
        const errorText = await createFolderResponse.text();
        console.error("Folder creation error:", errorText);
        throw new Error(`Failed to create folder: ${createFolderResponse.status} - ${errorText}`);
      }

      const folderData = await createFolderResponse.json();
      folderId = folderData.id;
      console.log("Created new folder:", folderId);
    }

    // 2. Create Google Sheet
    console.log("Creating Google Sheet...");
    const createSheetResponse = await fetchWithTokenRefresh(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: 'SnapDaddy Receipts',
          },
          sheets: [{
            properties: {
              title: 'Getting Started',
            },
          }],
        }),
      }
    );

    if (!createSheetResponse.ok) {
      const errorText = await createSheetResponse.text();
      console.error("Sheet creation error:", errorText);
      throw new Error(`Failed to create Google Sheet: ${createSheetResponse.status}`);
    }

    const sheetData = await createSheetResponse.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const spreadsheetUrl = sheetData.spreadsheetUrl;

    console.log("Created spreadsheet:", spreadsheetId);

    // 3. Add welcome headers to the Getting Started sheet
    await fetchWithTokenRefresh(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Getting%20Started!A1:F1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [['Date', 'Merchant', 'Amount', 'Category', 'Drive Link', 'Month']],
        }),
      }
    );

    // 4. Format the header row
    await fetchWithTokenRefresh(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
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

    // 5. Save to user profile
    console.log("Saving to user profile...");
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        google_sheets_id: spreadsheetId,
        google_drive_folder: folderName,
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw profileError;
    }

    console.log("Setup complete!");

    return new Response(
      JSON.stringify({
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        folderId,
        folderName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error in setup-google-storage:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
