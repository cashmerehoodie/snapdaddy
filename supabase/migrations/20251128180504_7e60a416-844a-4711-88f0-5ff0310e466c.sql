-- Create categories table for custom user categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📁',
  color TEXT DEFAULT 'hsl(270 70% 65%)',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-default categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id AND is_default = FALSE);

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, emoji, is_default) VALUES
    (NEW.id, 'Groceries', '🛒', TRUE),
    (NEW.id, 'Fuel', '⛽', TRUE),
    (NEW.id, 'Food', '🍔', TRUE),
    (NEW.id, 'Shopping', '🛍️', TRUE),
    (NEW.id, 'Transportation', '🚗', TRUE),
    (NEW.id, 'Bills', '💡', TRUE),
    (NEW.id, 'Entertainment', '🎬', TRUE),
    (NEW.id, 'Healthcare', '🏥', TRUE),
    (NEW.id, 'Other', '📁', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default categories for new users
CREATE TRIGGER create_default_categories_on_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_categories();