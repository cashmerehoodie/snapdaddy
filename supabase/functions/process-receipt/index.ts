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
    const { imageUrl, userId } = await req.json();

    if (!imageUrl || !userId) {
      throw new Error("Missing required parameters");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call Lovable AI to process the receipt image
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Fetching image from:", imageUrl);
    
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      console.error("Failed to fetch image:", imageResponse.status, imageResponse.statusText);
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Detect image format
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
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

    // Insert into database
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
