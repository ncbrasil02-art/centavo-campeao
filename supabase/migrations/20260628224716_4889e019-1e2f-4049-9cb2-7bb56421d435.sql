
CREATE TABLE public.support_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.support_faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.support_faqs TO authenticated;
GRANT ALL ON public.support_faqs TO service_role;

ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are readable by everyone"
  ON public.support_faqs FOR SELECT USING (true);

CREATE POLICY "Admins manage FAQs - insert"
  ON public.support_faqs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage FAQs - update"
  ON public.support_faqs FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins manage FAQs - delete"
  ON public.support_faqs FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE TRIGGER support_faqs_updated_at
  BEFORE UPDATE ON public.support_faqs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
