-- Fix create_default_categories to work with auth.users (use NEW.id)
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.categories (user_id, name, emoji, color, is_default)
  VALUES
    (NEW.id, 'Food & Dining', '🍔', '#FF6B6B', true),
    (NEW.id, 'Transportation', '🚗', '#4ECDC4', true),
    (NEW.id, 'Shopping', '🛍️', '#95E1D3', true),
    (NEW.id, 'Entertainment', '🎬', '#F38181', true),
    (NEW.id, 'Bills & Utilities', '💡', '#AA96DA', true),
    (NEW.id, 'Healthcare', '🏥', '#FCBAD3', true),
    (NEW.id, 'Other', '📝', '#A8E6CF', true);
  RETURN NEW;
END;
$function$;