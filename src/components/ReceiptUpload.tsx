import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReceiptUploadProps {
  userId: string;
  currencySymbol: string;
}

interface Receipt {
  id: string;
  image_url: string;
  receipt_date: string;
  merchant_name: string | null;
  amount: number;
}

const ReceiptUpload = ({ userId, currencySymbol }: ReceiptUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [todayReceipts, setTodayReceipts] = useState<Receipt[]>([]);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    fetchTodayReceipts();
    fetchUsername();
  }, [userId]);

  const fetchUsername = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (data?.username) {
        setUsername(data.username);
      }
    } catch (error) {
      console.error("Error fetching username:", error);
    }
  };

  const fetchTodayReceipts = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodayReceipts(data || []);
    } catch (error) {
      console.error("Error fetching today's receipts:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length !== files.length) {
      toast.error("Please select only image files");
      return;
    }

    setSelectedFiles(imageFiles);
    
    // Generate previews for all selected files
    const newPreviews: string[] = [];
    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        if (newPreviews.filter(p => p).length === imageFiles.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file first");
      return;
    }

    setUploading(true);
    setProcessing(true);

    try {
      let successCount = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const selectedFile = selectedFiles[i];
        toast.loading(`Processing ${i + 1} of ${selectedFiles.length}...`, { id: `upload-${i}` });
        // Upload to storage
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}_${i}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("receipts")
          .getPublicUrl(fileName);

        toast.success(`Receipt ${i + 1} uploaded! Processing with AI...`, { id: `upload-${i}` });

        // Process with AI
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          "process-receipt",
          {
            body: { imageUrl: publicUrl, userId },
          }
        );

        if (functionError) throw functionError;

        // Get access token for Google APIs
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.provider_token;

        // Check if user has configured Google Sheets
        const { data: profile } = await supabase
          .from("profiles")
          .select("google_sheets_id, google_drive_folder")
          .eq("user_id", userId)
          .maybeSingle();

        if (accessToken && functionData?.data) {
          // Upload to Google Drive
          const driveFileName = `receipt_${functionData.data.date}_${functionData.data.merchant_name || 'unknown'}.${fileExt}`;
          const folderName = profile?.google_drive_folder || 'SnapDaddy Receipts';
          
          toast.loading("Uploading to Google Drive...", { id: `drive-${i}` });
          const { data: driveData, error: driveError } = await supabase.functions.invoke('google-drive-upload', {
            body: { 
              imageUrl: publicUrl, 
              fileName: driveFileName,
              accessToken,
              folderName
            }
          });

          let driveLink = '';
          if (!driveError && driveData?.webViewLink) {
            driveLink = driveData.webViewLink;
            toast.success(`✅ Saved to ${driveData.folderName || folderName}`, { id: `drive-${i}` });
          } else {
            toast.error("Failed to upload to Drive", { id: `drive-${i}` });
            console.error("Drive upload error:", driveError);
          }

          // Sync to Google Sheets if configured
          if (profile?.google_sheets_id) {
            toast.loading("Syncing to Google Sheets...", { id: `sheets-${i}` });
            
            // Use the actual data from the receipt that was created in the database
            const receiptData = {
              merchant_name: functionData.receipt.merchant_name || 'Unknown Merchant',
              amount: functionData.receipt.amount || 0,
              receipt_date: functionData.receipt.receipt_date,
              category: functionData.receipt.category || 'Other',
              driveLink
            };
            
            const { error: sheetsError } = await supabase.functions.invoke('google-sheets-sync', {
              body: {
                accessToken,
                sheetsId: profile.google_sheets_id,
                receiptData
              }
            });

            if (!sheetsError) {
              toast.success("✅ Synced to Google Sheets!", { id: `sheets-${i}` });
            } else {
              toast.error("Failed to sync to Sheets", { id: `sheets-${i}` });
              console.error("Sheets sync error:", sheetsError);
            }
          }
        } else if (!accessToken && i === 0) {
          toast.info("⚙️ Open Google Settings to connect your account", { duration: 4000 });
        }

        successCount++;
        toast.success(`Receipt ${i + 1} processed successfully!`, { id: `upload-${i}` });
      }
      
      toast.success(`All ${successCount} receipts processed!`);
      
      // Fetch today's receipts
      await fetchTodayReceipts();
      
      setSelectedFiles([]);
      setPreviews([]);
      
      // Reset file input
      const input = document.getElementById("receipt-upload") as HTMLInputElement;
      if (input) input.value = "";
      
    } catch (error: any) {
      toast.error(error.message || "Error uploading receipt");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader className="text-center">
        {username && (
          <p className="text-sm text-muted-foreground mb-2">
            Welcome, <span className="font-semibold text-foreground">@{username}</span>
          </p>
        )}
        <CardTitle className="text-2xl">Upload Receipt</CardTitle>
        <CardDescription>
          Take a photo or upload an image of your receipt. Our AI will automatically extract the details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center transition-colors hover:border-primary/50">
          <input
            id="receipt-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="receipt-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            {previews.length > 0 ? (
              <div className="w-full space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Receipt preview ${index + 1}`}
                        className="rounded-lg shadow-md w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg flex items-end justify-center pb-2">
                        <p className="text-white text-xs font-medium">{selectedFiles[index]?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{previews.length} file{previews.length > 1 ? 's' : ''} selected</p>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    Click to upload receipts
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG up to 10MB • Multiple files supported
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={uploading || processing}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing with AI...
              </>
            ) : uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        )}

        {todayReceipts.length > 0 && (
          <div className="p-4 border border-border rounded-lg bg-secondary/20">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Today's Receipts ({todayReceipts.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {todayReceipts.map((receipt) => (
                <Dialog key={receipt.id}>
                  <DialogTrigger asChild>
                    <div className="cursor-pointer group">
                      <img 
                        src={receipt.image_url} 
                        alt="Receipt thumbnail" 
                        className="w-full h-24 object-cover rounded-md border border-border group-hover:opacity-80 transition-opacity"
                      />
                      <div className="mt-1">
                        <p className="text-xs font-medium text-foreground truncate">
                          {receipt.merchant_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currencySymbol}{Number(receipt.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] p-0">
                    <div className="relative w-full h-full overflow-auto p-6">
                      <img 
                        src={receipt.image_url} 
                        alt="Receipt full size" 
                        className="w-full h-auto rounded-lg"
                      />
                      <div className="mt-4 text-sm">
                        <p className="font-semibold">{receipt.merchant_name || "Unknown Merchant"}</p>
                        <p className="text-muted-foreground">Date: {format(new Date(receipt.receipt_date), "dd/MM/yy")}</p>
                        <p className="text-muted-foreground">Amount: {currencySymbol}{Number(receipt.amount).toFixed(2)}</p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;
