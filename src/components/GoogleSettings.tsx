import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface GoogleSettingsProps {
  userId: string;
}

const GoogleSettings = ({ userId }: GoogleSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [sheetsId, setSheetsId] = useState("");
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    fetchSheetsId();
  }, [userId]);

  const checkGoogleConnection = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsConnected(!!session?.provider_token);
  };

  const fetchSheetsId = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("google_sheets_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.google_sheets_id) {
      setSheetsId(data.google_sheets_id);
    }
  };

  const extractSheetId = (input: string): string => {
    // If it's a URL, extract the ID
    const urlMatch = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    // Otherwise return as-is (assume it's already just the ID)
    return input;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanSheetId = extractSheetId(sheetsId);
      
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          user_id: userId,
          google_sheets_id: cleanSheetId 
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSheetsId(cleanSheetId); // Update state with clean ID
      toast.success("Google Sheets ID saved!");
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleConnect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
        redirectTo: window.location.href,
      },
    });

    if (error) {
      toast.error(error.message || "Failed to connect Google");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Google Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Google Integration Settings</DialogTitle>
          <DialogDescription>
            Configure your Google Drive and Sheets integration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isConnected ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
              }`}>
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {isConnected ? "Connected to Google" : "Not Connected"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? "Your receipts will sync to Drive & Sheets" 
                    : "Connect to enable automatic syncing"}
                </p>
              </div>
            </div>
            {!isConnected && (
              <Button onClick={handleGoogleConnect} size="sm">
                Connect
              </Button>
            )}
          </div>

          {/* Google Sheets ID */}
          <div className="space-y-2">
            <Label htmlFor="sheets-id">Google Sheets ID</Label>
            <Input
              id="sheets-id"
              placeholder="Paste Google Sheets URL or ID"
              value={sheetsId}
              onChange={(e) => setSheetsId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full Google Sheets URL or just the ID:
              <br />
              <code className="text-xs">
                https://docs.google.com/spreadsheets/d/<span className="text-primary font-semibold">[ID]</span>/edit
              </code>
            </p>
          </div>

          {/* Drive Folder Info */}
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium mb-2">📁 Drive Folder</p>
            <p className="text-xs text-muted-foreground">
              Receipts are automatically uploaded to a folder called <strong>"SnapDaddy Receipts"</strong> in your Google Drive.
              This folder will be created automatically on your first upload.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !sheetsId}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSettings;