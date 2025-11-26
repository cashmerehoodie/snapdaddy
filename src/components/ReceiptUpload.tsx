import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReceiptUploadProps {
  userId: string;
}

const ReceiptUpload = ({ userId }: ReceiptUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processedReceipt, setProcessedReceipt] = useState<{
    imageUrl: string;
    date: string;
    merchant: string;
  } | null>(null);

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

      if (accessToken && functionData?.data) {
        // Upload to Google Drive
        const driveFileName = `receipt_${functionData.data.date}_${functionData.data.merchant_name || 'unknown'}.${fileExt}`;
        
        const { data: driveData, error: driveError } = await supabase.functions.invoke('google-drive-upload', {
          body: { 
            imageUrl: publicUrl, 
            fileName: driveFileName,
            accessToken 
          }
        });

        let driveLink = '';
        if (!driveError && driveData?.webViewLink) {
          driveLink = driveData.webViewLink;
          toast.success("Saved to Google Drive!");
        }

        // Sync to Google Sheets
        const { error: sheetsError } = await supabase.functions.invoke('google-sheets-sync', {
          body: {
            accessToken,
            receiptData: {
              ...functionData.data,
              driveLink
            }
          }
        });

        if (!sheetsError) {
          toast.success("Synced to Google Sheets!");
        }
      }

      // Format date for display
      const date = new Date(functionData.data.date);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;

      setProcessedReceipt({
        imageUrl: publicUrl,
        date: formattedDate,
        merchant: functionData.data.merchant_name || 'Unknown'
      });

      toast.success("Receipt processed successfully!");
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

        {processedReceipt && (
          <div className="p-4 border border-border rounded-lg bg-secondary/20">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Last Processed Receipt</h3>
            <div className="flex items-start gap-4">
              <img 
                src={processedReceipt.imageUrl} 
                alt="Receipt thumbnail" 
                className="w-20 h-20 object-cover rounded-md border border-border"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {processedReceipt.merchant}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Date: {processedReceipt.date}
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
