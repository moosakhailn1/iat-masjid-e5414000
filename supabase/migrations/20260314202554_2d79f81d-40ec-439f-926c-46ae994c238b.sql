CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_subscriptions (user_id, plan, daily_limit) VALUES (NEW.id, 'free', 5);
  
  RETURN NEW;
END;
$function$;