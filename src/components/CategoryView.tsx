import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Tag } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  count: number;
  emoji?: string;
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
      
      // Fetch categories with emojis
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("name, emoji")
        .eq("user_id", userId);
      
      const categoryEmojiMap = new Map(
        (categoriesData || []).map(cat => [cat.name, cat.emoji])
      );
      
      const { data, error } = await supabase
        .from("receipts")
        .select("amount, category")
        .eq("user_id", userId);

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { total: number; count: number; emoji?: string }>();

      (data || []).forEach((receipt) => {
        const category = receipt.category || "Uncategorized";
        const amount = Number(receipt.amount);
        const current = categoryMap.get(category) || { total: 0, count: 0 };
        categoryMap.set(category, {
          total: current.total + amount,
          count: current.count + 1,
          emoji: categoryEmojiMap.get(category) || "📁"
        });
      });

      const categories = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          name,
          value: data.total,
          count: data.count,
          emoji: data.emoji
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
      <Card className="max-w-6xl mx-auto border-border/50 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading expenses...</p>
        </CardContent>
      </Card>
    );
  }

  if (categoryData.length === 0) {
    return (
      <Card className="max-w-6xl mx-auto border-border/50 shadow-lg animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Expenses by Category
          </CardTitle>
          <CardDescription>No receipts found</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center mb-4">
            <Tag className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-center">
            Upload some receipts to see your expense breakdown by category
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalReceipts = categoryData.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Spending</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {currencySymbol}{total.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Receipts</p>
                <p className="text-3xl font-bold text-foreground">
                  {totalReceipts}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {categoryData.length} {categoryData.length === 1 ? 'category' : 'categories'}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="border-border/50 shadow-lg animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Expenses by Category
          </CardTitle>
          <CardDescription>
            View your spending breakdown across all categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:grid md:grid-cols-2 gap-8">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, emoji }) => {
                      const isMobile = window.innerWidth < 640;
                      const emojiStr = emoji || "📁";
                      return isMobile 
                        ? `${emojiStr} ${(percent * 100).toFixed(0)}%` 
                        : `${emojiStr} ${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={window.innerWidth < 640 ? 80 : 120}
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
                            <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                              <span className="text-xl">{data.emoji || "📁"}</span>
                              <span>{data.name}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {data.count} receipt{data.count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-lg font-bold text-primary mt-1">
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
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary hover:scale-[1.02] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl">{category.emoji || "📁"}</span>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base truncate">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.count} receipt{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-foreground text-base">
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
