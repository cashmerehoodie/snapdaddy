import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, DollarSign, Trash2, CheckSquare, X, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, startOfYear, endOfYear } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Receipt {
  id: string;
  amount: number;
  merchant_name: string;
  receipt_date: string;
  category: string;
  image_url: string;
}

interface MonthlyViewProps {
  userId: string;
  currencySymbol: string;
}

const MonthlyView = ({ userId, currencySymbol }: MonthlyViewProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableMonths();
  }, [userId]);

  useEffect(() => {
    fetchMonthlyReceipts();
  }, [userId, selectedDate]);

  const fetchAvailableMonths = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("receipt_date")
        .eq("user_id", userId)
        .order("receipt_date", { ascending: false });

      if (error) throw error;

      // Extract unique year-month combinations
      const months = new Set<string>();
      (data || []).forEach(receipt => {
        const date = new Date(receipt.receipt_date);
        months.add(format(date, "yyyy-MM"));
      });

      setAvailableMonths(Array.from(months).sort().reverse());
    } catch (error) {
      console.error("Error fetching available months:", error);
    }
  };

  const fetchMonthlyReceipts = async () => {
    try {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);

      // Format dates as YYYY-MM-DD for comparison with date column
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", userId)
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate)
        .order("receipt_date", { ascending: false });

      if (error) throw error;

      setReceipts(data || []);
      const sum = (data || []).reduce((acc, receipt) => acc + Number(receipt.amount), 0);
      setTotal(sum);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleDelete = async (receiptId: string, imageUrl: string) => {
    try {
      toast.loading("Deleting receipt...", { id: "delete-receipt" });

      // Delete from storage
      const fileName = imageUrl.split("/").pop();
      if (fileName) {
        const filePath = `${userId}/${fileName}`;
        await supabase.storage.from("receipts").remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receiptId);

      if (error) throw error;

      toast.success("Receipt deleted successfully", { id: "delete-receipt" });
      
      // Refresh the list
      await fetchMonthlyReceipts();
      await fetchAvailableMonths();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete receipt", { id: "delete-receipt" });
      console.error("Delete error:", error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      toast.loading(`Deleting ${selectedIds.size} receipt(s)...`, { id: "delete-multiple" });

      // Get receipts to delete for storage cleanup
      const receiptsToDelete = receipts.filter(r => selectedIds.has(r.id));
      
      // Delete from storage
      const filePaths = receiptsToDelete
        .map(r => {
          const fileName = r.image_url.split("/").pop();
          return fileName ? `${userId}/${fileName}` : null;
        })
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        await supabase.storage.from("receipts").remove(filePaths);
      }

      // Delete from database
      const { error } = await supabase
        .from("receipts")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} receipt(s) deleted successfully`, { id: "delete-multiple" });
      
      // Reset selection state
      setSelectedIds(new Set());
      setIsSelecting(false);
      
      // Refresh the list
      await fetchMonthlyReceipts();
      await fetchAvailableMonths();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete receipts", { id: "delete-multiple" });
      console.error("Delete error:", error);
    }
  };

  const toggleSelectReceipt = (receiptId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(receiptId)) {
      newSelected.delete(receiptId);
    } else {
      newSelected.add(receiptId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === receipts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(receipts.map(r => r.id)));
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading expenses...</p>
        </CardContent>
      </Card>
    );
  }

  const isCurrentMonth = format(selectedDate, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-primary" />
                  {format(selectedDate, "MMMM yyyy")}
                </CardTitle>
                {!isCurrentMonth && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={goToToday}
                    className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                  >
                    Back to current month
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {receipts.length > 0 && !isSelecting && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelecting(true)}
                  className="gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select
                </Button>
              )}
              {isSelecting && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="gap-2"
                  >
                    {selectedIds.size === receipts.length ? "Deselect All" : "Select All"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedIds.size === 0}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete ({selectedIds.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} Receipt(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedIds.size} selected receipt(s)? 
                          This action cannot be undone and will remove them from your records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsSelecting(false);
                      setSelectedIds(new Set());
                    }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </>
              )}
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {currencySymbol}{total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {availableMonths.length > 1 && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-muted-foreground w-full mb-2">Quick jump to:</p>
              {availableMonths.map((monthKey) => {
                const monthDate = new Date(monthKey + "-01");
                const isSelected = format(selectedDate, "yyyy-MM") === monthKey;
                return (
                  <Button
                    key={monthKey}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDate(monthDate)}
                    className="text-xs"
                  >
                    {format(monthDate, "MMM yyyy")}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {receipts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              No receipts found for {format(selectedDate, "MMMM yyyy")}.
              {!isCurrentMonth && (
                <>
                  <br />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={goToToday}
                    className="p-0 h-auto text-sm"
                  >
                    Go to current month
                  </Button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <Card 
              key={receipt.id} 
              className={`border-border/50 hover:shadow-md transition-all ${
                isSelecting ? 'cursor-pointer' : ''
              } ${selectedIds.has(receipt.id) ? 'ring-2 ring-primary' : ''}`}
              onClick={() => isSelecting && toggleSelectReceipt(receipt.id)}
            >
              <CardContent className="flex items-center justify-between py-4">
                {isSelecting && (
                  <div className="mr-4">
                    <Checkbox
                      checked={selectedIds.has(receipt.id)}
                      onCheckedChange={() => toggleSelectReceipt(receipt.id)}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {receipt.merchant_name || "Unknown Merchant"}
                    </h3>
                    {receipt.category && (
                      <Badge variant="secondary" className="text-xs">
                        {receipt.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(receipt.receipt_date), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {currencySymbol}{Number(receipt.amount).toFixed(2)}
                    </p>
                  </div>
                  {!isSelecting && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this receipt from {receipt.merchant_name || "Unknown Merchant"}? 
                            This action cannot be undone and will remove the receipt from your records.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(receipt.id, receipt.image_url)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyView;
