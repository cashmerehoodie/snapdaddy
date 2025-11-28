import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Tag } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  count: number;
}

interface CategoryViewProps {
  userId: string;
  currencySymbol: string;
}

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(270 60% 75%)",
  "hsl(280 65% 65%)",
  "hsl(260 70% 70%)",
  "hsl(290 60% 68%)",
  "hsl(270 55% 60%)",
  "hsl(275 65% 72%)",
  "hsl(285 60% 65%)",
  "hsl(265 70% 68%)",
];

const CategoryView = ({ userId, currencySymbol }: CategoryViewProps) => {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCategoryData();
  }, [userId]);

  // Realtime subscription for receipt changes
  useEffect(() => {
    const channel = supabase
      .channel('category-view-receipts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchCategoryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("receipts")
        .select("amount, category")
        .eq("user_id", userId);

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { total: number; count: number }>();

      (data || []).forEach((receipt) => {
        const category = receipt.category || "Uncategorized";
        const amount = Number(receipt.amount);
        const current = categoryMap.get(category) || { total: 0, count: 0 };
        categoryMap.set(category, {
          total: current.total + amount,
          count: current.count + 1
        });
      });

      const categories = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          name,
          value: data.total,
          count: data.count
        }))
        .sort((a, b) => b.value - a.value);

      setCategoryData(categories);
      
      const totalAmount = categories.reduce((sum, cat) => sum + cat.value, 0);
      setTotal(totalAmount);
    } catch (error) {
      console.error("Error fetching category data:", error);
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

  if (categoryData.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Expenses by Category
          </CardTitle>
          <CardDescription>No receipts found</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Upload some receipts to see your expense breakdown by category
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Expenses by Category
          </CardTitle>
          <CardDescription>
            Total spending across all categories: <span className="font-semibold text-foreground">{currencySymbol}{total.toFixed(2)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-foreground">{data.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {data.count} receipt{data.count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {currencySymbol}{data.value.toFixed(2)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg mb-4">Category Breakdown</h3>
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                {categoryData.map((category, index) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.count} receipt{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {currencySymbol}{category.value.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((category.value / total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryView;
