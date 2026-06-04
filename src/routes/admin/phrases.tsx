import { createFileRoute } from "@tanstack/react-router";
import { NarrationSettings } from "@/components/admin/NarrationSettings";

export const Route = createFileRoute("/admin/phrases")({
  component: PhrasesPage,
});

function PhrasesPage() {
  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            Gerenciar <span className="text-primary">Narração e Destaques</span>
          </h1>
          <p className="text-white/40">Controle o que o site fala e a faixa de avisos no topo.</p>
        </div>
        
        <NarrationSettings />
      </div>
    </div>
  );
}