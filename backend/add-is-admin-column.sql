-- Add is_admin column to users table if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Sync existing users from auth.users to public.users
INSERT INTO public.users (id, email, is_admin, created_at)
SELECT id, email, false, created_at FROM auth.users
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Create trigger function to sync new users from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, is_admin, created_at)
  VALUES (NEW.id, NEW.email, false, NEW.created_at)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registrations
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promote specific user to admin
UPDATE public.users SET is_admin = true WHERE id = '57b9be3c-9834-4a62-951a-6f8d16d3c92b';

-- Verify
SELECT id, email, is_admin, created_at FROM public.users WHERE id = '57b9be3c-9834-4a62-951a-6f8d16d3c92b';
