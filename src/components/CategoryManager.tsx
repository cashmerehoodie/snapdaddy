import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Tag, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string | null;
  is_default: boolean | null;
}

interface CategoryManagerProps {
  userId: string;
}

const EMOJI_SUGGESTIONS = ["🛒", "⛽", "🍔", "💡", "👕", "✈️", "🎬", "🏥", "📁", "🏠", "🚗", "🎮", "📱", "💊", "🎓"];

const CategoryManager = ({ userId }: CategoryManagerProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📁");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel('category-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
          is_default: false,
        });

      if (error) throw error;

      toast.success("Category created!");
      setNewCategoryName("");
      setNewCategoryEmoji("📁");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error?.message || "Failed to create category");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: newCategoryName.trim(),
          emoji: newCategoryEmoji,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      toast.success("Category updated!");
      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryEmoji("📁");
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating category:", error);
      toast.error(error?.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete "${categoryName}"? Receipts will be uncategorized.`)) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      toast.success("Category deleted");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryEmoji(category.emoji);
    setIsDialogOpen(true);
  };

  const resetDialog = () => {
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryEmoji("📁");
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto border-border/50 shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto border-border/50 shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" />
              Manage Categories
            </CardTitle>
            <CardDescription>Create and customize your expense categories</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetDialog();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetDialog}>
                <Plus className="w-4 h-4" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? "Update your category details" : "Add a new category for organizing your receipts"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Travel, Entertainment"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (editingCategory ? handleUpdateCategory() : handleCreateCategory())}
                  />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-4xl">{newCategoryEmoji}</div>
                    <div className="grid grid-cols-5 gap-2 flex-1">
                      {EMOJI_SUGGESTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewCategoryEmoji(emoji)}
                          className={`text-2xl p-2 rounded-lg border-2 transition-all hover:scale-110 ${
                            newCategoryEmoji === emoji 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Or type your own emoji in the field above
                  </p>
                  <Input
                    placeholder="Type any emoji..."
                    value={newCategoryEmoji}
                    onChange={(e) => setNewCategoryEmoji(e.target.value)}
                    className="mt-2"
                    maxLength={2}
                  />
                </div>
                <Button 
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  className="w-full"
                >
                  {editingCategory ? "Update Category" : "Create Category"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-3xl">{category.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{category.name}</p>
                  {category.is_default && (
                    <p className="text-xs text-muted-foreground">Default</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditDialog(category)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!category.is_default && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {categories.length === 0 && (
          <div className="text-center py-8">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No categories yet. Create your first one!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
