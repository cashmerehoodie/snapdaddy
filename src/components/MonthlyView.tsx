import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Receipt {
  id: string;
  amount: number;
  merchant_name: string;
  receipt_date: string;
  category: string;
}

interface MonthlyViewProps {
  userId: string;
  refreshKey?: number;
}

const MonthlyView = ({ userId, refreshKey }: MonthlyViewProps) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchMonthlyReceipts();
  }, [userId, refreshKey]);

  const fetchMonthlyReceipts = async () => {
    try {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", userId)
        .gte("receipt_date", start.toISOString())
        .lte("receipt_date", end.toISOString())
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

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading expenses...</p>
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
                <CalendarDays className="w-6 h-6 text-primary" />
                This Month
              </CardTitle>
              <CardDescription>
                {format(new Date(), "MMMM yyyy")}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {receipts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              No receipts uploaded this month yet.
              <br />
              Upload your first receipt to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between py-4">
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
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${Number(receipt.amount).toFixed(2)}
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

export default MonthlyView;
