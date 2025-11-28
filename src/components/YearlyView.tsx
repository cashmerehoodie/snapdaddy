import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Trash2 } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";
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

interface MonthlyTotal {
  month: string;
  total: number;
}

interface YearlyViewProps {
  userId: string;
  currencySymbol: string;
}

const YearlyView = ({ userId, currencySymbol }: YearlyViewProps) => {
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [yearTotal, setYearTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    fetchAvailableYears();
  }, [userId]);

  useEffect(() => {
    if (selectedYear) {
      fetchYearlyReceipts();
    }
  }, [userId, selectedYear]);

  // Realtime subscription for receipt deletions
  useEffect(() => {
    const channel = supabase
      .channel('yearly-view-receipts')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // Refresh data when receipts are deleted
          fetchAvailableYears();
          fetchYearlyReceipts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("receipt_date")
        .eq("user_id", userId);

      if (error) throw error;

      const years = new Set<number>();
      (data || []).forEach((receipt) => {
        const year = new Date(receipt.receipt_date).getFullYear();
        years.add(year);
      });

      const sortedYears = Array.from(years).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error("Error fetching available years:", error);
    }
  };

  const fetchYearlyReceipts = async () => {
    try {
      const start = startOfYear(new Date(selectedYear, 0, 1));
      const end = endOfYear(new Date(selectedYear, 0, 1));

      // Format dates as YYYY-MM-DD for comparison with date column
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("receipts")
        .select("amount, receipt_date")
        .eq("user_id", userId)
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate);

      if (error) throw error;

      // Group by month
      const monthMap = new Map<string, number>();
      let total = 0;

      (data || []).forEach((receipt) => {
        const month = format(new Date(receipt.receipt_date), "MMM yyyy");
        const amount = Number(receipt.amount);
        monthMap.set(month, (monthMap.get(month) || 0) + amount);
        total += amount;
      });

      const sortedMonths = Array.from(monthMap.entries())
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      setMonthlyTotals(sortedMonths);
      setYearTotal(total);
    } catch (error) {
      console.error("Error fetching yearly receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async (year: number) => {
    try {
      toast.loading(`Deleting all receipts from ${year}...`, { id: "delete-year" });

      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 0, 1));
      const startDate = format(start, "yyyy-MM-dd");
      const endDate = format(end, "yyyy-MM-dd");

      // Get all receipts for this year
      const { data: receiptsToDelete, error: fetchError } = await supabase
        .from("receipts")
        .select("id, image_url")
        .eq("user_id", userId)
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate);

      if (fetchError) throw fetchError;

      if (!receiptsToDelete || receiptsToDelete.length === 0) {
        toast.error("No receipts found for this year", { id: "delete-year" });
        return;
      }

      // Delete from storage
      const filePaths = receiptsToDelete
        .map((r) => {
          const fileName = r.image_url.split("/").pop();
          return fileName ? `${userId}/${fileName}` : null;
        })
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        await supabase.storage.from("receipts").remove(filePaths);
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from("receipts")
        .delete()
        .eq("user_id", userId)
        .gte("receipt_date", startDate)
        .lte("receipt_date", endDate);

      if (deleteError) throw deleteError;

      toast.success(`Successfully deleted ${receiptsToDelete.length} receipts from ${year}`, { id: "delete-year" });

      // Refresh data
      await fetchAvailableYears();
      
      // If deleted current year, switch to most recent available year
      if (year === selectedYear && availableYears.length > 1) {
        const otherYears = availableYears.filter(y => y !== year);
        if (otherYears.length > 0) {
          setSelectedYear(otherYears[0]);
        }
      } else if (availableYears.length === 1) {
        // If this was the only year, reset view
        setMonthlyTotals([]);
        setYearTotal(0);
      } else {
        await fetchYearlyReceipts();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete receipts", { id: "delete-year" });
      console.error("Delete year error:", error);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-6xl mx-auto border-border/50 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading yearly data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <Card className="border-border/50 shadow-lg animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                Year Overview
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {selectedYear}
                {availableYears.length > 0 && (
                    <div className="flex gap-1 ml-4">
                      {availableYears.map((year) => (
                        <div key={year} className="relative inline-block group">
                          <Button
                            variant={year === selectedYear ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedYear(year)}
                            className="pr-8 transition-all duration-300 hover:scale-105"
                          >
                            {year}
                          </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete All Receipts from {year}</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete all receipts from {year}? This action cannot be undone and will permanently remove all receipts and their associated images from this year.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteYear(year)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete All
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Total Yearly Expenses</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {currencySymbol}{yearTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {monthlyTotals.length === 0 ? (
        <Card className="border-border/50 shadow-lg animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-center">
              No expenses recorded this year yet.
              <br />
              Start uploading receipts to track your yearly spending!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {monthlyTotals.map((item, index) => (
            <Card
              key={item.month}
              className="border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="flex items-center justify-between py-6">
                <div>
                  <h3 className="font-semibold text-lg mb-1">{item.month}</h3>
                  <p className="text-sm text-muted-foreground">
                    Monthly expenses
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {currencySymbol}{item.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((item.total / yearTotal) * 100).toFixed(1)}% of year
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default YearlyView;
