-- 1. Políticas para Products
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Políticas para Chat Messages (Admin)
CREATE POLICY "Admins can manage chat messages" 
ON public.chat_messages 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 3. Políticas para Robot Users (Admin)
CREATE POLICY "Admins can manage robot users" 
ON public.robot_users 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. Políticas para Robot Settings (Admin)
CREATE POLICY "Admins can manage robot settings" 
ON public.robot_settings 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Políticas para Winners (Admin)
CREATE POLICY "Admins can manage winners" 
ON public.winners 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 6. Garantir que banners e testimonials tenham políticas consistentes
-- (Já existem, mas reforçando se necessário ou apenas verificando no histórico)

-- 7. Adicionar política de visualização para Banners (se não existir completa)
-- Já verificado: "Public read banners" exists.

-- 8. Adicionar política para robot_settings (restringir leitura pública se necessário)
-- Atualmente está "viewable by everyone". Vou manter, mas garantir que o admin possa editar.
-- Já verificado: "Robot settings viewable by everyone" exists.
