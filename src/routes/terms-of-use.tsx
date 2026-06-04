import { createFileRoute } from "@tanstack/react-router";
import { useSettings } from "@/hooks/useSettings";

export const Route = createFileRoute("/terms-of-use")({
  component: TermsOfUse,
});

function TermsOfUse() {
  const { terms_of_use, site_name } = useSettings();

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-8">
          Termos de <span className="text-primary">Uso</span>
        </h1>
        <div className="bg-card border border-border rounded-3xl p-8 prose prose-invert max-w-none shadow-2xl backdrop-blur-xl">
          {terms_of_use ? (
            <div className="text-white whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: terms_of_use.replace(/\n/g, '<br />') }} />
          ) : (
            <p className="text-muted-foreground">Termos de uso em atualização para {site_name}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
