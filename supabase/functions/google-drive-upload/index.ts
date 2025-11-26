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
    const { imageUrl, fileName, accessToken, folderName = 'SnapDaddy Receipts' } = await req.json();

    console.log("Fetching image from:", imageUrl);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    
    // Get or create the specified folder
    console.log("Finding or creating folder:", folderName);
    const folderSearchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const folderSearchData = await folderSearchResponse.json();
    let folderId: string;

    if (folderSearchData.files && folderSearchData.files.length > 0) {
      folderId = folderSearchData.files[0].id;
      console.log("Found existing folder:", folderId);
    } else {
      // Create the folder
      console.log("Creating new folder:", folderName);
      const createFolderResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        }
      );

      const folderData = await createFolderResponse.json();
      folderId = folderData.id;
      console.log("Created folder:", folderId);
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
          'Authorization': `Bearer ${accessToken}`,
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
    console.log("Upload successful:", uploadData.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileId: uploadData.id,
        webViewLink: `https://drive.google.com/file/d/${uploadData.id}/view`
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
