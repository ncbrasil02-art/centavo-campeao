import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Teste de carregamento</h1>
        <p>Se você está vendo isso, o roteamento está funcionando.</p>
        <Link to="/auth" className="text-primary hover:underline">Ir para Login</Link>
      </div>
    </div>
  );
}
