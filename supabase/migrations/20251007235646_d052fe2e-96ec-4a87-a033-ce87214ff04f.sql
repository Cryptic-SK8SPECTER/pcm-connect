-- Create storage bucket for subatividade anexos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('subatividade-anexos', 'subatividade-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for subatividade-anexos bucket
DROP POLICY IF EXISTS "Users can upload their own subatividade files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view subatividade files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own subatividade files" ON storage.objects;

CREATE POLICY "Users can upload their own subatividade files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subatividade-anexos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view subatividade files"
ON storage.objects FOR SELECT
USING (bucket_id = 'subatividade-anexos');

CREATE POLICY "Users can delete their own subatividade files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'subatividade-anexos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);