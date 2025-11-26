import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";

interface MonthlyTotal {
  month: string;
  total: number;
}

interface YearlyViewProps {
  userId: string;
}

const YearlyView = ({ userId }: YearlyViewProps) => {
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotal[]>([]);
  const [yearTotal, setYearTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchYearlyReceipts();
  }, [userId]);

  const fetchYearlyReceipts = async () => {
    try {
      const now = new Date();
      const start = startOfYear(now);
      const end = endOfYear(now);

      const { data, error } = await supabase
        .from("receipts")
        .select("amount, receipt_date")
        .eq("user_id", userId)
        .gte("receipt_date", start.toISOString())
        .lte("receipt_date", end.toISOString());

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

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading yearly data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                Year Overview
              </CardTitle>
              <CardDescription>{format(new Date(), "yyyy")}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Total Yearly Expenses</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ${yearTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {monthlyTotals.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              No expenses recorded this year yet.
              <br />
              Start uploading receipts to track your yearly spending!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {monthlyTotals.map((item) => (
            <Card
              key={item.month}
              className="border-border/50 hover:shadow-md transition-shadow"
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
                    ${item.total.toFixed(2)}
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
