import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Camera, X } from "lucide-react";
import { toast } from "sonner";

const PhoneUpload = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sessionId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/phone-upload?sessionId=${sessionId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadComplete(true);
      toast.success("Receipt uploaded successfully!");
      
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Upload Complete!</h1>
          <p className="text-muted-foreground mb-6">
            Your receipt has been uploaded and is being processed. You can close this window now.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Upload Receipt</h1>
          <p className="text-sm text-muted-foreground">
            Take a photo or upload an image of your receipt
          </p>
        </div>

        {!selectedFile ? (
          <div className="space-y-4">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
                id="camera-input"
              />
              <Button
                asChild
                className="w-full h-32 gap-3"
                variant="outline"
              >
                <label htmlFor="camera-input" className="cursor-pointer">
                  <Camera className="w-8 h-8" />
                  <span>Take Photo</span>
                </label>
              </Button>
            </label>

            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <Button
                asChild
                className="w-full h-32 gap-3"
                variant="outline"
              >
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8" />
                  <span>Choose from Gallery</span>
                </label>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={previewUrl || ""}
                alt="Receipt preview"
                className="w-full rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full h-12"
            >
              {uploading ? "Uploading..." : "Upload Receipt"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PhoneUpload;
