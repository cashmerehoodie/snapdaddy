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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    fetchLastReceipt();
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

  const fetchLastReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setLastReceipt(data);
    } catch (error) {
      console.error("Error fetching last receipt:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setUploading(true);
    setProcessing(true);

    try {
      // Upload to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      toast.success("Receipt uploaded! Processing with AI...");

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
        
        toast.loading("Uploading to Google Drive...", { id: "drive-upload" });
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
          toast.success("✅ Saved to Google Drive!", { id: "drive-upload" });
        } else {
          toast.error("Failed to upload to Drive", { id: "drive-upload" });
          console.error("Drive upload error:", driveError);
        }

        // Sync to Google Sheets if configured
        if (profile?.google_sheets_id) {
          toast.loading("Syncing to Google Sheets...", { id: "sheets-sync" });
          const { error: sheetsError } = await supabase.functions.invoke('google-sheets-sync', {
            body: {
              accessToken,
              sheetsId: profile.google_sheets_id,
              receiptData: {
                merchant_name: functionData.data.merchant_name,
                amount: functionData.data.amount,
                receipt_date: functionData.data.date,
                category: functionData.data.category,
                driveLink
              }
            }
          });

          if (!sheetsError) {
            toast.success("✅ Synced to Google Sheets!", { id: "sheets-sync" });
          } else {
            toast.error("Failed to sync to Sheets", { id: "sheets-sync" });
            console.error("Sheets sync error:", sheetsError);
          }
        } else {
          toast.info("Configure Google Sheets ID in settings to enable sync");
        }
      } else if (!accessToken) {
        toast.info("Sign in with Google to enable Drive & Sheets sync");
      }

      toast.success("Receipt processed successfully!");
      
      // Fetch the newly created receipt
      await fetchLastReceipt();
      
      setSelectedFile(null);
      setPreview(null);
      
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
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="receipt-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            {preview ? (
              <div className="relative w-full max-w-sm mx-auto">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="rounded-lg shadow-md w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg flex items-end justify-center pb-4">
                  <p className="text-white font-medium">{selectedFile?.name}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    Click to upload receipt
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </>
            )}
          </label>
        </div>

        {selectedFile && (
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

        {lastReceipt && (
          <div className="p-4 border border-border rounded-lg bg-secondary/20">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Last Processed Receipt</h3>
            <div className="flex items-start gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <img 
                    src={lastReceipt.image_url} 
                    alt="Receipt thumbnail" 
                    className="w-20 h-20 object-cover rounded-md border border-border cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] p-0">
                  <div className="relative w-full h-full overflow-auto p-6">
                    <img 
                      src={lastReceipt.image_url} 
                      alt="Receipt full size" 
                      className="w-full h-auto rounded-lg"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {lastReceipt.merchant_name || "Unknown Merchant"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {format(new Date(lastReceipt.receipt_date), "dd/MM/yy")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Amount: {currencySymbol}{Number(lastReceipt.amount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptUpload;
