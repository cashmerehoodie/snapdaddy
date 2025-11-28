import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Smartphone, Loader2, CheckCircle2, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface PhoneUploadQRProps {
  userId: string;
  onUploadComplete: () => void;
}

const PhoneUploadQR = ({ userId, onUploadComplete }: PhoneUploadQRProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setUploadUrl("");
      setSessionId("");
      setExpiresAt(null);
      setUploadComplete(false);
      setTimeRemaining("");
    }
  }, [open]);

  useEffect(() => {
    if (!sessionId) return;

    // Set up realtime subscription for this specific session
    const channel = supabase
      .channel(`upload-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload_sessions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session updated:', payload);
          if (payload.new.status === 'uploaded') {
            setUploadComplete(true);
            toast.success("Receipt uploaded from phone!");
            onUploadComplete();
            
            // Close dialog after a short delay
            setTimeout(() => {
              setOpen(false);
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onUploadComplete]);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        clearInterval(interval);
        toast.error("Session expired. Please create a new one.");
        setOpen(false);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const createUploadSession = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-upload-session",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;

      // Construct the upload URL using the current app origin
      const uploadUrl = `${window.location.origin}/upload/${data.sessionId}`;
      
      setUploadUrl(uploadUrl);
      setSessionId(data.sessionId);
      setExpiresAt(new Date(data.expiresAt));
      toast.success("QR code generated!");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create upload session");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !uploadUrl) {
      createUploadSession();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Smartphone className="w-4 h-4" />
          Upload With Phone
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload from Phone</DialogTitle>
          <DialogDescription>
            Scan this QR code with your phone to upload a receipt
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating QR code...</p>
            </div>
          ) : uploadComplete ? (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold">Upload Complete!</p>
              <p className="text-sm text-muted-foreground text-center">
                Your receipt has been uploaded and is being processed
              </p>
            </div>
          ) : uploadUrl ? (
            <>
              <Card className="p-4 bg-white">
                <QRCodeSVG
                  value={uploadUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </Card>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Expires in: <span className="font-semibold text-foreground">{timeRemaining}</span>
                </span>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm font-medium">How to use:</p>
                <ol className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>1. Open your phone's camera</li>
                  <li>2. Scan the QR code above</li>
                  <li>3. Take a photo of your receipt</li>
                  <li>4. Upload and we'll do the rest!</li>
                </ol>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneUploadQR;
