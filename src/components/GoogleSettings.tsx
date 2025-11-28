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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    
    // Check if we just came back from Google OAuth
    const wasConnecting = localStorage.getItem(`google_connecting_${userId}`);
    if (wasConnecting === "true") {
      localStorage.removeItem(`google_connecting_${userId}`);
      // Force a recheck after a short delay to ensure token is saved
      setTimeout(() => {
        checkGoogleConnection();
        fetchSettings();
      }, 1500);
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
    // First check if we have a saved token in the database
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_provider_token, google_sheets_id, google_drive_folder")
      .eq("user_id", userId)
      .single();
    
    // If we have a saved token in the database, consider connected
    const hasSavedToken = !!profile?.google_provider_token;
    
    // Also check current session for a fresh token
    const { data: { session } } = await supabase.auth.getSession();
    const hasSessionToken = !!session?.provider_token;
    
    // Connected if we have either a saved token OR a fresh session token
    setIsConnected(hasSavedToken || hasSessionToken);
    
    // Update the token if we have a fresh one from the session
    if (hasSessionToken && session.provider_token) {
      await supabase
        .from("profiles")
        .update({ google_provider_token: session.provider_token })
        .eq("user_id", userId);
    }
    
    // Load saved sheets ID and folder name from database
    if (profile?.google_sheets_id) {
      setSheetsId(profile.google_sheets_id);
    }
    if (profile?.google_drive_folder) {
      setDriveFolder(profile.google_drive_folder);
    }
    
    // Check if there's a saved mode preference
    const savedMode = localStorage.getItem(`google_setup_mode_${userId}`);
    
    // If connected and no sheets configured yet, show choice (unless user already picked)
    if ((hasSavedToken || hasSessionToken) && !profile?.google_sheets_id && !savedMode) {
      const newMode = 'choice';
      setSetupMode(newMode);
      localStorage.setItem(`google_setup_mode_${userId}`, newMode);
    } else if (profile?.google_sheets_id) {
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
      
      // Get current provider token to ensure it's preserved
      const { data: { session } } = await supabase.auth.getSession();
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("google_provider_token")
        .eq("user_id", userId)
        .single();
      
      const updateData: any = {
        user_id: userId,
        google_sheets_id: cleanSheetId,
        google_drive_folder: driveFolder || 'SnapDaddy Receipts'
      };
      
      // Preserve existing token or use fresh one from session
      if (session?.provider_token) {
        updateData.google_provider_token = session.provider_token;
      } else if (currentProfile?.google_provider_token) {
        updateData.google_provider_token = currentProfile.google_provider_token;
      }
      
      const { error } = await supabase
        .from("profiles")
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Save settings to localStorage as backup
      localStorage.setItem(`google_sheets_id_${userId}`, cleanSheetId);
      localStorage.setItem(`google_drive_folder_${userId}`, driveFolder || 'SnapDaddy Receipts');
      localStorage.setItem(`google_settings_saved_${userId}`, Date.now().toString());

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
    try {
      // Save a flag indicating we're connecting to Google
      localStorage.setItem(`google_connecting_${userId}`, "true");
      localStorage.setItem(`google_connecting_timestamp_${userId}`, Date.now().toString());
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
          redirectTo: window.location.origin + "/dashboard",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        localStorage.removeItem(`google_connecting_${userId}`);
        toast.error(error.message || "Failed to connect Google");
      }
    } catch (error: any) {
      localStorage.removeItem(`google_connecting_${userId}`);
      toast.error(error.message || "Failed to connect Google");
    }
  };

  const handleAutoSetup = async () => {
    setAutoSetupLoading(true);
    const toastId = toast.loading("Creating your Google Sheet and Drive folder...");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        toast.error("Please connect Google first", { id: toastId });
        return;
      }

      const { data, error } = await supabase.functions.invoke('setup-google-storage', {
        body: {
          accessToken,
          userId,
          folderName: driveFolder || 'SnapDaddy Receipts'
        }
      });

      if (error) {
        console.error("Setup error:", error);
        throw new Error(error.message || "Failed to create Google Drive folder and Sheet");
      }

      if (!data || !data.spreadsheetId || !data.folderId) {
        throw new Error("Setup completed but didn't return expected data");
      }

      setSheetsId(data.spreadsheetId);
      setDriveFolder(data.folderName);
      handleSetupModeChange('manual');
      
      toast.success(
        <div>
          <p className="font-semibold">Setup complete! 🎉</p>
          <p className="text-xs mt-1">Created Drive folder and Google Sheet</p>
          <a 
            href={data.spreadsheetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs underline block mt-1"
          >
            Open your new spreadsheet
          </a>
        </div>,
        { id: toastId, duration: 5000 }
      );
    } catch (error: any) {
      console.error("Auto-setup error:", error);
      toast.error(
        <div>
          <p className="font-semibold">Setup failed</p>
          <p className="text-xs mt-1">{error.message || "Failed to auto-setup Google integration"}</p>
        </div>,
        { id: toastId }
      );
    } finally {
      setAutoSetupLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">How to Set Up</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>How to Set Up</DialogTitle>
          <DialogDescription>
            Choose your preferred integration method
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="google" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google">Google</TabsTrigger>
            <TabsTrigger value="excel">Excel / OneDrive</TabsTrigger>
          </TabsList>

          <TabsContent value="google" className="space-y-4 py-4">
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
          {isConnected && (
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

          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !sheetsId || !driveFolder}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
          </TabsContent>

          <TabsContent value="excel" className="space-y-4 py-4">
            <div className="p-8 text-center border rounded-lg bg-muted/30">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold mb-2">Excel / OneDrive Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Coming soon! Export your receipts to Excel and OneDrive.
              </p>
              <p className="text-xs text-muted-foreground">
                This feature will allow you to sync your receipt data with Microsoft Excel 
                and store receipt images in OneDrive.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleSettings;