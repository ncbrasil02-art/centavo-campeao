import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Navbar } from "@/components/Navbar";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    console.log("Admin route beforeLoad, location:", location.href);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("No session found in admin route, redirecting to /auth");
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase.rpc("get_my_profile").maybeSingle() as any;

    console.log("User profile admin status:", profile?.is_admin, "User ID:", session.user.id);

    // Permit based on is_admin flag OR the known admin IDs
    const isAdmin = profile?.is_admin || 
                   session.user.id === 'cdf027bb-f239-4ba0-b8a9-7bf52341df4b' || 
                   session.user.id === 'ad8443eb-d096-46ad-ba39-07abdba01fdb';

    if (!isAdmin) {
      console.log("User is not an admin, redirecting to /");
      throw redirect({
        to: "/",
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
