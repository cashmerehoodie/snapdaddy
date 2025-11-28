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
  const [driveFolder, setDriveFolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [setupMode, setSetupMode] = useState<'choice' | 'auto' | 'manual' | null>(null);
  const [autoSetupLoading, setAutoSetupLoading] = useState(false);

  useEffect(() => {
    checkGoogleConnection();
    fetchSettings();
    // Load saved setup mode from localStorage
    const savedMode = localStorage.getItem(`google_setup_mode_${userId}`);
    if (savedMode && (savedMode === 'choice' || savedMode === 'manual')) {
      setSetupMode(savedMode as 'choice' | 'manual');
    }
  }, [userId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("google_sheets_id, google_drive_folder")
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.google_sheets_id) {
      setSheetsId(data.google_sheets_id);
    }
    if (data?.google_drive_folder) {
      setDriveFolder(data.google_drive_folder);
    }
  };

  const checkGoogleConnection = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const hasToken = !!session?.provider_token;
    setIsConnected(hasToken);
    
    // Check if there's a saved mode preference
    const savedMode = localStorage.getItem(`google_setup_mode_${userId}`);
    
    // If connected and no sheets configured yet, show choice (unless user already picked)
    if (hasToken && !sheetsId && !savedMode) {
      const newMode = 'choice';
      setSetupMode(newMode);
      localStorage.setItem(`google_setup_mode_${userId}`, newMode);
    } else if (sheetsId) {
      const newMode = 'manual';
      setSetupMode(newMode); // Already configured
      localStorage.setItem(`google_setup_mode_${userId}`, newMode);
    }
  };

  const handleSetupModeChange = (mode: 'choice' | 'manual') => {
    setSetupMode(mode);
    localStorage.setItem(`google_setup_mode_${userId}`, mode);
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
          google_sheets_id: cleanSheetId,
          google_drive_folder: driveFolder || 'SnapDaddy Receipts'
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setSheetsId(cleanSheetId); // Update state with clean ID
      toast.success("Settings saved!");
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

  const handleAutoSetup = async () => {
    setAutoSetupLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        toast.error("Please connect Google first");
        return;
      }

      toast.loading("Creating your Google Sheet and Drive folder...");

      const { data, error } = await supabase.functions.invoke('setup-google-storage', {
        body: {
          accessToken,
          userId,
          folderName: driveFolder || 'SnapDaddy Receipts'
        }
      });

      if (error) throw error;

      setSheetsId(data.spreadsheetId);
      setDriveFolder(data.folderName);
      handleSetupModeChange('manual');
      
      toast.success(
        <div>
          <p className="font-semibold">Setup complete! 🎉</p>
          <a 
            href={data.spreadsheetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            Open your new spreadsheet
          </a>
        </div>
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to auto-setup");
      console.error("Auto-setup error:", error);
    } finally {
      setAutoSetupLoading(false);
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

          {/* Setup Choice - shown after connecting but before configuring */}
          {setupMode === 'choice' && (
            <div className="space-y-4 p-4 bg-primary/5 border rounded-lg">
              <div>
                <h3 className="font-semibold mb-2">Choose Setup Method</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  How would you like to set up your Google integration?
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={handleAutoSetup} 
                  disabled={autoSetupLoading}
                  className="h-auto py-4 flex-col items-start"
                >
                  <span className="font-semibold">🚀 Quick Setup (Recommended)</span>
                  <span className="text-xs opacity-90 font-normal">
                    We'll create a new Sheet and Drive folder for you automatically
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleSetupModeChange('manual')}
                  className="h-auto py-4 flex-col items-start"
                >
                  <span className="font-semibold">📋 Use Existing Sheet</span>
                  <span className="text-xs opacity-70 font-normal">
                    I already have a Google Sheet I want to use
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Manual Setup Form - shown when manual is chosen or already configured */}
          {setupMode === 'manual' && (
            <>
          {isConnected && !sheetsId && (
            <div className="flex justify-start mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSetupModeChange('choice')}
                className="gap-2"
              >
                ← Back to setup options
              </Button>
            </div>
          )}

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
          <div className="space-y-2">
            <Label htmlFor="drive-folder">Google Drive Folder Name</Label>
            <Input
              id="drive-folder"
              placeholder="SnapDaddy Receipts"
              value={driveFolder}
              onChange={(e) => setDriveFolder(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              All receipts will be saved to this folder in your Google Drive.
              If the folder doesn't exist, it will be created automatically.
            </p>
          </div>

          {/* Info box */}
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium mb-2">📁 Current folder</p>
            <p className="text-sm font-mono text-primary">
              {driveFolder || 'SnapDaddy Receipts'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              You can organize receipts by using different folder names like "Work Receipts" or "Personal Expenses"
            </p>
          </div>
          </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !sheetsId || !driveFolder}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSettings;