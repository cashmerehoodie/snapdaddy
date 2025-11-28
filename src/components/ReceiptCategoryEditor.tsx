import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  emoji: string;
}

interface ReceiptCategoryEditorProps {
  receiptId: string;
  currentCategory: string | null;
  userId: string;
  onUpdate?: () => void;
}

const ReceiptCategoryEditor = ({ 
  receiptId, 
  currentCategory, 
  userId,
  onUpdate 
}: ReceiptCategoryEditorProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, emoji")
        .eq("user_id", userId)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("receipts")
        .update({ category: selectedCategory })
        .eq("id", receiptId);

      if (error) throw error;

      toast.success("Category updated!");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-border">
      <Label htmlFor="category-select">Change Category</Label>
      <div className="flex gap-2">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger id="category-select" className="flex-1">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                <span className="flex items-center gap-2">
                  <span>{category.emoji}</span>
                  <span>{category.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleUpdateCategory} 
          disabled={loading || selectedCategory === currentCategory}
        >
          Update
        </Button>
      </div>
    </div>
  );
};

export default ReceiptCategoryEditor;
