import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel administrativo — Centavo Campeão" },
      { name: "description", content: "Gerencie leilões, produtos e usuários do Centavo Campeão." },
      { property: "og:title", content: "Painel administrativo — Centavo Campeão" },
      { property: "og:description", content: "Gerencie leilões, produtos e usuários do Centavo Campeão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("check_is_admin");
    if (roleError) {
      throw new Error("Não foi possível confirmar sua permissão administrativa. Tente entrar novamente.");
    }

    if (!isAdmin) {
      throw redirect({
        to: "/",
        search: {},
      });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
