-- Create a storage bucket for site assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for site-assets
CREATE POLICY "Public read site-assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'site-assets');

CREATE POLICY "Admin manage site-assets" 
ON storage.objects FOR ALL 
USING (
    bucket_id = 'site-assets' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
