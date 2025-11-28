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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);

  

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      const urls = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...urls]);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
      const urls = files.map((file) => URL.createObjectURL(file));
      setPreviewUrls((prev) => [...prev, ...urls]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearSelection = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !sessionId) return;

    setUploading(true);
    setUploadedCount(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        toast.loading(`Uploading receipt ${i + 1} of ${selectedFiles.length}...`, {
          id: `upload-${i}`,
        });

        const formData = new FormData();
        formData.append("file", file);

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

        setUploadedCount(i + 1);
        toast.success(`Receipt ${i + 1} uploaded!`, { id: `upload-${i}` });
      }

      setUploadComplete(true);
      toast.success(`All ${selectedFiles.length} receipts uploaded successfully!`);

      // Clean up preview URLs
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
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
            {uploadedCount} receipt{uploadedCount > 1 ? "s" : ""} uploaded and being processed. You can close this window now.
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

        {selectedFiles.length === 0 ? (
          <div className="space-y-4">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleCameraCapture}
                className="hidden"
                id="camera-input"
              />
              <Button
                asChild
                className="w-full h-32 gap-3 flex-col"
                variant="outline"
              >
                <label htmlFor="camera-input" className="cursor-pointer">
                  <Camera className="w-8 h-8" />
                  <span className="font-semibold">Take Photos</span>
                  <span className="text-xs text-muted-foreground">Select multiple</span>
                </label>
              </Button>
            </label>

            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <Button
                asChild
                className="w-full h-32 gap-3 flex-col"
                variant="outline"
              >
                <label htmlFor="file-input" className="cursor-pointer">
                  <Upload className="w-8 h-8" />
                  <span className="font-semibold">Choose from Gallery</span>
                  <span className="text-xs text-muted-foreground">Select multiple</span>
                </label>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Receipt preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {selectedFiles.length} receipt{selectedFiles.length > 1 ? "s" : ""} selected
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="add-more-input"
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    disabled={uploading}
                  >
                    <label htmlFor="add-more-input" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Add More
                    </label>
                  </Button>
                </label>
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  disabled={uploading}
                >
                  Clear All
                </Button>
              </div>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full h-12"
              >
                {uploading ? `Uploading ${uploadedCount}/${selectedFiles.length}...` : `Upload ${selectedFiles.length} Receipt${selectedFiles.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PhoneUpload;
