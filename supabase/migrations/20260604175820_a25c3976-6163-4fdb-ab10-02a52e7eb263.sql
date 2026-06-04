-- Policy for auction-claims
CREATE POLICY "Winners can upload receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'auction-claims');

CREATE POLICY "Winners can view their own receipts" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'auction-claims' AND owner = auth.uid());

CREATE POLICY "Admins can view all claims" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'auction-claims' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- Policy for testimonials
CREATE POLICY "Winners can upload testimonials" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'testimonials');

CREATE POLICY "Everyone can view testimonials" ON storage.objects
FOR SELECT TO PUBLIC
USING (bucket_id = 'testimonials');
