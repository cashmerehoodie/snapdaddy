import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface Sheet {
  name: string;
  sheetId: number;
}

interface SheetSelectorProps {
  accessToken: string;
  spreadsheetId: string;
  onSheetSelect: (sheetName: string) => void;
  selectedSheet: string | null;
}

const SheetSelector = ({ accessToken, spreadsheetId, onSheetSelect, selectedSheet }: SheetSelectorProps) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    fetchSheets();
  }, [spreadsheetId, accessToken]);

  const fetchSheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sheets");
      }

      const data = await response.json();
      const sheetList = (data.sheets || [])
        .map((sheet: any) => ({
          name: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
        }))
        .filter((sheet: Sheet) => !sheet.name.startsWith("_")); // Filter out system sheets

      setSheets(sheetList);
    } catch (error) {
      console.error("Error fetching sheets:", error);
      toast.error("Failed to load sheets from your Google Sheets");
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
