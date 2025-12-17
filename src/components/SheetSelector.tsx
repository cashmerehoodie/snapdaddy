import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";

interface Sheet {
  name: string;
  sheetId: number;
}

interface SheetSelectorProps {
  accessToken: string;
  spreadsheetId: string;
  onSheetSelect: (sheetName: string) => void;
  selectedSheet: string | null;
  onError?: (error: string) => void;
}

const SheetSelector = ({ accessToken, spreadsheetId, onSheetSelect, selectedSheet, onError }: SheetSelectorProps) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSheets();
  }, [spreadsheetId, accessToken]);

  const getErrorMessage = (status: number, statusText: string, responseBody?: any): string => {
    switch (status) {
      case 401:
        return "Your Google access token has expired. Please go to Settings and reconnect Google to refresh your access.";
      case 403:
        return "Access denied to this spreadsheet. Make sure the Google account you're using has permission to access this spreadsheet, or reconnect Google in Settings.";
      case 404:
        return "The spreadsheet could not be found. It may have been deleted or moved. Please reconnect Google in Settings to create a new spreadsheet.";
      case 400:
        return "Invalid spreadsheet ID. Please reconnect Google in Settings to set up a valid spreadsheet.";
      default:
        return `Failed to load sheets (Error ${status}${statusText ? `: ${statusText}` : ''}). Please try reconnecting Google in Settings.`;
    }
  };

  const fetchSheets = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        let responseBody;
        try {
          responseBody = await response.json();
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        const errorMsg = getErrorMessage(response.status, response.statusText, responseBody);
        setErrorMessage(errorMsg);
        onError?.(errorMsg);
        return;
      }

      const data = await response.json();
      const sheetList = (data.sheets || [])
        .map((sheet: any) => ({
          name: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
        }))
        .filter((sheet: Sheet) => !sheet.name.startsWith("_")); // Filter out system sheets

      setSheets(sheetList);
      
      if (sheetList.length === 0) {
        const emptyMsg = "No sheets found in this spreadsheet. The spreadsheet may be empty or only contain system sheets.";
        setErrorMessage(emptyMsg);
        onError?.(emptyMsg);
      }
    } catch (error) {
      console.error("Error fetching sheets:", error);
      const networkMsg = "Network error while loading sheets. Please check your internet connection and try again.";
      setErrorMessage(networkMsg);
      onError?.(networkMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading sheets...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-4 border border-destructive/30 rounded-lg bg-destructive/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to Load Sheets</p>
            <p className="text-xs text-muted-foreground mt-1">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="p-4 border border-border rounded-lg bg-secondary/20 text-center">
        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No sheets found in this spreadsheet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Select Sheet to Migrate</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectAll(!selectAll);
            onSheetSelect(selectAll ? "" : "ALL_SHEETS");
          }}
        >
          {selectAll ? "Deselect All" : "Select All Sheets"}
        </Button>
      </div>

      {selectAll ? (
        <div className="p-4 border border-primary rounded-lg bg-primary/5">
          <p className="text-sm font-medium">
            ✓ All {sheets.length} sheets will be migrated
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {sheets.map((s) => s.name).join(", ")}
          </p>
        </div>
      ) : (
        <RadioGroup value={selectedSheet || ""} onValueChange={onSheetSelect}>
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
            {sheets.map((sheet) => (
              <div
                key={sheet.sheetId}
                className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/50"
              >
                <RadioGroupItem value={sheet.name} id={`sheet-${sheet.sheetId}`} />
                <Label
                  htmlFor={`sheet-${sheet.sheetId}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {sheet.name}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}
    </div>
  );
};

export default SheetSelector;
