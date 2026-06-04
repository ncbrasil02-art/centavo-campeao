-- Políticas para o bucket de depoimentos (testimonials)
-- Permitir que usuários autenticados vejam os arquivos que eles enviaram
CREATE POLICY "Users can view their own testimonials" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'testimonials' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Permitir que administradores vejam todos os depoimentos
CREATE POLICY "Admins can view all testimonials" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'testimonials' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- Permitir que administradores deletem depoimentos se necessário
CREATE POLICY "Admins can delete testimonials" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'testimonials' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- Políticas para o bucket de reclamações/recibos (auction-claims)
-- Já existe uma política para INSERT (Winners can upload receipts)
-- Adicionando política para SELECT dos administradores (caso a existente falhe ou seja restritiva)
DROP POLICY IF EXISTS "Admins can view all claims" ON storage.objects;
CREATE POLICY "Admins can view all claims" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'auction-claims' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)));

-- Permitir que o usuário veja seu próprio recibo baseado no nome da pasta (que é o user_id)
CREATE POLICY "Users can view their own receipts folders" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'auction-claims' AND (storage.foldername(name))[1] = auth.uid()::text);
