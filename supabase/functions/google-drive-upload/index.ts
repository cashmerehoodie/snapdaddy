import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { imageUrl, fileName, accessToken, folderName = 'SnapDaddy Receipts', userId, _internalCall } = await req.json();
    
    // Validate required parameters
    if (!imageUrl || !fileName || !accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: imageUrl, fileName, accessToken" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate userId if provided
    if (userId && !uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate fileName doesn't contain path traversal
    if (fileName.includes('../') || fileName.includes('..\\') || fileName.includes('/')) {
      return new Response(
        JSON.stringify({ error: "Invalid file name" }),
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

    // Validate imageUrl is a valid URL
    try {
      const parsedUrl = new URL(imageUrl);
      // Only allow https URLs from trusted domains
      if (parsedUrl.protocol !== 'https:') {
        throw new Error("Only HTTPS URLs allowed");
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let currentAccessToken = accessToken;

    console.log("Fetching image from:", imageUrl.substring(0, 50) + "...");

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    
    // Get or create the specified folder in My Drive root
    console.log("Finding or creating folder in My Drive root:", folderName);
    
    // Search for folder in My Drive root specifically (not in shared drives or subfolders)
    let folderSearchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false&fields=files(id,name,webViewLink)`,
      {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      }
    );

    // If unauthorized, try refreshing the token
    if (folderSearchResponse.status === 401 && userId) {
      console.log("Access token expired, attempting refresh...");
      const refreshResult = await refreshGoogleToken(userId, currentAccessToken);
      if (refreshResult.success) {
        currentAccessToken = refreshResult.accessToken;
        // Retry the request with new token
        folderSearchResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false&fields=files(id,name,webViewLink)`,
          {
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
            },
          }
        );
      }
    }

    if (!folderSearchResponse.ok) {
      const errorText = await folderSearchResponse.text();
      console.error("Folder search error:", errorText);
      throw new Error(`Failed to search for Drive folder: ${folderSearchResponse.status}`);
    }

    const folderSearchData = await folderSearchResponse.json();
    let folderId: string;
    let folderLink: string;

    if (folderSearchData.files && folderSearchData.files.length > 0) {
      folderId = folderSearchData.files[0].id;
      folderLink = folderSearchData.files[0].webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
      console.log("Found existing folder:", folderId, "at", folderLink);
    } else {
      // Create the folder in My Drive root
      console.log("Creating new folder in My Drive root:", folderName);
      const createFolderResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['root'], // Explicitly place in My Drive root
          }),
        }
      );

      if (!createFolderResponse.ok) {
        const errorText = await createFolderResponse.text();
        console.error("Folder creation error:", errorText);
        throw new Error(`Failed to create Drive folder: ${createFolderResponse.status}`);
      }

      const folderData = await createFolderResponse.json();
      
      if (!folderData.id) {
        throw new Error("Folder created but no ID returned");
      }
      
      folderId = folderData.id;
      folderLink = folderData.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
      console.log("Created folder:", folderId, "at", folderLink);
    }

    // Upload file to Google Drive
    console.log("Uploading file to Drive...");
    const boundary = "foo_bar_baz";
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${imageBlob.type}\r\n\r\n`;

    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageUint8Array = new Uint8Array(imageArrayBuffer);
    
    const footer = `\r\n--${boundary}--`;
    const footerUint8Array = new TextEncoder().encode(footer);
    
    const bodyParts = [
      new TextEncoder().encode(multipartBody),
      imageUint8Array,
      footerUint8Array,
    ];
    
    const totalLength = bodyParts.reduce((sum, part) => sum + part.length, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of bodyParts) {
      body.set(part, offset);
      offset += part.length;
    }

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Drive upload error:", errorText);
      throw new Error(`Failed to upload to Drive: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    console.log("Upload successful:", uploadData.id, "in folder:", folderId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId: uploadData.id,
        webViewLink: `https://drive.google.com/file/d/${uploadData.id}/view`,
        folderLink: folderLink,
        folderName: folderName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error in google-drive-upload:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
