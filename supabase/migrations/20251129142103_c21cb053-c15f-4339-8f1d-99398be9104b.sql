-- Update handle_new_user to generate unique usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username text;
  final_username text;
  counter integer := 0;
BEGIN
  -- Extract base username from email
  base_username := SPLIT_PART(NEW.email, '@', 1);
  final_username := base_username;

  -- Ensure username uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);

    -- Safety limit to avoid infinite loops
    IF counter > 10 THEN
      final_username := base_username || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, final_username);

  RETURN NEW;
END;
$function$;