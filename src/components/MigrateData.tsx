import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, CheckCircle, AlertCircle, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import SheetSelector from "./SheetSelector";

interface MigrateDataProps {
  userId: string;
}

interface ConnectionStatus {
  hasToken: boolean;
  hasRefreshToken: boolean;
  hasSheetsId: boolean;
  isFullyConnected: boolean;
}

const MigrateData = ({ userId }: MigrateDataProps) => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[] | null;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    hasToken: false,
    hasRefreshToken: false,
    hasSheetsId: false,
    isFullyConnected: false,
  });
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sheetsId, setSheetsId] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [sheetLoadError, setSheetLoadError] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    checkGoogleAccess();
  }, [userId]);

  const checkGoogleAccess = async () => {
    setCheckingConnection(true);
    try {
      // Check for stored Google token in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("google_provider_token, google_refresh_token, google_sheets_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      // Check database for saved token
      let token = profile?.google_provider_token;
      const hasRefreshToken = !!profile?.google_refresh_token;
      
      // Also check current session for a fresh token (like GoogleSettings does)
      const { data: { session } } = await supabase.auth.getSession();
      const sessionToken = session?.provider_token;
      
      // If we have a fresh session token, use it and save to database
      if (sessionToken) {
        token = sessionToken;
        const updateData: any = { 
          google_provider_token: sessionToken 
        };
        
        // Store refresh token for long-term access
        if (session?.provider_refresh_token) {
          updateData.google_refresh_token = session.provider_refresh_token;
        }
        
        await supabase
          .from("profiles")
          .update(updateData)
          .eq("user_id", userId);
      }

      const status: ConnectionStatus = {
        hasToken: !!token,
        hasRefreshToken: hasRefreshToken || !!session?.provider_refresh_token,
        hasSheetsId: !!profile?.google_sheets_id,
        isFullyConnected: !!token && !!profile?.google_sheets_id,
      };

      setAccessToken(token || null);
      setSheetsId(profile?.google_sheets_id || null);
      setConnectionStatus(status);
    } catch (error) {
      console.error("Error checking Google access:", error);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleStartMigration = () => {
    if (!connectionStatus.isFullyConnected) {
      toast.error("Please connect your Google account in Settings first");
      return;
    }
    setSheetLoadError(null);
    setShowSheetSelector(true);
  };

  const handleSheetLoadError = (error: string) => {
    setSheetLoadError(error);
  };

  const handleRetryConnection = () => {
    setSheetLoadError(null);
    setShowSheetSelector(false);
    checkGoogleAccess();
  };

  const handleMigrate = async () => {
    if (!selectedSheet) {
      toast.error("Please select a sheet to migrate");
      return;
    }

    try {
      setMigrating(true);
      setResult(null);
      toast.loading("Starting migration from Google Sheets...", { id: "migrate" });

      if (!accessToken || !sheetsId) {
        toast.error("Missing Google credentials. Please reconnect in Settings.", { id: "migrate" });
        return;
      }

      toast.loading(`Reading data from ${selectedSheet === "ALL_SHEETS" ? "all sheets" : selectedSheet}...`, { id: "migrate" });

      // Call the migration function
      const { data, error } = await supabase.functions.invoke(
        "migrate-sheets-to-supabase",
        {
          body: {
            accessToken,
            sheetsId,
            userId,
            sheetName: selectedSheet === "ALL_SHEETS" ? null : selectedSheet,
          },
        }
      );

      if (error) throw error;

      setResult({
        imported: data.imported,
        skipped: data.skipped,
        errors: data.errors,
      });

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `Migration completed with ${data.errors.length} errors. Check details below.`,
          { id: "migrate" }
        );
      } else {
        toast.success(data.message, { id: "migrate" });
      }
    } catch (error: any) {
      toast.error(error.message || "Migration failed", { id: "migrate" });
      console.error("Migration error:", error);
    } finally {
      setMigrating(false);
    }
  };

  const getConnectionStatusMessage = () => {
    if (checkingConnection) return null;
    
    const issues: string[] = [];
    
    if (!connectionStatus.hasToken) {
      issues.push("No Google access token found - you need to sign in with Google or connect Google in Settings");
    }
    if (!connectionStatus.hasSheetsId) {
      issues.push("No Google Sheets folder set up - click 'Connect Google' in Settings to create your receipt spreadsheet");
    }
    if (connectionStatus.hasToken && !connectionStatus.hasRefreshToken) {
      issues.push("Missing refresh token - your session may expire soon. Reconnect Google in Settings for persistent access");
    }
    
    return issues;
  };

  const connectionIssues = getConnectionStatusMessage();

  return (
    <Card className="max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          Migrate Old Receipts
        </CardTitle>
        <CardDescription>
          Import existing receipts from your Google Sheets into the app database.
          This is a one-time operation that won't affect your Google Sheets data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {checkingConnection && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Checking Google connection...</span>
          </div>
        )}

        {!checkingConnection && !connectionStatus.isFullyConnected && connectionIssues && connectionIssues.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Google Connection Issues</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The following issues need to be resolved before you can migrate:
                </p>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-2 ml-7">
              {connectionIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 ml-7 pt-2">
              <Button variant="outline" size="sm" onClick={handleRetryConnection}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {!checkingConnection && connectionStatus.isFullyConnected && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
            <p className="text-sm font-medium text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Google Connected
            </p>
          </div>
        )}

        {sheetLoadError && (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to Load Sheets</p>
                <p className="text-xs text-muted-foreground mt-1">{sheetLoadError}</p>
              </div>
            </div>
            <div className="flex gap-2 ml-7">
              <Button variant="outline" size="sm" onClick={handleRetryConnection}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry Connection
              </Button>
            </div>
          </div>
        )}

        <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold text-sm">What this does:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Reads receipts from selected Google Sheet(s)</li>
            <li>Imports them into the app database for faster loading</li>
            <li>Skips receipts that are already in the database</li>
            <li>Links to your Google Drive files if available</li>
            <li>Does NOT modify your Google Sheets or Drive</li>
          </ul>
        </div>

        {!showSheetSelector ? (
          <Button
            onClick={handleStartMigration}
            disabled={!connectionStatus.isFullyConnected || checkingConnection}
            className="w-full"
            size="lg"
          >
            <Database className="w-5 h-5 mr-2" />
            Choose Sheets to Migrate
          </Button>
        ) : (
          <div className="space-y-4">
            {accessToken && sheetsId && !sheetLoadError && (
              <SheetSelector
                accessToken={accessToken}
                spreadsheetId={sheetsId}
                onSheetSelect={setSelectedSheet}
                selectedSheet={selectedSheet}
                onError={handleSheetLoadError}
              />
            )}
            
            <Button
              onClick={handleMigrate}
              disabled={migrating || !selectedSheet || !!sheetLoadError}
              className="w-full"
              size="lg"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Start Migration
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-primary/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Migration Results:</p>
                <p className="text-sm">✅ {result.imported} receipts imported</p>
                <p className="text-sm">⏭️ {result.skipped} already existed (skipped)</p>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-destructive">Errors ({result.errors.length}):</p>
                  <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto space-y-1">
                    {result.errors.map((error, idx) => (
                      <p key={idx}>• {error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MigrateData;
