-- Create upload_sessions table for QR code phone uploads
CREATE TABLE IF NOT EXISTS public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own upload sessions
CREATE POLICY "Users can view own upload sessions"
  ON public.upload_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own upload sessions
CREATE POLICY "Users can create own upload sessions"
  ON public.upload_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Anyone can update sessions (for phone uploads)
CREATE POLICY "Anyone can update upload sessions"
  ON public.upload_sessions
  FOR UPDATE
  USING (true);

-- Policy: Users can delete their own expired sessions
CREATE POLICY "Users can delete own upload sessions"
  ON public.upload_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_upload_sessions_session_id ON public.upload_sessions(session_id);
CREATE INDEX idx_upload_sessions_user_id ON public.upload_sessions(user_id);
CREATE INDEX idx_upload_sessions_expires_at ON public.upload_sessions(expires_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_sessions;