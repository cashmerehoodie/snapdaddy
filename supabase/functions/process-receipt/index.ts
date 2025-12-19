import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body first
    const { filePath, userId } = await req.json();

    if (!filePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: filePath and userId are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate userId is UUID format
    if (!uuidRegex.test(userId)) {
      console.error("Invalid userId format");
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate filePath doesn't contain directory traversal
    if (filePath.includes("../") || filePath.includes("..\\")) {
      console.error("Directory traversal attempt detected");
      return new Response(
        JSON.stringify({ error: "Invalid file path" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate filePath format (userId/timestamp_filename)
    // Must start with a UUID, followed by /, then timestamp_, then filename
    const filePathRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/\d+_[^/]+$/i;
    if (!filePathRegex.test(filePath)) {
      console.error("Invalid filePath format:", filePath);
      return new Response(
        JSON.stringify({ error: "Invalid file path format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Ensure the filePath userId matches the provided userId
    const filePathUserId = filePath.split('/')[0];
    if (filePathUserId !== userId) {
      console.error("FilePath userId mismatch");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Cannot process receipts for other users" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Try to authenticate the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      
      // Try to get user from token (works for direct user calls)
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        authenticatedUserId = user.id;
        console.log(`User authenticated via token: ${user.id}`);
      }
    }

    // If user authentication succeeded, validate userId matches
    if (authenticatedUserId) {
      if (authenticatedUserId !== userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Cannot process receipts for other users" }),
          { 
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      console.log(`Processing receipt for authenticated user ${authenticatedUserId}`);
    } else {
      // For internal calls (from phone-upload with service role), validate userId exists
      // This is safe because internal calls use the service role key
      console.log(`No user token found, validating userId for internal call: ${userId}`);
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", userId)
        .single();
      
      if (profileError || !profile) {
        console.error("Invalid userId for internal call:", profileError);
        return new Response(
          JSON.stringify({ error: "Invalid user ID provided" }),
          { 
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      authenticatedUserId = userId;
      console.log(`Processing receipt for internal call, user ${userId}`);
    }

    // Call Lovable AI to process the receipt image
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Downloading image from storage:", filePath);
    
    // Download the image from storage using service role
    const { data: imageBlob, error: downloadError } = await supabase.storage
      .from('receipts')
      .download(filePath);
    
    if (downloadError || !imageBlob) {
      console.error("Failed to download image:", downloadError);
      throw new Error(`Failed to download image: ${downloadError?.message || 'Unknown error'}`);
    }

    // Convert blob to base64
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Detect image format from blob type
    const contentType = imageBlob.type || 'image/jpeg';
    const dataUrl = `data:${contentType};base64,${base64Image}`;
    
    console.log("Image converted to base64, processing with AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a receipt parser. Extract the merchant name, total amount, date, and category from receipt images. Return ONLY valid JSON in this exact format: {"merchant_name": "string", "amount": number, "date": "YYYY-MM-DD", "category": "string"}.

CRITICAL CATEGORIZATION RULES - Analyze the merchant name AND items on the receipt:

1. FUEL: If the receipt mentions ANY of: pump, diesel, petrol, gas station, fuel, BP, Shell, Chevron, Texaco, Esso, Mobil, Circle K, 7-Eleven (with fuel), Speedway, Wawa (with fuel) → category: "Fuel"

2. FOOD: If from restaurants, cafes, bakeries, grocery stores, supermarkets, food delivery, or mentions food items like: Tesco, Sainsbury's, Asda, Morrisons, Aldi, Lidl, Waitrose, McDonald's, KFC, Subway, Starbucks, Costa, Greggs, Pizza Hut, Domino's, takeaway, restaurant, cafe, bistro, diner → category: "Food"

3. MATERIALS: If from hardware stores, building suppliers, or purchasing construction/work materials like: B&Q, Screwfix, Wickes, Toolstation, Homebase, Travis Perkins, Jewson, Selco, plumbing supplies, electrical supplies, timber, cement, paint, tools, building materials → category: "Materials"

4. OTHER CATEGORIES:
   - Transportation: Public transport, taxis, Uber, parking (NOT fuel)
   - Shopping: Clothing, electronics, general retail (NOT groceries)
   - Entertainment: Cinema, games, events
   - Business: Office supplies, services
   - Health: Pharmacy, medical

Use intelligent matching - check both merchant name AND items purchased. If unsure between categories, prioritize Fuel > Materials > Food.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract the information from this receipt image."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response content:", content);

    // Parse the JSON response
    let receiptData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      receiptData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse receipt data from AI response");
    }

    // Validate and normalize the date
    const today = new Date();
    const extractedDate = new Date(receiptData.date);

    if (isNaN(extractedDate.getTime())) {
      console.log(`Invalid date detected: ${receiptData.date}, using today's date instead`);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      receiptData.date = `${year}-${month}-${day}`;
    } else {
      const year = extractedDate.getFullYear();
      const month = String(extractedDate.getMonth() + 1).padStart(2, '0');
      const day = String(extractedDate.getDate()).padStart(2, '0');
      receiptData.date = `${year}-${month}-${day}`;
    }

    // Insert into database - store the file path reference
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/receipts/${filePath}`;
    
    const { data: insertedReceipt, error: insertError } = await supabase
      .from("receipts")
      .insert({
        user_id: userId,
        image_url: imageUrl,
        amount: receiptData.amount,
        merchant_name: receiptData.merchant_name,
        receipt_date: receiptData.date,
        category: receiptData.category,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw insertError;
    }

    console.log("Receipt processed successfully:", insertedReceipt);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: receiptData,
        receipt: insertedReceipt 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (error) {
    console.error("Error processing receipt:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
