import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  console.error("Route Error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Something went wrong on our end."}
        </p>
        {error?.stack && (
          <pre className="mt-4 p-4 bg-black/50 text-red-400 text-xs overflow-auto text-left rounded-md border border-red-900/50 max-h-60">
            {error.stack}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ 
  queryClient: QueryClient;
  auth?: {
    session: any;
    profile: any;
  };
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lance Certo Premium" },
      { name: "description", content: "Lance Certo Premium is a modern cent auction platform for exciting product bidding." },
      { name: "author", content: "Lance Certo Premium" },
      { property: "og:title", content: "Lance Certo Premium" },
      { property: "og:description", content: "Lance Certo Premium is a modern cent auction platform for exciting product bidding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@LanceCerto" },
      { name: "twitter:title", content: "Lance Certo Premium" },
      { name: "twitter:description", content: "Lance Certo Premium is a modern cent auction platform for exciting product bidding." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rqE5I25elIdK1C06SOEoftOdMw42/social-images/social-1778583677031-WhatsApp_Image_2026-04-15_at_09.36.08.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/rqE5I25elIdK1C06SOEoftOdMw42/social-images/social-1778583677031-WhatsApp_Image_2026-04-15_at_09.36.08.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LanceCerto" />
        <HeadContent />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { SettingsProvider } from "@/hooks/useSettings";
import { Heartbeat } from "@/components/Heartbeat";
import { AuctionNarrator } from "@/components/AuctionNarrator";
import { FloatingControls } from "@/components/FloatingControls";
import { PromotionalMessages } from "@/components/PromotionalMessages";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Toaster } from "@/components/ui/sonner";


function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Heartbeat />
        <AuctionNarrator />
        <FloatingControls />
        <PromotionalMessages />
        <PWAInstallPrompt />
        <Outlet />

        <Toaster position="top-right" richColors />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
