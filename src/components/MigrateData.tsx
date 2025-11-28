import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MigrateDataProps {
  userId: string;
}

const MigrateData = ({ userId }: MigrateDataProps) => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[] | null;
  } | null>(null);

  const handleMigrate = async () => {
    try {
      setMigrating(true);
      setResult(null);
      toast.loading("Starting migration from Google Sheets...", { id: "migrate" });

      // Get user's Google access token and sheets ID
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.provider_token;

      if (!accessToken) {
        toast.error("Please connect your Google account first", { id: "migrate" });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("google_sheets_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.google_sheets_id) {
        toast.error("Please configure your Google Sheets ID first", { id: "migrate" });
        return;
      }

      toast.loading("Reading data from Google Sheets...", { id: "migrate" });

      // Call the migration function
      const { data, error } = await supabase.functions.invoke(
        "migrate-sheets-to-supabase",
        {
          body: {
            accessToken,
            sheetsId: profile.google_sheets_id,
            userId,
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
        <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold text-sm">What this does:</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Reads all receipts from your Google Sheets</li>
            <li>Imports them into the app database for faster loading</li>
            <li>Skips receipts that are already in the database</li>
            <li>Links to your Google Drive files if available</li>
            <li>Does NOT modify your Google Sheets or Drive</li>
          </ul>
        </div>

        <Button
          onClick={handleMigrate}
          disabled={migrating}
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
