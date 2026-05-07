-- Migration: Create storage bucket for post/story media
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/uzhahidkajpoefmrasqr/sql/new

-- Create the post-media bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('post-media', 'post-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow public read access  
CREATE POLICY "Public read access for post-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND owner = auth.uid());
